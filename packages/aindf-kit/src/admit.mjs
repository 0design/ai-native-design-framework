import { readSchema } from './schemas.mjs';
import { validateSchema } from './schema.mjs';
import { verifyBundle } from './bundle.mjs';
import { isObject } from './util.mjs';
const LAYERS = ['atoms', 'elements', 'blocks', 'sections'];
const MAX_TEXT = 2000;
/** richText = ordered inline items: "text" | {strong} | {code} | {link:{href,text}} | {component:"InlineName"}. */
export function richTextError(value, def) {
  if (!Array.isArray(value) || !value.length || value.length > 60) return '1..60 inline items';
  const marks = new Set(def.marks ?? []);
  for (const item of value) {
    if (typeof item === 'string') { if (!item.length || item.length > MAX_TEXT) return 'text items are 1..2000 chars'; continue; }
    if (!isObject(item) || Object.keys(item).length !== 1) return 'each inline item is text or an object with exactly one key';
    const [kind, v] = Object.entries(item)[0];
    if (kind === 'strong' || kind === 'code') { if (!marks.has(kind)) return `${kind} is not allowed here`; if (typeof v !== 'string' || !v.trim()) return `${kind} needs text`; }
    else if (kind === 'link') {
      if (!marks.has('link')) return 'links are not allowed here';
      if (!isObject(v) || Object.keys(v).sort().join() !== 'href,text' || typeof v.text !== 'string' || !v.text.trim() || typeof v.href !== 'string') return 'link is {href,text}';
      if (!new RegExp(def.hrefPattern ?? '^/(?!/)').test(v.href)) return `href ${v.href} is not allowed`;
    } else if (kind === 'component') { if (!(def.inlineComponents ?? []).includes(v)) return `inline component ${v} is not allowed`; }
    else return `unknown inline item ${kind}`;
  }
  return null;
}
/** One prop value against its contract: null, or { code, message }. Shared by admission and by the DS check of `default`. */
export function propValueError(def, value) {
  const text = v => typeof v === 'string' && v.trim().length > 0 && v.length <= (def.maxLength ?? MAX_TEXT);
  if (def.type === 'text' && !text(value)) return { code: 'INVALID_TEXT', message: `non-empty text up to ${def.maxLength ?? MAX_TEXT} chars` };
  if (def.type === 'enum' && !(def.values ?? []).includes(value)) return { code: 'INVALID_ENUM', message: `one of ${(def.values ?? []).join(', ')}` };
  if (def.type === 'boolean' && typeof value !== 'boolean') return { code: 'INVALID_BOOLEAN', message: 'true or false' };
  if (def.type === 'number' && (typeof value !== 'number' || !Number.isFinite(value) || (def.minimum !== undefined && value < def.minimum) || (def.maximum !== undefined && value > def.maximum))) return { code: 'INVALID_NUMBER', message: 'finite number in range' };
  if (def.type === 'binding' && !(def.bindings ?? []).includes(value)) return { code: 'UNKNOWN_BINDING', message: `one of ${(def.bindings ?? []).join(', ')}` };
  if (def.type === 'richText') { const bad = richTextError(value, def); if (bad) return { code: 'INVALID_RICH_TEXT', message: bad }; }
  if (def.type === 'textList' && (!Array.isArray(value) || !value.every(text) || value.length < (def.minItems ?? 0) || value.length > (def.maxItems ?? 50))) return { code: 'INVALID_TEXT_LIST', message: `${def.minItems ?? 0}..${def.maxItems ?? 50} non-empty texts` };
  return null;
}
/**
 * Admission of one ScreenSpec against one DS bundle. Pure JSON in, stable-coded errors out.
 * Returns { ok, errors } — errors carry { code, path, message } so an agent can repair without reading source.
 */
