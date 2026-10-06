// Canonical JSON = RFC 8785 (JCS) + one trailing "\n"; bundleSha256 is the sha256 of it. A fixed vector so that an
// implementation in another language can check itself: keys by UTF-16 code units (😀 before ﬀ, unlike code-point
// order), unescaped UTF-8, JSON escapes for control characters, ECMAScript numbers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalJson, sha256 } from '../src/util.mjs';

const input = { 'ﬀ': 'fb00 key', '😀': 'astral key', 'é': 'héllo — ü', a: [1.5, 1e21, 1e-7, 2, -0, 0.1], z: { y: true, x: null }, s: 'tab\tquote" back\\ nl\n ctl\u0001 ls ' };
const expected = '{"a":[1.5,1e+21,1e-7,2,0,0.1],"s":"tab\\tquote\\" back\\\\ nl\\n ctl\\u0001 ls ","z":{"x":null,"y":true},"é":"héllo — ü","😀":"astral key","ﬀ":"fb00 key"}\n';

test('canonical JSON: the RFC 8785 test vector with a trailing newline, and its fixed sha256', () => {
  assert.equal(canonicalJson(input), expected);
  assert.equal(sha256(input), '2b9c84b41c4a5a8969ad5630fae1302862dc824552ddbef65c289f4a3b2871bf');
  assert.equal(sha256(expected), sha256(input), 'the hash is over the canonical UTF-8 bytes');
});
