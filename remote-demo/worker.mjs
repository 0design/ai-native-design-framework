// Remote demo MCP: the AINDF demo design system over Streamable HTTP, read-only.
//   POST /mcp     MCP JSON-RPC, no staging: the 7 read-only tools; the staging tools answer READ_ONLY
//   GET  /health  status, the served pin and the kit version (no request data, no logging)
// Test address only (workers.dev) until the v2 release; no custom domain, no storage, no bindings.
import { createDsMcp, mcpFetchHandler, verifyBundle, bundlePin } from '../packages/aindf-kit/src/index.mjs';
import { KIT_VERSION } from '../packages/aindf-kit/src/util.mjs';
import demo from '../examples/demo-ds/aindf-demo.bundle.json' with { type: 'json' };

const bundle = verifyBundle(demo);
const mcp = mcpFetchHandler(createDsMcp(bundle, { serverName: 'aindf-demo' }));
const health = () => Response.json({ ok: true, ds: bundlePin(bundle), kit: KIT_VERSION, readOnly: true }, { headers: { 'cache-control': 'no-store' } });

export default {
  async fetch(request) {
    const { pathname } = new URL(request.url);
    if (pathname === '/mcp') return mcp(request);
    if (pathname === '/health' && request.method === 'GET') return health();
    return new Response('Not Found', { status: 404 });
  },
};
