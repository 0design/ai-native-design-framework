import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { violations } from '../public-text-check.mjs';

const script = fileURLToPath(new URL('../public-text-check.mjs', import.meta.url));
const bad = ['квіз ' + '3', 'Quiz ' + '#3', 'plan ' + 'steps', 'review ' + 'rounds', "don't " + 'merge', 'the owner ' + 'decided', 'owner ' + 'sign-off', 'Ask ' + 'Oleg', 'owner ' + 'decision 07.10', "needs the owner" + "'s OK", 'Рішення ' + 'Олега', 'see 0D' + '-500', 'https://linear' + '.app/x', 'plugin ' + 'plan step 5', 'REP' + 'ORT', 'DELIVERY' + '-02', 'the orchestr' + 'ator', 'do not ' + 'merge', 'Draft for the owner' + ' review'];

test('each internal-process phrase is refused with its line', () => {
  for (const b of bad) assert.equal(violations(`ok line\n${b}\n`)[0]?.line, 2, b);
});

test('legitimate text passes: the author, the brand, the license line, a yaml owner key, the DS owner role', () => {
  const ok = 'DS owner approved the tokens\nOleg.Design (https://oleg.design) design.oleg/aindf\nCopyright (c) 2026 Oleg Kukharuk\nowner: team-a\nAsk the DS owner for a missing capability.\n';
  assert.deepEqual(violations(ok), []);
});

function repo() {
  const d = mkdtempSync(join(tmpdir(), 'ptc-'));
  const g = (...a) => execFileSync('git', a, { cwd: d, encoding: 'utf8' });
  g('init', '-q', '-b', 'main'); g('config', 'user.email', 't@t'); g('config', 'user.name', 't');
  writeFileSync(join(d, 'a.md'), 'fine\n'); g('add', '.'); g('commit', '-qm', 'base');
  return { d, g, run: (env, ...args) => spawnSync(process.execPath, [script, ...args], { cwd: d, encoding: 'utf8', env: { ...process.env, GITHUB_EVENT_PATH: '', ...env } }) };
}

test('PR mode: a clean PR passes', () => {
  const { d, g, run } = repo();
  g('checkout', '-qb', 'b'); writeFileSync(join(d, 'a.md'), 'fine\nmore\n'); g('commit', '-qam', 'Reword the intro');
  const r = run({ PR_TITLE: 'Reword the intro', PR_BODY: 'Docs only.' }, '--pr', 'main', 'b');
  assert.equal(r.status, 0, r.stderr);
});

test('PR mode: an internal phrase in the title, the description, a commit or an added line fails with its location', () => {
  const { d, g, run } = repo();
  g('checkout', '-qb', 'b'); mkdirSync(join(d, 'src')); writeFileSync(join(d, 'src/x.mjs'), 'a\n// ' + 'owner ' + 'decision 07.10\n'); g('add', '.'); g('commit', '-qm', 'Add x\n\nplan ' + 'step 4');
  const r = run({ PR_TITLE: 'fix 0D' + '-12', PR_BODY: 'line\nneeds the owner' + "'s OK" }, '--pr', 'main', 'b');
  assert.equal(r.status, 1);
  for (const w of ['PR title', 'PR description:2', 'src/x.mjs:2', 'commit ']) assert.match(r.stderr, new RegExp(w), w);
});

test('tree mode: a tracked file with a phrase fails; a clean tree passes', () => {
  const { d, g, run } = repo();
  assert.equal(run({}, '--tree').status, 0);
  writeFileSync(join(d, 'n.md'), 'x\nowner ' + 'approved\n'); g('add', '.');
  const r = run({}, '--tree'); assert.equal(r.status, 1); assert.match(r.stderr, /n\.md:2/);
});

