// AINDF-DS-29/30 · Instance on Core: an Instance that names its Core bundle (ds.coreBundle) keeps every Core contract it
// reuses by name, so a screen written for the Core role admits against the Instance unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, cpSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadDs, checkDs, createBundle, coreConformance } from '../src/index.mjs';
import { sha256, KIT_VERSION } from '../src/util.mjs';

const tiny = new URL('./fixtures/tiny-ds/', import.meta.url).pathname;
const core = createBundle(loadDs(join(tiny, 'aindf.config.json')));
const pin = `${core.ds.id}@${core.ds.version}`;
const instanceConfig = { conformsTo: 'aindf@0.2', ds: { id: 'inst', version: '0.1.0', core: pin, coreBundle: 'core.bundle.json', coreBundleSha256: core.bundleSha256 }, implementation: { framework: 'next-app', module: '@inst/ds' } };
// The Instance reuses the Core contracts as they are; every negative below changes one of them.
const components = () => structuredClone(core.sources.components);
const codes = cs => coreConformance(instanceConfig, cs, core).map(e => `${e.code} ${e.path}`);

test('[AINDF-DS-30] an Instance that keeps the Core contracts (and adds an optional prop and an enum value) conforms', () => {
  const cs = components();
  const hero = cs.components.find(c => c.name === 'Hero');
  hero.props.tone.values.push('quiet');
  hero.props.align = { type: 'enum', values: ['start', 'center'] };
  assert.deepEqual(codes(cs), []);
});

test('[AINDF-DS-30] negatives: a dropped prop, another type, required-ness changed either way, a dropped enum value or slot, a new required prop, a narrowed binding allowlist or maxLength', () => {
  const cases = [
    ['dropped Core prop', cs => { delete cs.components.find(c => c.name === 'Heading').props.text; }, 'CORE_CONFORMANCE components.Heading.props.text'],
    ['another type', cs => { cs.components.find(c => c.name === 'Heading').props.text.type = 'richText'; }, 'CORE_CONFORMANCE components.Heading.props.text'],
    ['Core-required made optional', cs => { delete cs.components.find(c => c.name === 'Cta').props.label.required; }, 'CORE_CONFORMANCE components.Cta.props.label'],
    ['Core-optional made required', cs => { cs.components.find(c => c.name === 'Hero').props.tone.required = true; }, 'CORE_CONFORMANCE components.Hero.props.tone'],
    ['dropped enum value', cs => { cs.components.find(c => c.name === 'Hero').props.tone.values = ['calm']; }, 'CORE_CONFORMANCE components.Hero.props.tone'],
    ['dropped slot prop', cs => { delete cs.components.find(c => c.name === 'Page').slotProps.banner; }, 'CORE_CONFORMANCE components.Page.slotProps.banner'],
    ['new required prop', cs => { cs.components.find(c => c.name === 'Heading').props.level = { type: 'enum', values: ['1', '2'], required: true }; }, 'CORE_CONFORMANCE components.Heading.props.level'],
    // review of #2 (G2/G3): narrowing a binding allowlist or a limit drops values a Core screen may set
    ['binding allowlist narrowed', cs => { cs.components.find(c => c.name === 'Cta').props.action.bindings = ['other']; }, 'CORE_CONFORMANCE components.Cta.props.action'],
    ['maxLength tighter', cs => { cs.components.find(c => c.name === 'Heading').props.text.maxLength = 5; }, 'CORE_CONFORMANCE components.Heading.props.text'],
    ['maxLength added where Core has the default', cs => { cs.components.find(c => c.name === 'Cta').props.label.maxLength = 10; }, 'CORE_CONFORMANCE components.Cta.props.label'],
  ];
  for (const [why, mutate, want] of cases) { const cs = components(); mutate(cs); assert.ok(codes(cs).includes(want), `${why}: ${codes(cs)}`); }
});

test('[AINDF-DS-29] negative: a Core bundle that is not the pinned ds.core fails before any contract is compared', () => {
  const errs = coreConformance({ ...instanceConfig, ds: { ...instanceConfig.ds, core: 'tiny@2.0.0' } }, components(), core);
  assert.deepEqual(errs.map(e => e.code), ['CORE_PIN']);
});

