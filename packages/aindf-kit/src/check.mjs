import { readSchema } from './schemas.mjs';
import { validateSchema } from './schema.mjs';
const LAYERS = ['atoms', 'elements', 'blocks', 'sections'];
const SOURCE_SCHEMAS = { tokens: '0.1/tokens.schema.json', taxonomy: '0.1/taxonomy.schema.json', slots: '0.1/slots.schema.json', applicability: '0.1/applicability.schema.json', presets: '0.1/presets.schema.json', patterns: '0.1/patterns.schema.json', components: '0.2/components.schema.json', bindings: '0.2/bindings.schema.json' };
const TOKEN_TARGETS = { foundations: [], semantic: ['foundations', 'semantic'], component: ['foundations', 'semantic', 'component'] };
/** AINDF 0.2 conformance of a loaded DS. Returns stable-coded errors; empty array means conformant. */
export function checkDs({ config, sources, core }) {
  const errors = [];
  const err = (code, path, message) => errors.push({ code, path, message });
  for (const [name, source] of Object.entries(sources))
    for (const e of validateSchema(readSchema(SOURCE_SCHEMAS[name]), source)) err('SCHEMA', `${name}${e.path.slice(1)}`, e.message);
  if (errors.length) return errors;
  const { taxonomy, slots, applicability, presets, components, bindings, tokens } = sources;
  const classified = new Map(taxonomy.components.map(c => [c.name, c]));
  const contracts = new Map(components.components.map(c => [c.name, c]));
  const bindingNames = new Set(bindings.bindings.map(b => b.name));
  const slotsets = new Map(slots.slotsets.map(s => [s.component, s]));
  for (const c of taxonomy.components) {
    if (!taxonomy.roles.includes(c.role)) err('UNKNOWN_ROLE', `taxonomy.${c.name}`, `role ${c.role} is not declared`);
    if (!contracts.has(c.name)) err('UNCONTRACTED', `taxonomy.${c.name}`, 'classified component has no contract');
    if (c.hasSlots !== slotsets.has(c.name)) err('SLOTS_MISMATCH', `taxonomy.${c.name}`, `hasSlots=${c.hasSlots} but slotset ${slotsets.has(c.name) ? 'exists' : 'missing'}`);
  }
  const exports = new Set();
  for (const c of components.components) {
    const at = `components.${c.name}`;
    if (!classified.has(c.name)) err('UNCLASSIFIED', at, 'contract without taxonomy entry');
    if (exports.has(c.export)) err('DUPLICATE_EXPORT', at, c.export); exports.add(c.export);
    if (c.template && Object.values(c.slotProps ?? {}).includes('children')) err('TEMPLATE_CHILDREN_SLOT', at, 'a template renders the screen sections as children; its slots need their own props');
    if (c.template && classified.get(c.name)?.layer !== 'sections') err('TEMPLATE_LAYER', at, 'a template must be layer sections');
    for (const [p, def] of Object.entries(c.props)) {
      if (!/^[a-z][A-Za-z0-9]*$/.test(p) || ['key', 'ref', 'routeParams'].includes(p)) err('INVALID_PROP_NAME', `${at}.props.${p}`, 'prop names are camelCase identifiers; key/ref/routeParams are reserved');
      if (['className', 'style', 'children', 'dangerouslySetInnerHTML'].includes(p) || /^on[A-Z]/.test(p)) err('FORBIDDEN_PROP', `${at}.props.${p}`, 'styles, markup, children and handlers are never author props');
      if (def.type === 'enum' && !def.values?.length) err('ENUM_WITHOUT_VALUES', `${at}.props.${p}`, 'enum prop needs values');
      if (def.type === 'binding') for (const b of def.bindings ?? []) if (!bindingNames.has(b)) err('UNKNOWN_BINDING', `${at}.props.${p}`, b);
      if (def.type === 'richText' && def.hrefPattern) { try { new RegExp(def.hrefPattern); } catch { err('INVALID_HREF_PATTERN', `${at}.props.${p}`, def.hrefPattern); } }
      if (def.type === 'binding' && !def.bindings?.length) err('BINDING_WITHOUT_ALLOWLIST', `${at}.props.${p}`, 'binding prop needs allowed bindings');
    }
    for (const slot of Object.keys(c.slotProps ?? {})) if (!slotsets.get(c.name)?.slots.some(s => s.name === slot)) err('UNKNOWN_SLOT_PROP', at, slot);
  }
  for (const set of slots.slotsets) {
    const owner = classified.get(set.component);
    if (!owner) { err('DANGLING_SLOTSET', `slots.${set.component}`, 'unknown component'); continue; }
    for (const slot of set.slots) {
      const at = `slots.${set.component}.${slot.name}`;
      const max = LAYERS.indexOf(owner.layer) - 1;
      for (const layer of slot.accepts.layers ?? []) if (LAYERS.indexOf(layer) > max) err('LAYER_RULE', at, `${owner.layer} slot cannot accept ${layer}`);
      for (const name of slot.accepts.components ?? []) {
        if (!classified.has(name)) err('DANGLING_SLOT_TARGET', at, name);
        else if (LAYERS.indexOf(classified.get(name).layer) > max) err('LAYER_RULE', at, `${owner.layer} slot cannot accept ${name} (${classified.get(name).layer})`);
      }
    }
  }
  for (const m of applicability.modifiers ?? []) {
    if (applicability.modifierCategories && !applicability.modifierCategories.includes(m.category)) err('UNKNOWN_MODIFIER_CATEGORY', `applicability.${m.category}`, 'undeclared');
    for (const name of m.appliesTo.components ?? []) if (!classified.has(name)) err('DANGLING_MODIFIER_TARGET', `applicability.${m.category}`, name);
    for (const role of m.appliesTo.roles ?? []) if (!taxonomy.roles.includes(role)) err('DANGLING_MODIFIER_TARGET', `applicability.${m.category}`, role);
  }
  for (const p of presets.presets) {
    if (!classified.has(p.builtOn)) err('DANGLING_PRESET', `presets.${p.name}`, p.builtOn);
    for (const fills of Object.values(p.slots)) for (const f of fills) if (!classified.has(f.component)) err('DANGLING_PRESET', `presets.${p.name}`, f.component);
  }
  const tokenTiers = new Map(tokens.tokens.map(t => [t.name, t.tier]));
  for (const t of tokens.tokens) {
    if (t.tier === 'foundations' && !('value' in t)) err('TOKEN_TIER', `tokens.${t.name}`, 'foundations carry raw values');
    if (t.alias !== undefined) {
      if (!tokenTiers.has(t.alias)) err('DANGLING_TOKEN_ALIAS', `tokens.${t.name}`, t.alias);
      else if (!TOKEN_TARGETS[t.tier].includes(tokenTiers.get(t.alias))) err('TOKEN_DIRECTION', `tokens.${t.name}`, `${t.tier} cannot reference ${tokenTiers.get(t.alias)}`);
    }
  }
  if (config.conformsTo !== 'aindf@0.2') err('CONFORMS_TO', 'config', config.conformsTo);
  if (core) for (const e of coreConformance(config, components, core, { taxonomy, slots, bindings })) err(e.code, e.path, e.message);
  return errors;
}

