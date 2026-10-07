import { verifyBundle, bundlePin } from './bundle.mjs';
import { admitScreen } from './admit.mjs';
import { KIT_VERSION, sha256, isObject } from './util.mjs';
export const PROTOCOL_VERSION = '2025-06-18';
const LAYERS = ['atoms', 'elements', 'blocks', 'sections'];
const obj = (properties, required = []) => ({ type: 'object', properties, required, additionalProperties: false });
const TOOLS = [
  { name: 'get-ds', description: 'Identity, pin and overview of this design system: roles, components by layer, bindings, AINDF version. Start here; copy `pin` into every screen.', inputSchema: obj({}) },
  { name: 'list-by-facet', description: 'AINDF 0.1: components filtered by layer, role and/or renderTarget.', inputSchema: obj({ layer: { enum: LAYERS }, role: { type: 'string' }, renderTarget: { enum: ['inline', 'overlay'] } }) },
  { name: 'get-component', description: 'Full contract of one component: classification, closed props, slots, states, accessibility, good/bad examples.', inputSchema: obj({ name: { type: 'string' } }, ['name']) },
  { name: 'slot-accepts', description: 'AINDF 0.1: what a slot of a component accepts (layers, components, cardinality).', inputSchema: obj({ component: { type: 'string' }, slot: { type: 'string' } }, ['component']) },
  { name: 'applicable-modifiers', description: 'AINDF 0.1: modifiers applicable to a component.', inputSchema: obj({ component: { type: 'string' } }, ['component']) },
  { name: 'get-preset', description: 'AINDF 0.1: a pre-composed preset by name (omit name to list).', inputSchema: obj({ name: { type: 'string' } }) },
  { name: 'validate-screen', description: 'Admission of a ScreenSpec JSON against this exact DS revision. Returns ok or stable error codes with paths. Validation never builds, publishes or accepts anything.', inputSchema: obj({ screen: { type: 'object' } }, ['screen']) },
  { name: 'submit-screen', description: 'Stage an admitted ScreenSpec as an unaccepted draft for the trusted builder. Requires an author token. Staging is write-once; it never builds, verifies, accepts or releases.', inputSchema: obj({ screen: { type: 'object' }, note: { type: 'string', maxLength: 500 } }, ['screen']) },
  { name: 'request-extension', description: 'Ask the DS owner for a missing capability instead of working around the contract. Requires an author token.', inputSchema: obj({ need: { type: 'string', maxLength: 2000 }, route: { type: 'string' }, components: { type: 'array', items: { type: 'string' } } }, ['need']) },
];
// MCP tool annotations: a human title and the hints catalogs and clients rely on. Reads touch only the pinned bundle
// (closed world). The two staging tools add write-once drafts (same input -> same key), never change or delete anything.
const READ = { readOnlyHint: true, openWorldHint: false };
const STAGE = { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const ANNOTATIONS = {
  'get-ds': { title: 'Get design system', ...READ }, 'list-by-facet': { title: 'List components by facet', ...READ },
  'get-component': { title: 'Get component contract', ...READ }, 'slot-accepts': { title: 'What a slot accepts', ...READ },
  'applicable-modifiers': { title: 'Applicable modifiers', ...READ }, 'get-preset': { title: 'Get preset', ...READ },
  'validate-screen': { title: 'Validate screen', ...READ },
  'submit-screen': { title: 'Submit screen draft', ...STAGE }, 'request-extension': { title: 'Request design system extension', ...STAGE },
};
const STAGING_TOOLS = new Set(['submit-screen', 'request-extension']);
const ANNOTATED = Object.freeze(TOOLS.map(t => Object.freeze({ ...t, title: ANNOTATIONS[t.name].title, annotations: Object.freeze({ ...ANNOTATIONS[t.name] }) })));
const text = value => ({ content: [{ type: 'text', text: JSON.stringify(value, null, 2) }], structuredContent: value });
// Cut by code points, never inside a surrogate pair (a cut emoji would leave a lone surrogate the server then refuses).
const clip = (s, n) => Array.from(s).slice(0, n).join('');
const toolError = (code, message) => ({ content: [{ type: 'text', text: `${code}: ${message}` }], structuredContent: { ok: false, code, message }, isError: true });
/**
 * Stateless MCP (JSON-RPC 2.0) handler serving one immutable DS bundle.
 * `staging` = { authorize(token) -> principal|null, put(key, bytes) -> Promise<{created:boolean}> } or null (read-only).
 */
export function createDsMcp(bundle, { staging = null, serverName = `aindf-ds-${bundle.ds.id}` } = {}) {
  verifyBundle(bundle);
  const s = bundle.sources;
  const classified = new Map(s.taxonomy.components.map(c => [c.name, c]));
  const contracts = new Map(s.components.components.map(c => [c.name, c]));
  const component = name => classified.has(name) && { ...classified.get(name), contract: contracts.get(name), slots: s.slots.slotsets.find(x => x.component === name)?.slots ?? [] };
  const call = async (name, args, auth) => {
    if (!isObject(args)) args = {};
    switch (name) {
      case 'get-ds': return text({ pin: bundlePin(bundle), conformsTo: bundle.conformsTo, kit: KIT_VERSION, roles: s.taxonomy.roles, components: Object.fromEntries(LAYERS.map(l => [l, s.taxonomy.components.filter(c => c.layer === l).map(c => c.name)])), templates: s.components.components.filter(c => c.template).map(c => c.name), bindings: s.bindings.bindings, screenShape: { kind: 'aindf.screen', aindfVersion: '0.2', ds: 'pin', route: '/path', template: { component: '<template>', props: {} }, sections: [{ component: '<sections-layer component>', props: {}, slots: {} }] } });
      case 'list-by-facet': return text(s.taxonomy.components.filter(c => (!args.layer || c.layer === args.layer) && (!args.role || c.role === args.role) && (!args.renderTarget || c.renderTargets.includes(args.renderTarget))).map(c => ({ name: c.name, layer: c.layer, role: c.role, description: contracts.get(c.name)?.description })));
      case 'get-component': return component(args.name) ? text(component(args.name)) : toolError('UNKNOWN_COMPONENT', `${args.name} is not in this DS; ${staging ? 'use request-extension' : 'report the need to the user'}`);
      case 'slot-accepts': { const c = component(args.component); if (!c) return toolError('UNKNOWN_COMPONENT', String(args.component)); return text(args.slot ? c.slots.find(x => x.name === args.slot) ?? null : c.slots); }
      case 'applicable-modifiers': { const c = classified.get(args.component); if (!c) return toolError('UNKNOWN_COMPONENT', String(args.component)); return text((s.applicability.modifiers ?? []).filter(m => (m.appliesTo.components ?? []).includes(c.name) || (m.appliesTo.layers ?? []).includes(c.layer) || (m.appliesTo.roles ?? []).includes(c.role))); }
      case 'get-preset': return text(args.name ? s.presets.presets.find(p => p.name === args.name) ?? null : s.presets.presets.map(p => p.name));
      case 'validate-screen': return text(admitScreen(bundle, args.screen));
      case 'submit-screen': case 'request-extension': {
        if (!staging) return toolError('READ_ONLY', 'this MCP endpoint has no staging');
        const principal = await staging.authorize(auth);
        if (!principal) return toolError('UNAUTHORIZED', 'an author token is required (Authorization: Bearer ...)');
        if (name === 'request-extension') {
          const record = { kind: 'aindf.extension-request', ds: bundlePin(bundle), principal, need: clip(String(args.need ?? ''), 2000), route: args.route ?? null, components: Array.isArray(args.components) ? args.components.map(String).slice(0, 20) : [] };
          let id; try { id = sha256(record); } catch (e) { if (e.code) return toolError(e.code, `${e.path}: ${e.reason}`); throw e; }
          await staging.put(`extension-requests/${bundle.ds.id}/${id}.json`, JSON.stringify(record, null, 2) + '\n');
          return text({ ok: true, id, state: 'requested' });
        }
        const admitted = admitScreen(bundle, args.screen);
        if (!admitted.ok) return text({ ok: false, errors: admitted.errors, state: 'rejected' });
        const bytes = JSON.stringify(args.screen, null, 2) + '\n';
        const id = sha256(bytes);
        const record = { kind: 'aindf.submission', ds: bundlePin(bundle), principal, screenSha256: id, route: args.screen.route, note: typeof args.note === 'string' ? clip(args.note, 500) : null, state: 'draft' };
        const stored = await staging.put(`screens/${bundle.ds.id}/${bundle.ds.version}/${id}.screen.json`, bytes);
        await staging.put(`screens/${bundle.ds.id}/${bundle.ds.version}/${id}.submission.json`, JSON.stringify(record, null, 2) + '\n');
        return text({ ok: true, id, state: 'draft', created: stored.created, next: 'the trusted builder picks drafts up; you cannot build, verify, accept or release' });
      }
      default: return null;
    }
  };
  return async function handle(message, { auth = null } = {}) {
    if (!isObject(message) || message.jsonrpc !== '2.0' || typeof message.method !== 'string') return { jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid Request' } };
    const { id = null, method, params = {} } = message;
    const reply = result => ({ jsonrpc: '2.0', id, result });
    if (!('id' in message)) return null; // notifications
    if (method === 'initialize') return reply({ protocolVersion: PROTOCOL_VERSION, capabilities: { tools: { listChanged: false } }, serverInfo: { name: serverName, version: `${bundle.ds.version}+${bundle.bundleSha256.slice(0, 12)}` }, instructions: `AINDF ${bundle.conformsTo} design-system MCP for ${bundle.ds.id}@${bundle.ds.version}. You author screens only as ScreenSpec JSON pinned to get-ds.pin. Never write HTML, CSS, JSX or code. ${staging ? 'request-extension when a capability is missing. validate-screen before submit-screen.' : 'When a capability is missing, report the need to the user. validate-screen until ok, then give the validated ScreenSpec to the user.'} You cannot build, verify, accept or release.` });
    if (method === 'ping') return reply({});
    // without staging the two staging tools only answer READ_ONLY, so they are not offered (a direct call still is)
    if (method === 'tools/list') return reply({ tools: staging ? ANNOTATED : ANNOTATED.filter(t => !STAGING_TOOLS.has(t.name)) });
    if (method === 'tools/call') {
      const result = await call(params?.name, params?.arguments, auth);
      return result ? reply(result) : { jsonrpc: '2.0', id, error: { code: -32602, message: `Unknown tool ${params?.name}` } };
    }
    return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } };
  };
}
export const DEFAULT_MAX_BODY_BYTES = 256 * 1024;
export const DRAIN_CAP_BYTES = 8 * 1024 * 1024;
/**
 * Discard (never buffer) the rest of an oversized upload up to a hard cap, then cancel. Measured in local workerd: answering
 * 413 with the upload unread (or cancelled) made the next request on the dev proxy fail with 503; draining avoids it.
 */
