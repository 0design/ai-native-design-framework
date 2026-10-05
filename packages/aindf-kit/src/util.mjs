import { createHash } from 'node:crypto';
export const KIT_VERSION = '0.2.0-pilot.2';
export class AindfError extends Error {
  constructor(code, message, path = '$') { super(`${code} ${path}: ${message}`); this.name = 'AindfError'; this.code = code; this.path = path; }
}
export const fail = (code, message, path) => { throw new AindfError(code, message, path); };
export const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);
export const canonicalize = v => Array.isArray(v) ? v.map(canonicalize) : isObject(v) ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canonicalize(v[k])])) : v;
export const canonicalJson = v => `${JSON.stringify(canonicalize(v))}\n`;
export const sha256 = v => createHash('sha256').update(typeof v === 'string' || v instanceof Uint8Array ? v : canonicalJson(v)).digest('hex');
