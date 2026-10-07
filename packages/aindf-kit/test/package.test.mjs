// npm readiness: the package is ready to publish but stays private until the v2 release.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('..', import.meta.url));
const pkg = JSON.parse(readFileSync(`${dir}package.json`, 'utf8'));
const server = JSON.parse(readFileSync(`${dir}server.json`, 'utf8'));

test('the package stays private until the v2 release', () => {
  assert.equal(pkg.private, true);
  // the npm organization; the MCP Registry name is a separate namespace
  assert.equal(pkg.name, '@ai-native-design-framework/kit');
});

test('npm pack ships the runtime, schemas, skill and docs — no tests, scripts or pilot provenance', () => {
  const [packed] = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json'], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
  // the whole archive, file by file: exactly the root files plus everything under src/, schema/ and skill/ in the repo
  // npm never packs .DS_Store, so a local one must not count either
  const walk = d => readdirSync(d, { withFileTypes: true }).filter(e => e.name !== '.DS_Store').flatMap(e => e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]);
  const expected = [...['LICENSE', 'README.md', 'RULES.md', 'package.json', 'server.json'], ...['src', 'schema', 'skill'].flatMap(d => walk(join(dir, d)).map(f => relative(dir, f)))].sort();
  assert.deepEqual(packed.files.map(f => f.path).sort(), expected);
  assert.ok(expected.includes('src/cli.mjs'), 'the bin is shipped');
});

test('LICENSE in the package is the repository LICENSE', () => {
  assert.equal(readFileSync(`${dir}LICENSE`, 'utf8'), readFileSync(`${dir}../../LICENSE`, 'utf8'));
});

test('MCP Registry: server.json names this package, its version and mcpName; the run is `aindf mcp <bundle>` over stdio', () => {
  assert.equal(server.name, pkg.mcpName);
  assert.equal(server.name, 'design.oleg/aindf');
  const ci = readFileSync(`${dir}../../.github/workflows/kit.yml`, 'utf8');
  const pinned = /SCHEMA_URL: (\S+)/.exec(ci)?.[1];
  assert.ok(pinned, 'kit.yml pins SCHEMA_URL');
  assert.equal(server.$schema, pinned, 'server.json names the schema CI validates against');
  assert.deepEqual(server.repository, { url: 'https://github.com/0design/ai-native-design-framework', source: 'github', subfolder: 'packages/aindf-kit' });
  assert.equal(server.version, pkg.version);
  const [p] = server.packages;
  assert.deepEqual([p.registryType, p.identifier, p.version, p.transport.type], ['npm', pkg.name, pkg.version, 'stdio']);
  assert.deepEqual(p.packageArguments.map(a => a.value ?? `<${a.valueHint}>`), ['mcp', '<bundle_path>']);
  assert.deepEqual(Object.keys(pkg.bin), ['aindf'], 'npx @ai-native-design-framework/kit runs the only bin');
  assert.deepEqual(pkg.publishConfig, { access: 'public', provenance: true });
});