async function drain(reader) { if (!reader) return; let seen = 0; try { for (;;) { const { done, value } = await reader.read(); if (done) return; seen += value.byteLength; if (seen > DRAIN_CAP_BYTES) { await reader.cancel('body too large'); return; } } } catch {} }
const tooLarge = maxBytes => Response.json({ jsonrpc: '2.0', id: null, error: { code: -32600, message: `Request body exceeds ${maxBytes} bytes` } }, { status: 413, headers: { 'cache-control': 'no-store' } });
/**
 * Reads at most maxBytes of the actual body stream (review 9ec1da11: a header check alone let a 300 KB body without
 * or with a false Content-Length through). Returns null when the body is larger; at most maxBytes are buffered and the
 * rest is discarded up to DRAIN_CAP_BYTES.
 */
export async function readBoundedText(request, maxBytes = DEFAULT_MAX_BODY_BYTES) {
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks = []; let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) { await drain(reader); return null; }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let at = 0;
  for (const c of chunks) { bytes.set(c, at); at += c.byteLength; }
  return new TextDecoder().decode(bytes);
}
/** Minimal Streamable-HTTP adapter (JSON responses, no sessions) for fetch-style runtimes such as Workers. */
export function mcpFetchHandler(handle, { maxBodyBytes = DEFAULT_MAX_BODY_BYTES } = {}) {
  return async request => {
    if (request.method === 'GET') return new Response(null, { status: 405, headers: { allow: 'POST' } });
    if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    const declared = request.headers.get('content-length');
    if (declared !== null && Number(declared) > maxBodyBytes) { await drain(request.body?.getReader()); return tooLarge(maxBodyBytes); } // early, without reading
    const text = await readBoundedText(request, maxBodyBytes); // the real limit: counts bytes actually received
    if (text === null) return tooLarge(maxBodyBytes);
    let body; try { body = JSON.parse(text); } catch { return Response.json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, { status: 400 }); }
    const auth = /^Bearer (.+)$/.exec(request.headers.get('authorization') ?? '')?.[1] ?? null;
    const batch = Array.isArray(body);
    const replies = (await Promise.all((batch ? body : [body]).map(m => handle(m, { auth })))).filter(Boolean);
    if (!replies.length) return new Response(null, { status: 202 });
    return Response.json(batch ? replies : replies[0], { headers: { 'cache-control': 'no-store' } });
  };
}
