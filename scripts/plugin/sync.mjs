#!/usr/bin/env node
// Builds the plugin's copies from this repository, or (--check) proves they are unchanged copies.
//   server/kit/  <- packages/aindf-kit (src, schema, package.json, RULES.md) + LICENSE
//   skills/aindf-screen-author/SKILL.md <- packages/aindf-kit/skill/SKILL.md
//   demo/aindf-demo.bundle.json <- examples/demo-ds/aindf-demo.bundle.json
//   .claude-plugin/icon.png <- brand-assets/favicon/aindf-favicon-1024.png
// and one copy outside plugin/, at the conventional path where the skills CLI and skills.sh look for a skill:
//   <repo>/skills/aindf-screen-author/SKILL.md <- packages/aindf-kit/skill/SKILL.md
// The plugin never edits these copies: change the source, then run this script. --check exits 1 on any difference
// and on any copy whose bytes no longer match plugin/COPIES.SHA256SUMS.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join, dirname, relative } from 'node:path';

const plugin = fileURLToPath(new URL('../../plugin/', import.meta.url));
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
  [join(repo, 'brand-assets/favicon/aindf-favicon-1024.png'), join(plugin, '.claude-plugin/icon.png')],
];
// copies outside plugin/: checked like the others, not listed in plugin/COPIES.SHA256SUMS
const repoCopies = [
  [join(kit, 'skill/SKILL.md'), join(repo, 'skills/aindf-screen-author/SKILL.md')],
];
const sha = b => createHash('sha256').update(b).digest('hex');
const sums = copies.map(([, to]) => `${sha(readFileSync(existsSync(to) ? to : '/dev/null'))}  ${relative(plugin, to)}`);
const sumsPath = join(plugin, 'COPIES.SHA256SUMS');

if (process.argv.includes('--check')) {
  const problems = [];
  for (const [from, to] of copies) {
    if (!existsSync(to)) problems.push(`missing ${relative(plugin, to)}`);
    else if (!readFileSync(from).equals(readFileSync(to))) problems.push(`differs from source: ${relative(plugin, to)} (run node scripts/plugin/sync.mjs)`);
  }
  for (const [from, to] of repoCopies) {
    if (!existsSync(to)) problems.push(`missing ${relative(repo, to)}`);
    else if (!readFileSync(from).equals(readFileSync(to))) problems.push(`differs from source: ${relative(repo, to)} (run node scripts/plugin/sync.mjs)`);
  }
  // every file in plugin/ is either a copy or one of the plugin's own files; anything else is refused
  const own = ['.claude-plugin/plugin.json', '.mcp.json', 'README.md', 'COPIES.SHA256SUMS', 'server/launch.mjs', 'server/launch.sh'].map(f => join(plugin, f));
  const extra = walk(plugin).filter(f => !copies.some(([, to]) => to === f) && !own.includes(f)).map(f => `not allowed in plugin/: ${relative(plugin, f)}`);
  problems.push(...extra);
  if (!existsSync(sumsPath) || readFileSync(sumsPath, 'utf8') !== sums.join('\n') + '\n') problems.push('COPIES.SHA256SUMS is stale');
  if (problems.length) { console.error(`plugin copies: FAIL\n${problems.join('\n')}`); process.exit(1); }
  console.log(`plugin copies: PASS (${copies.length} files, plus ${repoCopies.length} outside plugin/)`);
} else {
  rmSync(join(plugin, 'server/kit'), { recursive: true, force: true });
  for (const [from, to] of [...copies, ...repoCopies]) { mkdirSync(dirname(to), { recursive: true }); writeFileSync(to, readFileSync(from)); }
  writeFileSync(sumsPath, copies.map(([, to]) => `${sha(readFileSync(to))}  ${relative(plugin, to)}`).join('\n') + '\n');
  console.log(`plugin copies: wrote ${copies.length} files, plus ${repoCopies.length} outside plugin/`);
}