const channel = (what, where, env, extra = () => {}) => test(`PR mode: the phrase is caught in ${what} alone`, () => {
  const { d, g, run } = repo();
  g('checkout', '-qb', 'b'); writeFileSync(join(d, 'a.md'), 'fine\nmore\n'); g('commit', '-qam', 'Reword the intro'); extra(d, g);
  const r = run(env, '--pr', 'main', 'b');
  assert.equal(r.status, 1, r.stderr); assert.match(r.stderr, where);
});
const phrase = 'owner ' + 'decision 07.10';
channel('the title', /PR title/, { PR_TITLE: phrase, PR_BODY: 'Docs only.' });
channel('the description', /PR description:2/, { PR_TITLE: 'Reword', PR_BODY: `Docs only.\n${phrase}` });
channel('a commit message', /commit [0-9a-f]{8}:3/, { PR_TITLE: 'Reword', PR_BODY: 'Docs only.' }, (d, g) => { writeFileSync(join(d, 'a.md'), 'fine\nmore\nx\n'); g('commit', '-qam', `Add x\n\n${phrase}`); });
channel('an added line', /a\.md:3/, { PR_TITLE: 'Reword', PR_BODY: 'Docs only.' }, (d, g) => { writeFileSync(join(d, 'a.md'), `fine\nmore\n// ${phrase}\n`); g('commit', '-qam', 'Add x'); });

test('PR mode: title and description come from the event file, as in CI', () => {
  const { d, g, run } = repo();
  g('checkout', '-qb', 'b'); writeFileSync(join(d, 'a.md'), 'fine\nmore\n'); g('commit', '-qam', 'Reword');
  const ev = join(d, '..', `ev-${Date.now()}.json`);
  writeFileSync(ev, JSON.stringify({ pull_request: { title: phrase, body: null } }));
  const r = run({ GITHUB_EVENT_PATH: ev }, '--pr', 'main', 'b');
  assert.equal(r.status, 1); assert.match(r.stderr, /PR title/);
  writeFileSync(ev, JSON.stringify({ pull_request: { title: 'Reword', body: 'Docs only.' } }));
  assert.equal(run({ GITHUB_EVENT_PATH: ev }, '--pr', 'main', 'b').status, 0);
});

test('a line that starts with "++ " is still scanned, line numbers survive an allowed owner key, look-alikes are folded', () => {
  assert.equal(violations('ok\n\nowner: team-a\n' + 'owner ' + 'decided\n')[0].line, 4);
  assert.equal(violations('owner\u200b ' + 'decided the tokens').length, 1);
  assert.equal(violations('ask ' + 'oleg about it').length, 1);
  assert.deepEqual(violations('see https://oleg.design and design.oleg/aindf'), []);
  const { d, g, run } = repo();
  g('checkout', '-qb', 'b'); writeFileSync(join(d, 'a.md'), 'fine\n++ ' + 'owner ' + 'decided the tokens\n'); g('commit', '-qam', 'Add a line');
  const r = run({ PR_TITLE: 'Add', PR_BODY: 'Docs.' }, '--pr', 'main', 'b');
  assert.equal(r.status, 1, r.stderr); assert.match(r.stderr, /a\.md:2/);
});

test('quiz with a numero sign or "No", and Cyrillic names in any case, are caught', () => {
  for (const b of ['Квіз ' + '№3', 'Квіз ' + 'No 3', 'quiz ' + 'no. 4', 'олег', 'ОЛЕГ', 'рішення ' + 'олега']) assert.equal(violations(b).length > 0, true, b);
  assert.deepEqual(violations('quiz notes 3'), []);
});

test('the script runs from a path with a space', () => {
  const d = mkdtempSync(join(tmpdir(), 'ptc sp '));
  const copy = join(d, 'check.mjs'); writeFileSync(copy, readFileSync(script));
  execFileSync('git', ['init', '-q', d]);
  const r = spawnSync(process.execPath, [copy, '--tree'], { cwd: d, encoding: 'utf8' });
  assert.match(r.stdout, /PASS/);
});
