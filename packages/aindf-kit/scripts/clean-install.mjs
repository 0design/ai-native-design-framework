#!/usr/bin/env node
// Clean install: pack this kit, install the tarball into an empty project (no repo, no node_modules around it) and use it
// only through what a consumer gets — the `aindf` bin, the package exports and the MCP over stdio. Every step has a
// positive and a negative; a failure exits 1. Prints the exact tarball (name, sha256) and kit version it checked.
import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, cpSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const kitDir = new URL('..', import.meta.url).pathname;
const fixture = join(kitDir, 'test/fixtures/tiny-ds');
const source = JSON.parse(readFileSync(join(kitDir, 'package.json'), 'utf8'));
const work = mkdtempSync(join(tmpdir(), 'aindf-clean-install-'));
const project = join(work, 'project');
const steps = [];
const step = (name, fn) => { fn(); steps.push(name); console.log(`ok ${name}`); };
const run = (args, opts = {}) => {
  try { return { code: 0, out: execFileSync(join(project, 'node_modules/.bin/aindf'), args, { cwd: project, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts }) }; }
  catch (e) { return { code: e.status, out: `${e.stdout ?? ''}${e.stderr ?? ''}` }; }
};
const json = (path, value) => writeFileSync(path, JSON.stringify(value, null, 2) + '\n');

