import { readSchema } from './schemas.mjs';
import { validateSchema } from './schema.mjs';
const LAYERS = ['atoms', 'elements', 'blocks', 'sections'];
const SOURCE_SCHEMAS = { tokens: '0.1/tokens.schema.json', taxonomy: '0.1/taxonomy.schema.json', slots: '0.1/slots.schema.json', applicability: '0.1/applicability.schema.json', presets: '0.1/presets.schema.json', patterns: '0.1/patterns.schema.json', components: '0.2/components.schema.json', bindings: '0.2/bindings.schema.json' };
const TOKEN_TARGETS = { foundations: [], semantic: ['foundations', 'semantic'], component: ['foundations', 'semantic', 'component'] };
/** AINDF 0.2 conformance of a loaded DS. Returns stable-coded errors; empty array means conformant. */
export function checkDs({ config, sources }) {
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
  return errors;
}
