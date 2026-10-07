// npm readiness (plugin plan step 4): the package is ready to publish but stays private until the v2 release.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('..', import.meta.url));
const pkg = JSON.parse(readFileSync(`${dir}package.json`, 'utf8'));
const server = JSON.parse(readFileSync(`${dir}server.json`, 'utf8'));

test('the package stays private until the v2 release (owner decision 07.10)', () => {
  assert.equal(pkg.private, true);
});

test('npm pack ships the runtime, schemas, skill and docs — no tests, scripts or pilot provenance', () => {
  const [packed] = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json'], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
  const top = [...new Set(packed.files.map(f => f.path.split('/')[0]))].sort();
  assert.deepEqual(top, ['LICENSE', 'README.md', 'RULES.md', 'package.json', 'schema', 'server.json', 'skill', 'src']);
  assert.ok(packed.files.some(f => f.path === 'src/cli.mjs'), 'the bin is shipped');
});

test('LICENSE in the package is the repository LICENSE', () => {
  assert.equal(readFileSync(`${dir}LICENSE`, 'utf8'), readFileSync(`${dir}../../LICENSE`, 'utf8'));
});

test('MCP Registry: server.json names this package, its version and mcpName; the run is `aindf mcp <bundle>` over stdio', () => {
  assert.equal(server.name, pkg.mcpName);
  assert.equal(server.name, 'design.oleg/aindf');
  assert.equal(server.version, pkg.version);
  const [p] = server.packages;
  assert.deepEqual([p.registryType, p.identifier, p.version, p.transport.type], ['npm', pkg.name, pkg.version, 'stdio']);
  assert.deepEqual(p.packageArguments.map(a => a.value ?? `<${a.valueHint}>`), ['mcp', '<bundle_path>']);
  assert.deepEqual(Object.keys(pkg.bin), ['aindf'], 'npx @aindf/kit runs the only bin');
  assert.deepEqual(pkg.publishConfig, { access: 'public', provenance: true });
});
