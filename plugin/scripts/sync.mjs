#!/usr/bin/env node
// Builds the plugin's copies from this repository, or (--check) proves they are unchanged copies.
//   server/kit/  <- packages/aindf-kit (src, schema, package.json, RULES.md) + LICENSE
//   skills/aindf-screen-author/SKILL.md <- packages/aindf-kit/skill/SKILL.md
//   demo/aindf-demo.bundle.json <- examples/demo-ds/aindf-demo.bundle.json
// The plugin never edits these copies: change the source, then run this script. --check exits 1 on any difference
// and on any copy whose bytes no longer match plugin/COPIES.SHA256SUMS.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join, dirname, relative } from 'node:path';

const plugin = fileURLToPath(new URL('..', import.meta.url));
const repo = join(plugin, '..');
const kit = join(repo, 'packages/aindf-kit');
const walk = dir => readdirSync(dir).flatMap(n => { const p = join(dir, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const copies = [
  ...['src', 'schema'].flatMap(d => walk(join(kit, d)).map(f => [f, join(plugin, 'server/kit', relative(kit, f))])),
  ...['package.json', 'RULES.md'].map(f => [join(kit, f), join(plugin, 'server/kit', f)]),
  [join(repo, 'LICENSE'), join(plugin, 'server/kit/LICENSE')],
  [join(repo, 'LICENSE'), join(plugin, 'LICENSE')],
  [join(kit, 'skill/SKILL.md'), join(plugin, 'skills/aindf-screen-author/SKILL.md')],
  [join(repo, 'examples/demo-ds/aindf-demo.bundle.json'), join(plugin, 'demo/aindf-demo.bundle.json')],
];
const sha = b => createHash('sha256').update(b).digest('hex');
const sums = copies.map(([, to]) => `${sha(readFileSync(existsSync(to) ? to : '/dev/null'))}  ${relative(plugin, to)}`);
const sumsPath = join(plugin, 'COPIES.SHA256SUMS');

if (process.argv.includes('--check')) {
  const problems = [];
  for (const [from, to] of copies) {
    if (!existsSync(to)) problems.push(`missing ${relative(plugin, to)}`);
    else if (!readFileSync(from).equals(readFileSync(to))) problems.push(`differs from source: ${relative(plugin, to)} (run node plugin/scripts/sync.mjs)`);
  }
  const extra = walk(join(plugin, 'server/kit')).filter(f => !copies.some(([, to]) => to === f)).map(f => `not a copy: ${relative(plugin, f)}`);
  problems.push(...extra);
  if (!existsSync(sumsPath) || readFileSync(sumsPath, 'utf8') !== sums.join('\n') + '\n') problems.push('COPIES.SHA256SUMS is stale');
  if (problems.length) { console.error(`plugin copies: FAIL\n${problems.join('\n')}`); process.exit(1); }
  console.log(`plugin copies: PASS (${copies.length} files)`);
} else {
  rmSync(join(plugin, 'server/kit'), { recursive: true, force: true });
  for (const [from, to] of copies) { mkdirSync(dirname(to), { recursive: true }); writeFileSync(to, readFileSync(from)); }
  writeFileSync(sumsPath, copies.map(([, to]) => `${sha(readFileSync(to))}  ${relative(plugin, to)}`).join('\n') + '\n');
  console.log(`plugin copies: wrote ${copies.length} files`);
}