/** Instance on Core (AINDF-DS-29/30): an Instance contract that reuses a Core component name accepts every prop value the
 *  Core contract accepts — every Core prop with its type, required exactly where Core requires it, every enum value, every
 *  allowed binding, mark and inline component, limits no tighter (maxLength, item counts, number range), the same link
 *  pattern — keeps every Core slot prop and adds only optional props. It also keeps the role's place in a screen: a Core
 *  template stays a template, routeParams is not added, the taxonomy layer is the Core one, every Core slot exists with a
 *  cardinality no tighter and every slot the Instance adds is optional (min 0). Every Core component and every Core binding
 *  exists in the Instance, a params or data binding with the same kind (screens use those kinds; an action binding is
 *  matched by name only). So a screen written for Core admits against the Instance unchanged — except
 *  what a slot accepts: that is judged by the Instance's own slotsets, and a narrower `accepts` can still reject a Core
 *  screen (SLOT_REJECTS) — deliberately not checked here. Props, slotProps, template, routeParams and the Core component list are checked
 *  from `components`; layer and the Core component list in the taxonomy need `taxonomy`, slots need `slots`, bindings need
 *  `bindings` (checkDs passes all three). The bundle must be the one pinned in ds.core (and, on load,
 *  ds.coreBundleSha256). */
