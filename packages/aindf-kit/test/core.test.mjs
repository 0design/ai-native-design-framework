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
