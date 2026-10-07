#!/usr/bin/env node
// Checks the plugin as Claude Code would start it: the manifest, the MCP entry (one file, no shell, no npm), the
// copies (sync --check), and the server itself over stdio with each kind of `bundlePath`. Exits 1 and names the step.
import { readFileSync } from 'node:fs';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const plugin = fileURLToPath(new URL('..', import.meta.url));
const repo = join(plugin, '..');
const json = p => JSON.parse(readFileSync(join(plugin, p), 'utf8'));
let step = 'copies';
const run = (arg, requests) => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [join(plugin, 'server/launch.mjs'), arg], { cwd: repo });
  let out = '', err = '';
  child.stdout.on('data', d => { out += d; }); child.stderr.on('data', d => { err += d; }); child.on('error', reject);
  child.on('close', code => resolve({ code, err, replies: Object.fromEntries(out.trim().split('\n').filter(Boolean).map(l => JSON.parse(l)).map(r => [r.id, r])) }));
  child.stdin.end(requests.map((r, i) => JSON.stringify({ jsonrpc: '2.0', id: i + 1, ...r })).join('\n') + '\n');
});
const session = [{ method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'plugin-check', version: '0' } } }, { method: 'tools/list' }, { method: 'tools/call', params: { name: 'get-ds', arguments: {} } }];

try {
  execFileSync(process.execPath, [join(plugin, 'scripts/sync.mjs'), '--check'], { stdio: 'inherit' });

  step = 'manifest';
  const manifest = json('.claude-plugin/plugin.json');
  assert.equal(manifest.name, 'aindf');
  assert.equal(manifest.version, json('server/kit/package.json').version, 'plugin version = kit version');
  assert.equal(manifest.license, 'MIT');
  assert.equal(manifest.userConfig.bundlePath.sensitive, undefined, 'a bundle path is not a secret');
  assert.match(readFileSync(join(plugin, 'skills/aindf-screen-author/SKILL.md'), 'utf8'), /^---\nname: aindf-screen-author\n/);

  step = 'mcp entry';
  const server = json('.mcp.json').mcpServers.aindf;
  assert.equal(server.command, 'node');
  assert.deepEqual(server.args, ['${CLAUDE_PLUGIN_ROOT}/server/launch.mjs', '${user_config.bundlePath}']);

  const demo = json('demo/aindf-demo.bundle.json');
  for (const [name, arg] of [['empty bundlePath → demo', ''], ['unexpanded bundlePath → demo', '${user_config.bundlePath}']]) {
    step = name;
    const r = await run(arg, session);
    assert.equal(r.code, 0, r.err);
    assert.match(r.err, /from the demo bundle, read-only/);
    const tools = r.replies[2].result.tools;
    assert.equal(tools.length, 7);
    assert.ok(tools.every(t => t.annotations.readOnlyHint === true && t.title), 'read-only, titled tools');
    assert.equal(r.replies[3].result.structuredContent.pin.bundleSha256, demo.bundleSha256);
  }

  step = 'explicit relative bundlePath';
  const own = await run('examples/demo-ds/aindf-demo.bundle.json', session);
  assert.equal(own.code, 0, own.err);
  assert.match(own.err, /examples\/demo-ds\/aindf-demo\.bundle\.json, read-only/);

  step = 'other placeholder';
  const placeholder = await run('${user_config.somethingElse}', []);
  assert.equal(placeholder.code, 1);
  assert.match(placeholder.err, /unexpanded placeholder/);

  step = 'read-only instructions';
  const ro = (await run('', session)).replies[1].result.instructions;
  assert.doesNotMatch(ro, /request-extension|submit-screen/, 'a read-only server does not point to staging tools');

  step = 'missing bundle';
  const missing = await run('does/not/exist.bundle.json', []);
  assert.equal(missing.code, 1);
  assert.match(missing.err, /^aindf: cannot serve .*does\/not\/exist\.bundle\.json: ENOENT/);

  console.log(JSON.stringify({ result: 'PASS', plugin: manifest.version, demoBundleSha256: demo.bundleSha256 }));
} catch (error) {
  console.error(`plugin check: FAIL at «${step}»: ${error.message}`);
  process.exitCode = 1;
}
