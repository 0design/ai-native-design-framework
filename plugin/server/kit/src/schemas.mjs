// All AINDF schemas as module imports, so admission and conformance run where there is no filesystem (edge Workers).
import tokens from '../schema/0.1/tokens.schema.json' with { type: 'json' };
import taxonomy from '../schema/0.1/taxonomy.schema.json' with { type: 'json' };
import slots from '../schema/0.1/slots.schema.json' with { type: 'json' };
import applicability from '../schema/0.1/applicability.schema.json' with { type: 'json' };
import presets from '../schema/0.1/presets.schema.json' with { type: 'json' };
import patterns from '../schema/0.1/patterns.schema.json' with { type: 'json' };
import config from '../schema/0.2/config.schema.json' with { type: 'json' };
import components from '../schema/0.2/components.schema.json' with { type: 'json' };
import bindings from '../schema/0.2/bindings.schema.json' with { type: 'json' };
import screen from '../schema/0.2/screen.schema.json' with { type: 'json' };
import receipt from '../schema/0.2/receipt.schema.json' with { type: 'json' };
const SCHEMAS = { '0.1/tokens.schema.json': tokens, '0.1/taxonomy.schema.json': taxonomy, '0.1/slots.schema.json': slots, '0.1/applicability.schema.json': applicability, '0.1/presets.schema.json': presets, '0.1/patterns.schema.json': patterns, '0.2/config.schema.json': config, '0.2/components.schema.json': components, '0.2/bindings.schema.json': bindings, '0.2/screen.schema.json': screen, '0.2/receipt.schema.json': receipt };
export const readSchema = rel => { if (!SCHEMAS[rel]) throw Error(`unknown AINDF schema ${rel}`); return SCHEMAS[rel]; };
