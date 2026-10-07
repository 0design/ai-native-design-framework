import { checkDs } from './check.mjs';
import { AindfError, sha256 } from './util.mjs';
/** Immutable, content-addressed DS revision: what the MCP serves and what screens pin. Refuses a non-conformant DS. */
export function createBundle(ds) {
  const errors = checkDs(ds);
  if (errors.length) throw new AindfError('DS_NOT_CONFORMANT', errors.map(e => `${e.code} ${e.path} ${e.message}`).join('; '));
  const { config, sources } = ds;
  const unsigned = { kind: 'aindf.ds-bundle', conformsTo: config.conformsTo, ds: config.ds, implementation: config.implementation, sources };
  return { ...unsigned, bundleSha256: sha256(unsigned) };
}
export function verifyBundle(bundle) {
  const { bundleSha256, ...unsigned } = bundle;
  if (bundle?.kind !== 'aindf.ds-bundle' || sha256(unsigned) !== bundleSha256) throw new AindfError('BUNDLE_INTEGRITY', 'bundle bytes do not match bundleSha256');
  return bundle;
}
export const bundlePin = b => ({ id: b.ds.id, version: b.ds.version, bundleSha256: b.bundleSha256 });
