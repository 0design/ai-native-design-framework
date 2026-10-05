import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { validateSchema } from './schema.mjs';
import { readSchema } from './schemas.mjs';
import { AindfError } from './util.mjs';
import { verifyBundle } from './bundle.mjs';
export { readSchema };
/** Reads aindf.config.json and every declared source. Throws AindfError on unreadable or schema-invalid config. */
export function loadDs(configPath) {
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  const errors = validateSchema(readSchema('0.2/config.schema.json'), config);
  if (errors.length) throw new AindfError('CONFIG_INVALID', errors.map(e => `${e.path} ${e.message}`).join('; '), configPath);
  const base = dirname(resolve(configPath));
  const sources = Object.fromEntries(Object.entries(config.sources).map(([name, rel]) => [name, JSON.parse(readFileSync(resolve(base, rel), 'utf8'))]));
  // The pinned Core an Instance extends (ds.coreBundle): read and integrity-checked here, conformance in checkDs.
  if (!config.ds.coreBundle) return { config, sources };
  const core = verifyBundle(JSON.parse(readFileSync(resolve(base, config.ds.coreBundle), 'utf8')));
  return { config, sources, core };
}