const MAX_TEXT = 2000, MAX_ITEMS = 50, SCREEN_KINDS = ['params', 'data'];
export function coreConformance(config, components, core, { taxonomy, slots, bindings } = {}) {
  const out = [];
  const fail = (code, path, message) => out.push({ code, path, message });
  const pinned = `${core.ds.id}@${core.ds.version}`;
  if (config.ds.core !== pinned) { fail('CORE_PIN', 'config.ds.coreBundle', `bundle is ${pinned}, ds.core is ${config.ds.core ?? 'unset'}`); return out; }
  const coreContracts = new Map(core.sources.components.components.map(c => [c.name, c]));
  const missing = (base, mine) => (base ?? []).filter(v => !(mine ?? []).includes(v));
  const coreLayers = new Map((core.sources.taxonomy?.components ?? []).map(c => [c.name, c.layer]));
  const layers = new Map((taxonomy?.components ?? []).map(c => [c.name, c.layer]));
  const coreSlots = new Map((core.sources.slots?.slotsets ?? []).map(s => [s.component, s.slots]));
  const ownSlots = new Map((slots?.slotsets ?? []).map(s => [s.component, s.slots]));
  const range = card => card.split('..').map(x => x === '*' ? Infinity : Number(x));
  // review of #3 (G6/G7): a Core screen may use any Core component and any Core binding — admission fails UNKNOWN_COMPONENT
  // or UNKNOWN_BINDING otherwise (params/meta bindings are matched by kind)
  const own = new Set(components.components.map(c => c.name));
  for (const name of coreContracts.keys()) {
    if (!own.has(name)) fail('CORE_CONFORMANCE', `components.${name}`, `Core ${pinned} declares this component; the Instance must provide it`);
    else if (taxonomy && !layers.has(name)) fail('CORE_CONFORMANCE', `taxonomy.${name}`, `Core ${pinned} classifies this component; the Instance taxonomy must too`);
  }
  if (bindings) {
    const kinds = new Map(bindings.bindings.map(b => [b.name, b.kind]));
    // review of #4 (G8): admission reads the kind only for $.params (params) and $.meta (data); a binding a prop names is
    // matched by name, so an action binding may change kind
    for (const b of core.sources.bindings?.bindings ?? []) {
      if (!kinds.has(b.name)) fail('CORE_CONFORMANCE', `bindings.${b.name}`, `Core ${pinned} declares this binding (${b.kind})`);
      else if (SCREEN_KINDS.includes(b.kind) && kinds.get(b.name) !== b.kind) fail('CORE_CONFORMANCE', `bindings.${b.name}`, `kind ${kinds.get(b.name)}, Core has ${b.kind} (screens use it as ${b.kind === 'params' ? '$.params' : '$.meta'})`);
    }
  }
  for (const c of components.components) {
    const base = coreContracts.get(c.name);
    if (!base) continue;
    const at = `components.${c.name}`;
    for (const [p, def] of Object.entries(base.props)) {
      const mine = c.props[p], pat = `${at}.props.${p}`;
      if (!mine) { fail('CORE_CONFORMANCE', pat, `Core ${pinned} declares ${p}; the Instance contract must keep it`); continue; }
      if (mine.type !== def.type) { fail('CORE_CONFORMANCE', pat, `type ${mine.type}, Core has ${def.type}`); continue; }
      if (def.required && !mine.required) fail('CORE_CONFORMANCE', pat, 'Core requires it; the Instance must too');
      if (!def.required && mine.required) fail('CORE_CONFORMANCE', pat, 'optional in Core; a screen written for Core may omit it');
      for (const [key, label] of [['values', 'enum value'], ['bindings', 'binding'], ['marks', 'mark'], ['inlineComponents', 'inline component']])
        for (const v of missing(def[key], mine[key])) fail('CORE_CONFORMANCE', pat, `Core ${label} ${v} is missing`);
      if ((mine.maxLength ?? MAX_TEXT) < (def.maxLength ?? MAX_TEXT)) fail('CORE_CONFORMANCE', pat, `maxLength ${mine.maxLength} is tighter than Core ${def.maxLength ?? MAX_TEXT}`);
      if ((mine.minItems ?? 0) > (def.minItems ?? 0)) fail('CORE_CONFORMANCE', pat, `minItems ${mine.minItems} is tighter than Core ${def.minItems ?? 0}`);
      if ((mine.maxItems ?? MAX_ITEMS) < (def.maxItems ?? MAX_ITEMS)) fail('CORE_CONFORMANCE', pat, `maxItems ${mine.maxItems} is tighter than Core ${def.maxItems ?? MAX_ITEMS}`);
      if ((mine.minimum ?? -Infinity) > (def.minimum ?? -Infinity)) fail('CORE_CONFORMANCE', pat, `minimum ${mine.minimum} is tighter than Core ${def.minimum}`);
      if ((mine.maximum ?? Infinity) < (def.maximum ?? Infinity)) fail('CORE_CONFORMANCE', pat, `maximum ${mine.maximum} is tighter than Core ${def.maximum}`);
      if ((mine.hrefPattern ?? null) !== (def.hrefPattern ?? null)) fail('CORE_CONFORMANCE', pat, 'the link pattern must be the Core one (patterns cannot be compared for inclusion)');
    }
    for (const [p, def] of Object.entries(c.props)) if (!(p in base.props) && def.required) fail('CORE_CONFORMANCE', `${at}.props.${p}`, 'a prop the Core role does not have must be optional');
    for (const slot of Object.keys(base.slotProps ?? {})) if (!(slot in (c.slotProps ?? {}))) fail('CORE_CONFORMANCE', `${at}.slotProps.${slot}`, `Core ${pinned} declares this slot`);
    // review of #2 (G4): where a screen may place the role — admission fails NOT_A_TEMPLATE, ROUTE_PARAMS_UNAVAILABLE,
    // LAYER_MISMATCH, UNKNOWN_SLOT or SLOT_CARDINALITY on a Core screen otherwise
    if (base.template && !c.template) fail('CORE_CONFORMANCE', `${at}.template`, 'a Core template must stay a template');
    if (c.routeParams && !base.routeParams) fail('CORE_CONFORMANCE', `${at}.routeParams`, 'Core screens may place it on a route without [param]');
    if (layers.has(c.name) && layers.get(c.name) !== coreLayers.get(c.name)) fail('CORE_CONFORMANCE', `taxonomy.${c.name}.layer`, `layer ${layers.get(c.name)}, Core has ${coreLayers.get(c.name)}`);
    if (slots) for (const def of coreSlots.get(c.name) ?? []) {
      const mine = (ownSlots.get(c.name) ?? []).find(s => s.name === def.name), sat = `slots.${c.name}.${def.name}`;
      if (!mine) { fail('CORE_CONFORMANCE', sat, `Core ${pinned} declares this slot`); continue; }
      const [min, max] = range(def.cardinality), [myMin, myMax] = range(mine.cardinality);
      if (myMin > min || myMax < max) fail('CORE_CONFORMANCE', sat, `cardinality ${mine.cardinality} is tighter than Core ${def.cardinality}`);
    }
    // review of #3 (G5): a slot the Core role does not have must be optional, like a new prop — SLOT_CARDINALITY otherwise
    if (slots) for (const mine of ownSlots.get(c.name) ?? [])
      if (!(coreSlots.get(c.name) ?? []).some(s => s.name === mine.name) && range(mine.cardinality)[0] > 0) fail('CORE_CONFORMANCE', `slots.${c.name}.${mine.name}`, `a slot the Core role does not have must be optional (min 0), got ${mine.cardinality}`);
  }
  return out;
}
