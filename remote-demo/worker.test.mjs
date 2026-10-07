// The remote demo MCP as a client sees it: health, MCP over POST, read-only, limits, unknown paths.
import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.mjs';
import demo from '../examples/demo-ds/aindf-demo.bundle.json' with { type: 'json' };

const url = path => `https://aindf-demo-mcp.example.workers.dev${path}`;
const rpc = async (method, params = {}) => {
  const r = await worker.fetch(new Request(url('/mcp'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) }));
  assert.equal(r.status, 200); return (await r.json()).result;
};
const pin = { id: demo.ds.id, version: demo.ds.version, bundleSha256: demo.bundleSha256 };

test('GET /health names the served demo pin and kit, read-only', async () => {
  const r = await worker.fetch(new Request(url('/health')));
  assert.equal(r.status, 200);
  const body = await r.json();
  assert.deepEqual({ ok: body.ok, ds: body.ds, readOnly: body.readOnly }, { ok: true, ds: pin, readOnly: true });
  assert.match(body.kit, /^0\.2\.0/);
});

test('POST /mcp: 7 read-only tools, the demo pin, a valid screen admitted', async () => {
  assert.equal((await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '0' } })).serverInfo.name, 'aindf-demo');
  const tools = (await rpc('tools/list')).tools;
  assert.equal(tools.length, 7); assert.ok(tools.every(t => t.annotations.readOnlyHint));
  assert.deepEqual((await rpc('tools/call', { name: 'get-ds', arguments: {} })).structuredContent.pin, pin);
  const screen = { kind: 'aindf.screen', aindfVersion: '0.2', ds: pin, route: '/start', template: { component: 'Page', props: { title: 'Start' } }, sections: [{ component: 'FeatureList', props: { title: 'Why', items: ['One source of truth'] } }] };
  assert.equal((await rpc('tools/call', { name: 'validate-screen', arguments: { screen } })).structuredContent.ok, true);
});

test('the staging tools are refused: nothing is recorded', async () => {
  for (const name of ['submit-screen', 'request-extension']) {
    const r = await rpc('tools/call', { name, arguments: {} });
    assert.equal(r.isError, true); assert.equal(r.structuredContent.code, 'READ_ONLY');
  }
});

test('a JSON-RPC batch is refused with -32600 (MCP 2025-06-18 has no batches)', async () => {
  const one = { jsonrpc: '2.0', id: 1, method: 'tools/list' };
  const r = await worker.fetch(new Request(url('/mcp'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify([one, one]) }));
  assert.equal(r.status, 400);
  assert.equal((await r.json()).error.code, -32600);
});

test('the Worker keeps nothing: Cloudflare observability is off in its config', async () => {
  const { readFileSync } = await import('node:fs');
  const config = JSON.parse(readFileSync(new URL('./wrangler.jsonc', import.meta.url), 'utf8').replace(/^\s*\/\/.*$/gm, ''));
  assert.deepEqual(config.observability, { enabled: false });
  for (const key of ['kv_namespaces', 'r2_buckets', 'd1_databases', 'durable_objects', 'routes', 'route', 'vars', 'logpush', 'tail_consumers']) assert.equal(config[key], undefined, key);
});

test('GET /mcp is 405, an oversized body is 413, any other path is 404', async () => {
  assert.equal((await worker.fetch(new Request(url('/mcp')))).status, 405);
  const big = await worker.fetch(new Request(url('/mcp'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: ' '.repeat(300 * 1024) }));
  assert.equal(big.status, 413);
  for (const path of ['/', '/admin', '/mcp/x']) assert.equal((await worker.fetch(new Request(url(path)))).status, 404, path);
});
