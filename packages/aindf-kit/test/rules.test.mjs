import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
test('every error code the kit can emit has a stable rule ID in RULES.md, and IDs are unique', () => {
  const rules = readFileSync(new URL('../RULES.md', import.meta.url), 'utf8');
  const listed = new Map([...rules.matchAll(/\| (AINDF-[A-Z]+-\d{2}) \| `([A-Z_]+)` \|/g)].map(m => [m[2], m[1]]));
  const ids = [...rules.matchAll(/\| (AINDF-[A-Z]+-\d{2}) \|/g)].map(m => m[1]);
  assert.equal(new Set(ids).size, ids.length, 'duplicate rule IDs');
  const emitted = new Set();
  for (const f of readdirSync(new URL('../src/', import.meta.url))) {
    const src = readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8');
    for (const m of src.matchAll(/(?:err|fail|toolError)\('([A-Z_]+)'|new AindfError\('([A-Z_]+)'|\? '([A-Z_]+)' : '([A-Z_]+)'/g)) for (const c of m.slice(1)) if (c) emitted.add(c);
  }
  const missing = [...emitted].filter(c => !listed.has(c));
  assert.deepEqual(missing, [], `codes without a rule ID: ${missing}`);
  assert.ok(emitted.size >= 50);
});
