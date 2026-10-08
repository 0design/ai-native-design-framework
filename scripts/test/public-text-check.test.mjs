import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { violations } from '../public-text-check.mjs';

const script = fileURLToPath(new URL('../public-text-check.mjs', import.meta.url));
const bad = ['owner ' + 'decision 07.10', "needs the owner" + "'s OK", 'Рішення ' + 'Олега', 'see 0D' + '-500', 'https://linear' + '.app/x', 'plugin ' + 'plan step 5', 'REP' + 'ORT', 'DELIVERY' + '-02', 'the orchestr' + 'ator', 'do not ' + 'merge', 'Draft for the owner' + ' review'];

test('each internal-process phrase is refused with its line', () => {
  for (const b of bad) assert.equal(violations(`ok line\n${b}\n`)[0]?.line, 2, b);
});

test('legitimate text passes: the author, the brand, the license line, a yaml owner key, the DS owner role', () => {
  const ok = 'Oleg.Design (https://oleg.design) design.oleg/aindf\nCopyright (c) 2026 Oleg Kukharuk\nowner: team-a\nAsk the DS owner for a missing capability.\n';
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
