#!/usr/bin/env node
// The plugin's MCP server: `aindf mcp` over stdio, read-only (no staging), for one design-system bundle.
// argv[2] is the bundle path from the plugin setting `bundlePath`. Empty (or exactly `${user_config.bundlePath}`, left
// unexpanded) means the demo design
// system shipped with the plugin. A relative path is resolved against the directory the agent started the server in.
// Status lines go to stderr; stdout carries only MCP messages.
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createDsMcp, verifyBundle } from './kit/src/index.mjs';

const given = (process.argv[2] ?? '').trim();
const UNSET = '${user_config.bundlePath}'; // the literal a client leaves when it does not expand the setting
const demo = fileURLToPath(new URL('../demo/aindf-demo.bundle.json', import.meta.url));
if (given.includes('${') && given !== UNSET) { console.error(`aindf: bundlePath is an unexpanded placeholder (${given}); set it to a file path or leave it empty`); process.exit(1); }
const path = !given || given === UNSET ? demo : resolve(given);
let handle;
try {
  const bundle = verifyBundle(JSON.parse(readFileSync(path, 'utf8')));
  handle = createDsMcp(bundle);
  console.error(`aindf: serving ${bundle.ds.id}@${bundle.ds.version} (${bundle.bundleSha256.slice(0, 12)}) from ${path === demo ? 'the demo bundle' : path}, read-only`);
} catch (error) {
  console.error(`aindf: cannot serve ${path}: ${error.code ?? ''} ${error.message}`.trim());
  process.exit(1);
}
for await (const line of createInterface({ input: process.stdin })) {
  if (!line.trim()) continue;
  let message;
  try { message = JSON.parse(line); } catch { process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }) + '\n'); continue; }
  let reply;
  try { reply = await handle(message); } catch { reply = { jsonrpc: '2.0', id: message?.id ?? null, error: { code: -32603, message: 'Internal error' } }; }
  if (reply) process.stdout.write(JSON.stringify(reply) + '\n');
}