export function admitScreen(bundle, screen) {
  verifyBundle(bundle);
  const errors = [];
  const err = (code, path, message) => errors.push({ code, path, message });
  for (const e of validateSchema(readSchema('0.2/screen.schema.json'), screen)) {
    const code = /unknown property/.test(e.message) ? 'UNKNOWN_FIELD' : 'SCREEN_SHAPE';
    err(code, e.path, e.message);
  }
  if (errors.length) return { ok: false, errors };
  const { ds, sources } = bundle;
  if (screen.ds.id !== ds.id || screen.ds.version !== ds.version || screen.ds.bundleSha256 !== bundle.bundleSha256) err('DS_PIN_MISMATCH', '$.ds', `screen pins ${screen.ds.id}@${screen.ds.version} ${screen.ds.bundleSha256.slice(0, 12)}, bundle is ${ds.id}@${ds.version} ${bundle.bundleSha256.slice(0, 12)}`);
  const classified = new Map(sources.taxonomy.components.map(c => [c.name, c]));
  const contracts = new Map(sources.components.components.map(c => [c.name, c]));
  const slotsets = new Map(sources.slots.slotsets.map(s => [s.component, s]));
  const node = (n, path, expect) => {
    const c = contracts.get(n.component), t = classified.get(n.component);
    if (!c || !t) return err('UNKNOWN_COMPONENT', `${path}.component`, `${n.component} is not in DS ${ds.id}@${ds.version}; request an extension instead`);
    if (expect.template && !c.template) err('NOT_A_TEMPLATE', `${path}.component`, `${n.component} is not a template`);
    if (expect.layer && t.layer !== expect.layer) err('LAYER_MISMATCH', `${path}.component`, `${n.component} is ${t.layer}, expected ${expect.layer}`);
    if (expect.accepts) {
      const a = expect.accepts;
      if (!(a.components ?? []).includes(n.component) && !(a.layers ?? []).includes(t.layer)) err('SLOT_REJECTS', `${path}.component`, `slot ${expect.slot} does not accept ${n.component}`);
    }
    const props = n.props ?? {};
    if (!isObject(props)) return err('SCREEN_SHAPE', `${path}.props`, 'props must be an object');
    for (const [key, value] of Object.entries(props)) {
      const def = Object.hasOwn(c.props, key) ? c.props[key] : undefined;
      const at = `${path}.props.${key}`;
      if (!def) { err('UNKNOWN_PROP', at, `${n.component} has no prop ${key}; allowed: ${Object.keys(c.props).join(', ') || 'none'}`); continue; }
      const bad = propValueError(def, value);
      if (bad) err(bad.code, at, bad.message);
    }
    if (c.routeParams && !routeHasParams) err('ROUTE_PARAMS_UNAVAILABLE', `${path}.component`, `${n.component} needs a [param] route`);
    for (const [key, def] of Object.entries(c.props)) if (def.required && !Object.hasOwn(props, key)) err('MISSING_PROP', `${path}.props`, `${n.component} requires ${key}`);
    const set = slotsets.get(n.component);
    const filled = n.slots ?? {};
    for (const [slot, children] of Object.entries(filled)) {
      const def = set?.slots.find(s => s.name === slot);
      if (!def) { err('UNKNOWN_SLOT', `${path}.slots.${slot}`, `${n.component} has no slot ${slot}`); continue; }
      children.forEach((child, i) => node(child, `${path}.slots.${slot}[${i}]`, { accepts: def.accepts, slot }));
    }
    for (const def of set?.slots ?? []) {
      const count = (filled[def.name] ?? []).length;
      const [min, max] = def.cardinality.split('..').map(x => x === '*' ? Infinity : Number(x));
      if (count < min || count > max) err('SLOT_CARDINALITY', `${path}.slots.${def.name}`, `${def.cardinality} required, got ${count}`);
    }
  };
  const bindings = new Map(sources.bindings.bindings.map(b => [b.name, b]));
  const routeHasParams = /\[[a-z]+\]/.test(screen.route);
  if (routeHasParams !== Boolean(screen.params)) err('ROUTE_PARAMS', '$.params', routeHasParams ? 'a [param] route needs params.binding' : 'params are only allowed on a [param] route');
  if (screen.params && bindings.get(screen.params.binding)?.kind !== 'params') err('UNKNOWN_BINDING', '$.params.binding', `${screen.params.binding} is not a params binding of this DS`);
  for (const [key, value] of Object.entries(screen.meta ?? {})) if (typeof value === 'object' && bindings.get(value.binding)?.kind !== 'data') err('UNKNOWN_BINDING', `$.meta.${key}`, `${value.binding} is not a data binding of this DS`);
  node(screen.template, '$.template', { template: true });
  screen.sections.forEach((s, i) => node(s, `$.sections[${i}]`, { layer: 'sections' }));
  if (LAYERS.length !== 4) throw Error('unreachable');
  return { ok: errors.length === 0, errors };
}
