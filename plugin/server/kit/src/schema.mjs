// Minimal, dependency-free JSON Schema (2020-12 subset) validator for the AINDF schemas.
// Supported keywords are exactly those the AINDF schemas use; an unknown keyword is a kit bug, not ignored.
const SUPPORTED = new Set(['$schema', '$id', 'title', 'description', 'default', 'type', 'required', 'additionalProperties', 'properties', 'items', 'enum', 'const', '$ref', '$defs', 'minProperties', 'minItems', 'maxItems', 'minLength', 'maxLength', 'pattern', 'oneOf', 'minimum', 'maximum']);
const typeOf = v => v === null ? 'null' : Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : typeof v;
const matchesType = (v, t) => (Array.isArray(t) ? t : [t]).some(x => x === typeOf(v) || (x === 'number' && typeof v === 'number' && Number.isFinite(v)));

export function validateSchema(schema, value) {
  const errors = [];
  const root = schema;
  const walk = (s, v, path) => {
    if (s === true || s === undefined) return;
    if (s === false) return errors.push({ path, message: 'not allowed' });
    for (const k of Object.keys(s)) if (!SUPPORTED.has(k)) throw Error(`aindf-kit schema keyword not supported: ${k}`);
    if (s.$ref) { const name = /^#\/\$defs\/(.+)$/.exec(s.$ref)?.[1]; if (!name || !root.$defs?.[name]) throw Error(`bad $ref ${s.$ref}`); walk(root.$defs[name], v, path); }
    if (s.type && !matchesType(v, s.type)) return errors.push({ path, message: `must be ${s.type}` });
    if (s.enum && !s.enum.some(e => JSON.stringify(e) === JSON.stringify(v))) errors.push({ path, message: `must be one of ${s.enum.join(', ')}` });
    if ('const' in s && JSON.stringify(s.const) !== JSON.stringify(v)) errors.push({ path, message: `must be ${JSON.stringify(s.const)}` });
    if (typeof v === 'string') {
      if (s.minLength !== undefined && v.length < s.minLength) errors.push({ path, message: `shorter than ${s.minLength}` });
      if (s.maxLength !== undefined && v.length > s.maxLength) errors.push({ path, message: `longer than ${s.maxLength}` });
      if (s.pattern && !new RegExp(s.pattern, 'u').test(v)) errors.push({ path, message: `must match ${s.pattern}` });
    }
    if (typeof v === 'number') {
      if (s.minimum !== undefined && v < s.minimum) errors.push({ path, message: `below ${s.minimum}` });
      if (s.maximum !== undefined && v > s.maximum) errors.push({ path, message: `above ${s.maximum}` });
    }
    if (Array.isArray(v)) {
      if (s.minItems !== undefined && v.length < s.minItems) errors.push({ path, message: `fewer than ${s.minItems} items` });
      if (s.maxItems !== undefined && v.length > s.maxItems) errors.push({ path, message: `more than ${s.maxItems} items` });
      if (s.items) v.forEach((x, i) => walk(s.items, x, `${path}[${i}]`));
    }
    if (typeOf(v) === 'object') {
      for (const r of s.required ?? []) if (!Object.hasOwn(v, r)) errors.push({ path, message: `missing ${r}` });
      if (s.minProperties !== undefined && Object.keys(v).length < s.minProperties) errors.push({ path, message: `needs ${s.minProperties}+ properties` });
      for (const [k, x] of Object.entries(v)) {
        if (s.properties && Object.hasOwn(s.properties, k)) walk(s.properties[k], x, `${path}.${k}`);
        else if (s.additionalProperties === false) errors.push({ path: `${path}.${k}`, message: 'unknown property' });
        else if (typeof s.additionalProperties === 'object') walk(s.additionalProperties, x, `${path}.${k}`);
      }
    }
    if (s.oneOf) {
      const passing = s.oneOf.filter(sub => { const before = errors.length; walk(sub, v, path); const ok = errors.length === before; errors.length = before; return ok; }).length;
      if (passing !== 1) errors.push({ path, message: `must match exactly one of ${s.oneOf.length} shapes` });
    }
  };
  walk(schema, value, '$');
  return errors;
}
