// Canonical JSON = RFC 8785 (JCS) + one trailing "\n"; bundleSha256 is the sha256 of it. A fixed vector so that an
// implementation in another language can check itself, and the I-JSON values that must be refused.
import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalJson, sha256 } from '../src/util.mjs';
import { createBundle, verifyBundle, loadDs } from '../src/index.mjs';

// keys by UTF-16 code units (😀 before ﬀ, unlike code-point order; "10" before "9", unlike engine integer-key order),
// unescaped UTF-8, JSON escapes for U+0000–U+001F only (U+007F and U+2028 raw), ECMAScript numbers
const input = { 'ﬀ': 'fb00 key', '😀': 'astral key', 'é': 'héllo — ü', 9: 'nine', 10: 'ten', a: [1.5, 1e-7, 5e-324, 2, -0, 0.1, 9007199254740991], z: { y: true, x: null }, s: 'tab\tquote" back\\ nl\n ctl\u0001 del\u007f ls ' };
const expected = '{"10":"ten","9":"nine","a":[1.5,1e-7,5e-324,2,0,0.1,9007199254740991],"s":"tab\\tquote\\" back\\\\ nl\\n ctl\\u0001 del\u007f ls ","z":{"x":null,"y":true},"é":"héllo — ü","😀":"astral key","ﬀ":"fb00 key"}\n';
const EXPECTED_SHA256 = 'a937eb5e9720b273b5b8993ef7d054a463d301636ac0a2d782724b47be61c472';

test('canonical JSON: the RFC 8785 test vector with a trailing newline, and its fixed sha256', () => {
  assert.equal(canonicalJson(input), expected);
  assert.equal(sha256(input), EXPECTED_SHA256);
  assert.equal(sha256(expected), EXPECTED_SHA256, 'the hash is over the canonical UTF-8 bytes');
});

test('canonical JSON refuses values outside I-JSON with NOT_I_JSON and a path', () => {
  for (const [why, value, path] of [
    ['lone surrogate in a value', { a: ['ok', '\ud800'] }, '$.a[1]'],
    ['lone surrogate in a key', { '\udc00': 1 }, '$'],
    ['non-finite number (JSON 1E400 parses to Infinity)', { n: JSON.parse('1E400') }, '$.n'],
    ['NaN', [NaN], '$[0]'],
    ['integer beyond 2^53 − 1 (9007199254740993 parses rounded)', { n: JSON.parse('9007199254740993') }, '$.n'],
    ['1e21 is an integer beyond 2^53 − 1', [1e21], '$[0]'],
    ['1.5e300: every number with |x| > 2^53 − 1 (AINDF profile)', [-1.5e300], '$[0]'],
  ]) assert.throws(() => canonicalJson(value), e => e.code === 'NOT_I_JSON' && e.path === path, why);
});

test('a bundle with integer-like keys hashes in JCS key order (review of #9)', () => {
  const ds = loadDs(new URL('./fixtures/tiny-ds/aindf.config.json', import.meta.url).pathname);
  // a bad example with integer-like (unknown) prop names: legitimate, admission refuses it, so the DS stays conformant
  ds.sources.components.components.find(c => c.name === 'Hero').examples = { bad: [{ 10: 1, 9: 2 }] };
  const bundle = createBundle(ds);
  assert.match(canonicalJson(bundle.sources.components), /"bad":\[\{"10":1,"9":2\}\]/);
  assert.equal(verifyBundle(JSON.parse(JSON.stringify(bundle))).bundleSha256, bundle.bundleSha256);
});
