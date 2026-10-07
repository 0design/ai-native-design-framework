import { createHash } from 'node:crypto';
export const KIT_VERSION = '0.2.0';
export class AindfError extends Error {
  constructor(code, message, path = '$') { super(`${code} ${path}: ${message}`); this.name = 'AindfError'; this.code = code; this.path = path; this.reason = message; }
}
export const fail = (code, message, path) => { throw new AindfError(code, message, path); };
export const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);
/** Canonical JSON = RFC 8785 (JCS) + one trailing "\n", built directly (no intermediate object: integer-like keys
 *  would be reordered by the engine). Only values in the AINDF profile of I-JSON (RFC 7493) are
 *  hashable: a lone surrogate, a non-finite number or any number with |x| > 2^53−1 fails NOT_I_JSON instead of being
 *  hashed in a form another implementation may not reproduce. The number rule is stricter than I-JSON and JCS: every
 *  such double is an integer (1e21, 1.5e300). Object keys sort by UTF-16 code units (Array#sort), as JCS requires. */
const MAX_INT = Number.MAX_SAFE_INTEGER;
const jcs = (v, path) => {
  if (v === null || typeof v === 'boolean') return String(v);
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) fail('NOT_I_JSON', 'numbers must be finite', path);
    if (Math.abs(v) > MAX_INT) fail('NOT_I_JSON', 'AINDF profile: any number with |x| > 2^53−1 is refused (every such double is an integer, e.g. 1e21, 1.5e300); stricter than I-JSON/JCS', path);
    return JSON.stringify(v);
  }
  if (typeof v === 'string') {
    if (!v.isWellFormed()) fail('NOT_I_JSON', 'string has a lone surrogate', path);
    return JSON.stringify(v);
  }
  if (Array.isArray(v)) return `[${v.map((x, i) => jcs(x, `${path}[${i}]`)).join(',')}]`;
  if (isObject(v)) return `{${Object.keys(v).filter(k => v[k] !== undefined).sort().map(k => `${jcs(k, path)}:${jcs(v[k], `${path}.${k}`)}`).join(',')}}`;
  return fail('NOT_I_JSON', `${typeof v} is not a JSON value`, path);
};
export const canonicalJson = v => `${jcs(v, '$')}\n`;
export const sha256 = v => createHash('sha256').update(typeof v === 'string' || v instanceof Uint8Array ? v : canonicalJson(v)).digest('hex');
