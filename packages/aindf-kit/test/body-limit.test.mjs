// Review 9ec1da11 (Worker boundary FAIL): the byte limit must hold for the bytes actually received, not the header.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { loadDs, createBundle, createDsMcp, mcpFetchHandler, DEFAULT_MAX_BODY_BYTES, DRAIN_CAP_BYTES } from '../src/index.mjs';
const bundle = createBundle(loadDs(join(fileURLToPath(new URL('./fixtures/tiny-ds/', import.meta.url)), 'aindf.config.json')));
const LIMIT = 4096;
const calls = []; const inner = createDsMcp(bundle); const spy = async (m, o) => { calls.push(m.method); return inner(m, o); };
const handler = mcpFetchHandler(spy, { maxBodyBytes: LIMIT });
const list = pad => JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }) + ' '.repeat(pad);
const post = (body, headers = {}) => new Request('https://ds.test/mcp', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body, ...(body instanceof ReadableStream ? { duplex: 'half' } : {}) });
/** Stream of n-byte chunks that records how many chunks were pulled. */
const stream = (chunks, size) => { const s = { pulled: 0 }; s.body = new ReadableStream({ pull(c) { if (s.pulled === chunks) return c.close(); s.pulled++; c.enqueue(new TextEncoder().encode(' '.repeat(size))); } }); return s; };

test('valid small request is answered (control)', async () => {
  calls.length = 0; const r = await handler(post(list(0)));
  assert.equal(r.status, 200); assert.equal((await r.json()).result.tools.length, 7); assert.deepEqual(calls, ['tools/list']);
});
test('a body of exactly the limit passes; one byte more is 413', async () => {
  const exact = list(0); assert.equal((await handler(post(exact + ' '.repeat(LIMIT - exact.length)))).status, 200);
  calls.length = 0; const r = await handler(post(exact + ' '.repeat(LIMIT - exact.length + 1)));
  assert.equal(r.status, 413); assert.deepEqual(calls, [], 'handler never ran');
});
test('oversized body without Content-Length is 413', async () => {
  const req = post(list(LIMIT * 3)); assert.equal(req.headers.get('content-length'), null);
  calls.length = 0; const r = await handler(req); assert.equal(r.status, 413); assert.match((await r.json()).error.message, /exceeds 4096 bytes/); assert.deepEqual(calls, []);
});
test('misleading small Content-Length with an oversized body is 413', async () => {
  const req = post(list(LIMIT * 3), { 'content-length': '64' }); assert.equal(req.headers.get('content-length'), '64');
  calls.length = 0; assert.equal((await handler(req)).status, 413); assert.deepEqual(calls, []);
});
test('oversized streamed body is 413; the rest is discarded, never parsed', async () => {
  const s = stream(1000, 1024); // 1 MB offered, under the drain cap
  calls.length = 0; assert.equal((await handler(post(s.body))).status, 413); assert.deepEqual(calls, []);
  assert.equal(s.pulled, 1000, 'drained to the end so the 413 is delivered on a clean connection');
});
test('an endless upload stops at the drain cap', async () => {
  const s = stream(Infinity, 64 * 1024);
  assert.equal((await handler(post(s.body))).status, 413);
  assert.ok(s.pulled <= (DRAIN_CAP_BYTES + LIMIT) / (64 * 1024) + 2, `pulled ${s.pulled} × 64 KiB`);
});
test('an honest oversized Content-Length is 413 without parsing', async () => {
  const s = stream(10, 1024); calls.length = 0;
  assert.equal((await handler(post(s.body, { 'content-length': String(LIMIT + 1) }))).status, 413);
  assert.deepEqual(calls, []);
});
test('the default limit is 256 KiB and the drain cap 8 MiB', () => { assert.equal(DEFAULT_MAX_BODY_BYTES, 256 * 1024); assert.equal(DRAIN_CAP_BYTES, 8 * 1024 * 1024); });

test('a JSON-RPC batch is refused with -32600 and no-store (MCP 2025-06-18 has no batches)', async () => {
  calls.length = 0;
  const one = JSON.parse(list(0));
  const r = await handler(post(JSON.stringify([one, one])));
  assert.equal(r.status, 400);
  assert.equal(r.headers.get('cache-control'), 'no-store');
  assert.equal((await r.json()).error.code, -32600);
  assert.deepEqual(calls, [], 'nothing in the batch is handled');
});
