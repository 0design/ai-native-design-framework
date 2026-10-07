#!/usr/bin/env node
// The three working examples of the AINDF demo design system, run the way an agent would: through `aindf mcp` over
// stdio against the committed bundle. First checks that the committed bundle is exactly what `aindf bundle` builds
// from these sources (`--write` rebuilds it). Exits 1 on any mismatch and names the example that failed.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { loadDs, createBundle } from '../../packages/aindf-kit/src/index.mjs';
import { canonicalJson, sha256 } from '../../packages/aindf-kit/src/util.mjs';

// fileURLToPath, not URL.pathname: a path with a space ("Application Support") would come out as %20
const here = fileURLToPath(new URL('.', import.meta.url));
const cli = fileURLToPath(new URL('../../packages/aindf-kit/src/cli.mjs', import.meta.url));
const bundlePath = join(here, 'aindf-demo.bundle.json');
const built = createBundle(loadDs(join(here, 'aindf.config.json')));
// first path where two JSON values differ, for a short failure message
const firstDiff = (a, b, path = '$') => {
  if (JSON.stringify(a) === JSON.stringify(b)) return null;
  if (a && b && typeof a === 'object' && typeof b === 'object' && Array.isArray(a) === Array.isArray(b)) {
    for (const k of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) { const d = firstDiff(a[k], b[k], Array.isArray(a) ? `${path}[${k}]` : `${path}.${k}`); if (d) return d; }
  }
  return path;
};
if (process.argv.includes('--write')) { writeFileSync(bundlePath, JSON.stringify(built, null, 2) + '\n'); console.log(`wrote ${built.bundleSha256}`); process.exit(0); }

let current = 'bundle';
try {
  const committed = JSON.parse(readFileSync(bundlePath, 'utf8'));
  // the whole document, not only its hash field: a hand-edited bundle with the old hash must fail here too
  if (canonicalJson(committed) !== canonicalJson(built)) throw new Error(`the committed bundle (content sha256 ${sha256(committed)}) is not what these sources build (${sha256(built)}); first difference at ${firstDiff(committed, built)}. Run \`node examples/demo-ds/examples.mjs --write\``);

  // one stdio session per example, as a fresh agent would open it
  const session = requests => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, 'mcp', bundlePath]);
    let out = '', err = ''; child.stdout.on('data', d => { out += d; }); child.stderr.on('data', d => { err += d; }); child.on('error', reject);
    child.on('close', code => {
      const lines = out.trim().split('\n').filter(Boolean);
      if (code !== 0 || lines.length !== requests.length) return reject(new Error(`aindf mcp exited ${code} with ${lines.length}/${requests.length} replies: ${err.trim().split('\n').pop() ?? ''}`));
      try { resolve(Object.fromEntries(lines.map(l => JSON.parse(l)).map(r => [r.id, r]))); } catch (e) { reject(e); }
    });
    child.stdin.end(requests.map((r, i) => JSON.stringify({ jsonrpc: '2.0', id: i + 1, ...r })).join('\n') + '\n');
  });
  const call = (name, args = {}) => ({ method: 'tools/call', params: { name, arguments: args } });
  const data = r => r.result.structuredContent;
  const pin = { id: built.ds.id, version: built.ds.version, bundleSha256: built.bundleSha256 };
  const screen = sections => ({ kind: 'aindf.screen', aindfVersion: '0.2', ds: pin, route: '/start', template: { component: 'Page', props: { title: 'Start' } }, sections });

  // 1. "Build a start page from this design system: a hero with a sign-up button, three benefits and a contact form."
  current = 'example 1: compose a screen';
  const one = await session([call('get-ds'), call('validate-screen', { screen: screen([
    { component: 'Hero', props: { tone: 'bold' }, slots: { title: [{ component: 'Heading', props: { text: 'Build screens from your design system' } }], actions: [{ component: 'Button', props: { label: 'Sign up', action: 'signup' } }] } },
    { component: 'FeatureList', props: { title: 'Why teams use it', items: ['One source of truth', 'Checked before it ships', 'New needs become proposals'] } },
    { component: 'ContactForm', props: { submitLabel: 'Send', action: 'sendContact' }, slots: { fields: [{ component: 'Field', props: { label: 'Email', kind: 'email' } }, { component: 'Field', props: { label: 'Message', kind: 'message' } }] } },
  ]) })]);
  assert.deepEqual(data(one[1]).pin, pin);
  assert.equal(data(one[2]).ok, true, JSON.stringify(data(one[2]).errors));

  // 2. "Make the headline violet and bigger." — the DS has no such option: refused with a code, never hand-styled
  current = 'example 2: a request the design system cannot do';
  const two = await session([call('validate-screen', { screen: screen([
    { component: 'Hero', props: {}, slots: { title: [{ component: 'Heading', props: { text: 'Pricing', color: 'violet', size: 'xl' } }] } },
  ]) }), call('get-component', { name: 'Heading' }), call('request-extension', { need: 'a violet, larger headline' })]);
  assert.equal(data(two[1]).ok, false);
  assert.deepEqual(data(two[1]).errors.map(e => `${e.code} ${e.path}`), ['UNKNOWN_PROP $.sections[0].slots.title[0].props.color', 'UNKNOWN_PROP $.sections[0].slots.title[0].props.size']);
  assert.deepEqual(Object.keys(data(two[2]).contract.props), ['text'], 'Heading offers text only');
  assert.equal(two[3].result.isError, true); assert.equal(data(two[3]).code, 'READ_ONLY'); // a local server records nothing

  // 3. "What can I use for a contact form?"
  current = 'example 3: discover what the design system offers';
  const three = await session([call('list-by-facet', { role: 'form' }), call('slot-accepts', { component: 'ContactForm', slot: 'fields' }), call('get-component', { name: 'Field' })]);
  assert.deepEqual(data(three[1]).map(c => c.name).sort(), ['ContactForm', 'Field']);
  assert.deepEqual(data(three[2]).accepts.components, ['Field']);
  assert.deepEqual(data(three[3]).contract.props.kind.values, ['text', 'email', 'message']);

  console.log(JSON.stringify({ result: 'PASS', ds: `${built.ds.id}@${built.ds.version}`, bundleSha256: built.bundleSha256, examples: 3 }));
} catch (error) {
  console.error(`demo examples: FAIL at «${current}»: ${error.message}`);
  process.exitCode = 1;
}
