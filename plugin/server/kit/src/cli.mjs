#!/usr/bin/env node
// aindf <check|bundle|build|mcp> — the whole kit behind one command.
import { readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { loadDs, checkDs, createBundle, buildScreens, repinScreens, createDsMcp, verifyBundle } from './index.mjs';
const [command, ...rest] = process.argv.slice(2);
const flag = name => { const i = rest.indexOf(`--${name}`); return i >= 0 ? rest[i + 1] : undefined; };
const usage = 'usage: aindf check <aindf.config.json> | bundle <config> --out <bundle.json> | build <config> --screens <dir> --app <dir> [--check] [--receipts <file>] | repin <config> --screens <dir> | mcp <bundle.json>';
try {
  if (command === 'check') {
    const errors = checkDs(loadDs(rest[0]));
    for (const e of errors) console.error(`${e.code} ${e.path} ${e.message}`);
    console.log(errors.length ? `aindf check: FAIL (${errors.length})` : 'aindf check: PASS'); process.exitCode = errors.length ? 1 : 0;
  } else if (command === 'bundle') {
    const bundle = createBundle(loadDs(rest[0]));
    writeFileSync(flag('out'), JSON.stringify(bundle, null, 2) + '\n');
    console.log(`aindf bundle: ${bundle.ds.id}@${bundle.ds.version} ${bundle.bundleSha256}`);
  } else if (command === 'build') {
    const { bundle, receipts } = buildScreens({ configPath: rest[0], screensDir: flag('screens'), appDir: flag('app'), check: rest.includes('--check') });
    if (flag('receipts')) writeFileSync(flag('receipts'), JSON.stringify({ bundle: bundle.bundleSha256, receipts }, null, 2) + '\n');
    console.log(`aindf build${rest.includes('--check') ? ' --check' : ''}: PASS ${receipts.length} screen(s), DS ${bundle.ds.id}@${bundle.ds.version} ${bundle.bundleSha256.slice(0, 12)}`);
  } else if (command === 'repin') {
    const { pin, results } = repinScreens({ configPath: rest[0], screensDir: flag('screens') });
    for (const r of results) console.log(`${r.ok ? 'ok' : 'REJECTED'} ${r.screen}${r.ok ? '' : ' ' + r.errors.map(e => `${e.code} ${e.path}`).join('; ')}`);
    console.log(`aindf repin: ${pin.id}@${pin.version} ${pin.bundleSha256.slice(0, 12)}`); process.exitCode = results.every(r => r.ok) ? 0 : 1;
  } else if (command === 'mcp') {
    const handle = createDsMcp(verifyBundle(JSON.parse(readFileSync(rest[0], 'utf8'))));
    for await (const line of createInterface({ input: process.stdin })) {
      if (!line.trim()) continue;
      let reply; try { reply = await handle(JSON.parse(line)); } catch { reply = { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }; }
      if (reply) process.stdout.write(JSON.stringify(reply) + '\n');
    }
  } else { console.error(usage); process.exitCode = 2; }
} catch (error) { console.error(error.code ? `aindf ${command}: FAIL ${error.message}` : error.stack); process.exitCode = 1; }