try {
  // 1. Pack and install into an empty project, outside the repository
  const [packed] = JSON.parse(execFileSync('npm', ['pack', '--json', '--pack-destination', work], { cwd: kitDir, encoding: 'utf8' }));
  const tarball = join(work, packed.filename);
  const tarSha256 = createHash('sha256').update(readFileSync(tarball)).digest('hex');
  cpSync(fixture, join(project, 'ds'), { recursive: true });
  json(join(project, 'package.json'), { name: 'consumer', private: true, type: 'module' });
  execFileSync('npm', ['install', tarball, '--ignore-scripts', '--no-audit', '--no-fund', '--prefer-offline'], { cwd: project, stdio: 'ignore' });
  const installed = JSON.parse(readFileSync(join(project, 'node_modules/@aindf/kit/package.json'), 'utf8'));
  step('install: the tarball installs with no dependencies and is the source version', () => {
    assert.equal(installed.version, source.version);
    assert.ok(!existsSync(join(project, 'node_modules/@aindf/kit/node_modules')));
  });

  // 2. check: the fixture passes; a DS with an unknown binding fails with its code and exit 1
  step('check: PASS on a conforming DS, FAIL with a code on a broken one', () => {
    const ok = run(['check', 'ds/aindf.config.json']);
    assert.equal(ok.code, 0, ok.out); assert.match(ok.out, /aindf check: PASS/);
    cpSync(join(project, 'ds'), join(project, 'bad'), { recursive: true });
    const cs = JSON.parse(readFileSync(join(project, 'bad/components.json'), 'utf8'));
    cs.components.find(c => c.name === 'Cta').props.action.bindings = ['nope'];
    json(join(project, 'bad/components.json'), cs);
    const bad = run(['check', 'bad/aindf.config.json']);
    assert.equal(bad.code, 1, bad.out); assert.match(bad.out, /UNKNOWN_BINDING/);
  });

  // 3. bundle + build: a pinned screen builds a page importing only the DS module; --check catches drift; a bad screen fails
  let bundle;
  step('bundle/build: a pinned screen builds; --check passes, then fails on a hand edit; an unknown component is refused', () => {
    const b = run(['bundle', 'ds/aindf.config.json', '--out', 'bundle.json']);
    assert.equal(b.code, 0, b.out);
    bundle = JSON.parse(readFileSync(join(project, 'bundle.json'), 'utf8'));
    const pin = { id: bundle.ds.id, version: bundle.ds.version, bundleSha256: bundle.bundleSha256 };
    const screen = { kind: 'aindf.screen', aindfVersion: '0.2', ds: pin, route: '/start', template: { component: 'Page', props: { title: 'Start' } },
      sections: [{ component: 'Hero', props: { tone: 'bold' }, slots: { title: [{ component: 'Heading', props: { text: 'Hello' } }], actions: [{ component: 'Cta', props: { label: 'Join', action: 'signup' } }] } }] };
    const screens = join(project, 'screens');
    mkdirSync(screens);
    json(join(screens, 'start.screen.json'), screen);
    const built = run(['build', 'ds/aindf.config.json', '--screens', 'screens', '--app', 'app', '--receipts', 'receipts.json']);
    assert.equal(built.code, 0, built.out);
    const page = readFileSync(join(project, 'app/start/page.tsx'), 'utf8');
    const modules = [...page.matchAll(/^import .* from (["'])([^"']+)\1;?$/gm)].map(m => m[2]);
    assert.deepEqual([...new Set(modules)], [bundle.implementation.module]);
    assert.equal(JSON.parse(readFileSync(join(project, 'receipts.json'), 'utf8')).receipts[0].builder.kit, installed.version);
    assert.equal(run(['build', 'ds/aindf.config.json', '--screens', 'screens', '--app', 'app', '--check']).code, 0);
    writeFileSync(join(project, 'app/start/page.tsx'), page + '\n// hand edit\n');
    const drift = run(['build', 'ds/aindf.config.json', '--screens', 'screens', '--app', 'app', '--check']);
    assert.equal(drift.code, 1, drift.out); assert.match(drift.out, /GENERATED_DRIFT/);
    json(join(screens, 'start.screen.json'), { ...screen, sections: [{ component: 'Nope', props: {} }] });
    const refused = run(['build', 'ds/aindf.config.json', '--screens', 'screens', '--app', 'app2']);
    assert.equal(refused.code, 1, refused.out); assert.match(refused.out, /UNKNOWN_COMPONENT/);
  });

  // 4. package exports resolve from the consumer project
  step('exports: @aindf/kit and @aindf/kit/mcp import from the installed package', () => {
    const out = execFileSync(process.execPath, ['--input-type=module', '-e',
      "const k = await import('@aindf/kit'); const m = await import('@aindf/kit/mcp'); console.log(['checkDs','admitScreen','createBundle','coreConformance'].every(n => typeof k[n] === 'function') && typeof m.createDsMcp === 'function')"],
      { cwd: project, encoding: 'utf8' }).trim();
    assert.equal(out, 'true');
  });

  // 5. MCP over stdio: the pin it serves is the bundle's; validate-screen accepts the pinned screen and refuses a broken one
  const requests = [
    { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'clean-install', version: '0' } } },
    { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'get-ds', arguments: {} } },
    { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'validate-screen', arguments: { screen: { kind: 'aindf.screen', aindfVersion: '0.2', ds: { id: bundle.ds.id, version: bundle.ds.version, bundleSha256: bundle.bundleSha256 }, route: '/x', template: { component: 'Page', props: { title: 'X' } }, sections: [{ component: 'Nope', props: {} }] } } } },
  ];
  const replies = await new Promise((resolve, reject) => {
    const child = spawn(join(project, 'node_modules/.bin/aindf'), ['mcp', 'bundle.json'], { cwd: project });
    let out = ''; child.stdout.on('data', d => { out += d; });
    child.on('error', reject);
    child.on('close', () => resolve(out.trim().split('\n').map(l => JSON.parse(l))));
    child.stdin.end(requests.map(r => JSON.stringify(r)).join('\n') + '\n');
  });
  step('mcp: serves the bundle pin and kit version; validate-screen refuses an unknown component', () => {
    const byId = Object.fromEntries(replies.map(r => [r.id, r]));
    assert.match(byId[1].result.serverInfo.version, new RegExp(`\\+${bundle.bundleSha256.slice(0, 12)}$`));
    const ds = JSON.parse(byId[2].result.content[0].text);
    assert.equal(ds.pin.bundleSha256, bundle.bundleSha256); assert.equal(ds.kit, installed.version);
    const verdict = JSON.parse(byId[3].result.content[0].text);
    assert.equal(verdict.ok, false); assert.ok(verdict.errors.some(e => e.code === 'UNKNOWN_COMPONENT'));
  });

  console.log(JSON.stringify({ result: 'PASS', kit: installed.version, tarball: packed.filename, tarballSha256: tarSha256, node: process.version, steps: steps.length }));
} catch (error) {
  console.error(`clean-install: FAIL ${error.message}`);
  process.exitCode = 1;
} finally { rmSync(work, { recursive: true, force: true }); }