test('[AINDF-DS-29/30] end to end: loadDs reads ds.coreBundle (integrity-checked), checkDs reports Core conformance, a tampered bundle is refused', () => {
  const dir = mkdtempSync(join(tmpdir(), 'aindf-core-'));
  try {
    cpSync(tiny, dir, { recursive: true });
    writeFileSync(join(dir, 'core.bundle.json'), JSON.stringify(core));
    const cfg = JSON.parse(readFileSync(join(dir, 'aindf.config.json'), 'utf8'));
    writeFileSync(join(dir, 'aindf.config.json'), JSON.stringify({ ...cfg, ds: { id: 'inst', version: '0.1.0', core: pin, coreBundle: 'core.bundle.json', coreBundleSha256: core.bundleSha256 } }));
    assert.deepEqual(checkDs(loadDs(join(dir, 'aindf.config.json'))), []);
    const cs = JSON.parse(readFileSync(join(dir, 'components.json'), 'utf8'));
    delete cs.components.find(c => c.name === 'Heading').props.text.required;
    writeFileSync(join(dir, 'components.json'), JSON.stringify(cs));
    assert.deepEqual(checkDs(loadDs(join(dir, 'aindf.config.json'))).map(e => e.code), ['CORE_CONFORMANCE']);
    writeFileSync(join(dir, 'core.bundle.json'), JSON.stringify({ ...core, ds: { ...core.ds, version: '9.9.9' } }));
    assert.throws(() => loadDs(join(dir, 'aindf.config.json')), /BUNDLE_INTEGRITY/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('[AINDF-DS-30] limits and lists: tighter item counts, number range, a dropped mark or inline component, another link pattern fail; looser ones pass', () => {
  const coreLike = { ds: core.ds, sources: { components: { components: [{ name: 'Rich', export: 'Rich', props: {
    items: { type: 'textList', minItems: 1, maxItems: 5 }, size: { type: 'number', minimum: 0, maximum: 10 },
    body: { type: 'richText', marks: ['strong', 'link'], inlineComponents: ['Badge'], hrefPattern: '^/' } } }] } } };
  const inst = props => ({ components: [{ name: 'Rich', export: 'Rich', props }] });
  const ok = { items: { type: 'textList', minItems: 0, maxItems: 9 }, size: { type: 'number', minimum: -1, maximum: 20 },
    body: { type: 'richText', marks: ['strong', 'link', 'code'], inlineComponents: ['Badge', 'Chip'], hrefPattern: '^/' } };
  assert.deepEqual(coreConformance(instanceConfig, inst(ok), coreLike), []);
  for (const [why, mutate] of [
    ['minItems tighter', p => { p.items.minItems = 2; }], ['maxItems tighter', p => { p.items.maxItems = 3; }],
    ['minimum tighter', p => { p.size.minimum = 1; }], ['maximum tighter', p => { p.size.maximum = 9; }],
    ['mark dropped', p => { p.body.marks = ['strong']; }], ['inline component dropped', p => { p.body.inlineComponents = []; }],
    ['another link pattern', p => { p.body.hrefPattern = '^https://'; }],
  ]) { const p = structuredClone(ok); mutate(p); assert.equal(coreConformance(instanceConfig, inst(p), coreLike).length, 1, why); }
});

test('[AINDF-DS-29] review of #2 (G1): a Core bundle with the same id@version but other contracts, resealed, is refused on load; coreBundle without its hash is a config error', () => {
  const dir = mkdtempSync(join(tmpdir(), 'aindf-core-pin-'));
  try {
    cpSync(tiny, dir, { recursive: true });
    const { bundleSha256, ...unsigned } = core;
    const other = structuredClone(unsigned);
    delete other.sources.components.components.find(c => c.name === 'Hero').props.tone;
    writeFileSync(join(dir, 'core.bundle.json'), JSON.stringify({ ...other, bundleSha256: sha256(other) })); // self-consistent
    const cfg = JSON.parse(readFileSync(join(dir, 'aindf.config.json'), 'utf8'));
    writeFileSync(join(dir, 'aindf.config.json'), JSON.stringify({ ...cfg, ds: { id: 'inst', version: '0.1.0', core: pin, coreBundle: 'core.bundle.json', coreBundleSha256: core.bundleSha256 } }));
    assert.throws(() => loadDs(join(dir, 'aindf.config.json')), /CORE_PIN/);
    writeFileSync(join(dir, 'aindf.config.json'), JSON.stringify({ ...cfg, ds: { id: 'inst', version: '0.1.0', core: pin, coreBundle: 'core.bundle.json' } }));
    assert.throws(() => loadDs(join(dir, 'aindf.config.json')), /CONFIG_INVALID/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the kit reports its package version (receipts and the MCP)', async () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(KIT_VERSION, pkg.version);
});

// review of #2 (G4): the role's place in a screen — each negative is one a Core screen would hit on admission
// (NOT_A_TEMPLATE, ROUTE_PARAMS_UNAVAILABLE, LAYER_MISMATCH, UNKNOWN_SLOT, SLOT_CARDINALITY) while checkDs stayed silent
const placement = () => ({ components: structuredClone(core.sources.components), taxonomy: structuredClone(core.sources.taxonomy), slots: structuredClone(core.sources.slots), bindings: structuredClone(core.sources.bindings) });
const placementCodes = ({ components, taxonomy, slots, bindings }) => coreConformance(instanceConfig, components, core, { taxonomy, slots, bindings }).map(e => `${e.code} ${e.path}`);

test('[AINDF-DS-30] placement kept: same template/routeParams/layer/slots, or a looser slot cardinality, conforms', () => {
  assert.deepEqual(placementCodes(placement()), []);
  const p = placement();
  p.slots.slotsets.find(s => s.component === 'Hero').slots.find(s => s.name === 'title').cardinality = '0..*';
  assert.deepEqual(placementCodes(p), []);
});

test('[AINDF-DS-30] placement negatives: template dropped, routeParams added, another layer, a Core slot dropped, a tighter cardinality', () => {
  const cases = [
    ['template dropped', p => { delete p.components.components.find(c => c.name === 'Page').template; }, 'CORE_CONFORMANCE components.Page.template'],
    ['routeParams added', p => { p.components.components.find(c => c.name === 'Hero').routeParams = true; }, 'CORE_CONFORMANCE components.Hero.routeParams'],
    ['another layer', p => { p.taxonomy.components.find(c => c.name === 'Hero').layer = 'blocks'; }, 'CORE_CONFORMANCE taxonomy.Hero.layer'],
    ['Core slot dropped', p => { const h = p.slots.slotsets.find(s => s.component === 'Hero'); h.slots = h.slots.filter(s => s.name !== 'actions'); }, 'CORE_CONFORMANCE slots.Hero.actions'],
    ['min cardinality raised', p => { p.slots.slotsets.find(s => s.component === 'Hero').slots.find(s => s.name === 'actions').cardinality = '1..*'; }, 'CORE_CONFORMANCE slots.Hero.actions'],
    ['max cardinality lowered', p => { p.slots.slotsets.find(s => s.component === 'Hero').slots.find(s => s.name === 'actions').cardinality = '0..2'; }, 'CORE_CONFORMANCE slots.Hero.actions'],
  ];
  for (const [why, mutate, want] of cases) { const p = placement(); mutate(p); assert.deepEqual(placementCodes(p), [want], why); }
});

test('[AINDF-DS-30] end to end: checkDs passes the Instance components, taxonomy, slots and bindings — a change in each fails CORE_CONFORMANCE via loadDs', () => {
  const dir = mkdtempSync(join(tmpdir(), 'aindf-core-g4-'));
  try {
    cpSync(tiny, dir, { recursive: true });
    writeFileSync(join(dir, 'core.bundle.json'), JSON.stringify(core));
    const cfg = JSON.parse(readFileSync(join(dir, 'aindf.config.json'), 'utf8'));
    writeFileSync(join(dir, 'aindf.config.json'), JSON.stringify({ ...cfg, ds: { id: 'inst', version: '0.1.0', core: pin, coreBundle: 'core.bundle.json', coreBundleSha256: core.bundleSha256 } }));
    const original = Object.fromEntries(['components', 'taxonomy', 'slots', 'bindings'].map(f => [f, readFileSync(join(dir, `${f}.json`), 'utf8')]));
    const cases = [
      ['template dropped', 'components', j => { delete j.components.find(c => c.name === 'Page').template; }, 'components.Page.template'],
      ['another layer', 'taxonomy', j => { j.components.find(c => c.name === 'Heading').layer = 'atoms'; }, 'taxonomy.Heading.layer'],
      ['new required slot', 'slots', j => { j.slotsets.find(s => s.component === 'Hero').slots.push({ name: 'media', accepts: { layers: ['elements'] }, cardinality: '1..1' }); }, 'slots.Hero.media'],
      ['binding dropped', 'bindings', j => { j.bindings = j.bindings.filter(b => b.name !== 'signup'); }, 'bindings.signup'],
    ];
    for (const [why, file, mutate, path] of cases) {
      for (const [f, text] of Object.entries(original)) writeFileSync(join(dir, `${f}.json`), text);
      const j = JSON.parse(original[file]); mutate(j); writeFileSync(join(dir, `${file}.json`), JSON.stringify(j));
      const errs = checkDs(loadDs(join(dir, 'aindf.config.json')));
      assert.ok(errs.some(e => e.code === 'CORE_CONFORMANCE' && e.path === path), `${why}: ${errs.map(e => `${e.code} ${e.path}`)}`);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// review of #3 (G5/G6/G7): each negative is one a Core screen would hit on admission (SLOT_CARDINALITY, UNKNOWN_COMPONENT,
// UNKNOWN_BINDING) while checkDs stayed silent
test('[AINDF-DS-30] new slots: an optional new slot conforms; a required one fails', () => {
  const p = placement();
  const hero = p.slots.slotsets.find(s => s.component === 'Hero').slots;
  hero.push({ name: 'media', accepts: { layers: ['elements'] }, cardinality: '0..1' });
  assert.deepEqual(placementCodes(p), []);
  hero.at(-1).cardinality = '1..*';
  assert.deepEqual(placementCodes(p), ['CORE_CONFORMANCE slots.Hero.media']);
});

test('[AINDF-DS-30] Core components and bindings: an added component or binding conforms; a dropped one fails', () => {
  const p = placement();
  p.bindings.bindings.push({ name: 'extra', kind: 'action', description: 'x' });
  assert.deepEqual(placementCodes(p), []);
  const cases = [
    ['component dropped', p => { p.components.components = p.components.components.filter(c => c.name !== 'Cta'); }, ['CORE_CONFORMANCE components.Cta']],
    ['component dropped from taxonomy', p => { p.taxonomy.components = p.taxonomy.components.filter(c => c.name !== 'Cta'); }, ['CORE_CONFORMANCE taxonomy.Cta']],
    ['binding dropped', p => { p.bindings.bindings = []; }, ['CORE_CONFORMANCE bindings.signup']],
  ];
  for (const [why, mutate, want] of cases) { const q = placement(); mutate(q); assert.deepEqual(placementCodes(q), want, why); }
});

// review of #4 (G8): admission reads a binding's kind only for $.params (params) and $.meta (data)
test('[AINDF-DS-30] binding kinds: a params or data binding keeps its kind; an action binding (named by props) may change it', () => {
  const kinded = { ...core, sources: { ...core.sources, bindings: { aindfVersion: '0.2', bindings: [
    { name: 'signup', kind: 'action', description: 'open signup' }, { name: 'slug', kind: 'params', description: 'route' }, { name: 'page', kind: 'data', description: 'meta' }] } } };
  const run = mutate => { const p = placement(); p.bindings = structuredClone(kinded.sources.bindings); mutate(p.bindings.bindings); return coreConformance(instanceConfig, p.components, kinded, p).map(e => `${e.path} ${e.message}`); };
  assert.deepEqual(run(() => {}), []);
  assert.deepEqual(run(bs => { bs[0].kind = 'data'; }), [], 'action -> data: props match by name');
  assert.deepEqual(run(bs => { bs[1].kind = 'data'; }), ['bindings.slug kind data, Core has params (screens use it as $.params)']);
  assert.deepEqual(run(bs => { bs[2].kind = 'action'; }), ['bindings.page kind action, Core has data (screens use it as $.meta)']);
  assert.match(run(bs => { bs.splice(1, 1); }).join(), /bindings\.slug Core .* declares this binding \(params\)/);
});

test('[AINDF-DS-30] without the 4th argument: props, template, routeParams and the Core component list are still checked; layer, slots and bindings are not', () => {
  const p = placement();
  delete p.components.components.find(c => c.name === 'Page').template;
  p.components.components.find(c => c.name === 'Hero').routeParams = true;
  p.components.components = p.components.components.filter(c => c.name !== 'Cta');
  assert.deepEqual(coreConformance(instanceConfig, p.components, core).map(e => e.path).sort(), ['components.Cta', 'components.Hero.routeParams', 'components.Page.template']);
  const q = placement();
  q.taxonomy.components.find(c => c.name === 'Hero').layer = 'blocks';
  q.bindings.bindings = [];
  assert.deepEqual(coreConformance(instanceConfig, q.components, core), []);
});
