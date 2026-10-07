import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { loadDs } from './load.mjs';
import { createBundle } from './bundle.mjs';
import { generateNextPage, pageFileForRoute, GENERATED_MARK } from './codegen-next.mjs';
import { admitScreen } from './admit.mjs';
import { AindfError, KIT_VERSION, sha256 } from './util.mjs';
/**
 * Trusted builder step: DS → bundle; every *.screen.json → admission → generated page; receipts.
 * check=true writes nothing and fails when any generated page is missing or differs (manual edit, stale spec, DS change).
 * Also fails when a generated page exists for a route that no screen owns anymore.
 */
export function buildScreens({ configPath, screensDir, appDir, check = false, root = process.cwd() }) {
  const bundle = createBundle(loadDs(configPath));
  const receipts = [];
  const owned = new Set();
  const routes = new Set();
  for (const name of readdirSync(screensDir).filter(f => f.endsWith('.screen.json')).sort()) {
    const path = join(screensDir, name);
    const bytes = readFileSync(path);
    const screen = JSON.parse(bytes.toString('utf8'));
    if (routes.has(screen.route)) throw new AindfError('DUPLICATE_ROUTE', screen.route, path);
    routes.add(screen.route);
    const out = join(appDir, pageFileForRoute(screen.route));
    owned.add(out);
    const code = generateNextPage(bundle, screen, { screenPath: relative(root, path), screenBytes: bytes });
    if (check) {
      if (!existsSync(out)) throw new AindfError('GENERATED_MISSING', `run aindf build for ${screen.route}`, relative(root, out));
      if (readFileSync(out, 'utf8') !== code) throw new AindfError('GENERATED_DRIFT', 'generated page differs from its screen + DS bundle (manual edit or stale build)', relative(root, out));
    } else { mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, code); }
    receipts.push({ kind: 'aindf.receipt', screen: { path: relative(root, path), sha256: sha256(bytes), route: screen.route }, ds: { id: bundle.ds.id, version: bundle.ds.version, bundleSha256: bundle.bundleSha256 }, output: { path: relative(root, out), sha256: sha256(code) }, builder: { kit: KIT_VERSION, node: process.version }, state: 'built' });
  }
  for (const file of readdirSync(appDir, { recursive: true }).map(f => join(appDir, f)).filter(f => /page\.tsx$/.test(f)))
    if (!owned.has(file) && readFileSync(file, 'utf8').startsWith(GENERATED_MARK)) throw new AindfError('ORPHAN_GENERATED', 'generated page without a screen', relative(root, file));
  return { bundle, receipts };
}

/**
 * DS maintainer step after a DS release: move every screen to the new bundle pin, but only when the screen still
 * passes admission against it. A screen that no longer fits is reported, never silently rewritten.
 */
export function repinScreens({ configPath, screensDir }) {
  const bundle = createBundle(loadDs(configPath));
  const pin = { id: bundle.ds.id, version: bundle.ds.version, bundleSha256: bundle.bundleSha256 };
  const results = [];
  for (const name of readdirSync(screensDir).filter(f => f.endsWith('.screen.json')).sort()) {
    const path = join(screensDir, name);
    const screen = JSON.parse(readFileSync(path, 'utf8'));
    const next = { ...screen, ds: pin };
    const admitted = admitScreen(bundle, next);
    if (admitted.ok) { if (JSON.stringify(screen.ds) !== JSON.stringify(pin)) writeFileSync(path, JSON.stringify(next, null, 2) + '\n'); results.push({ screen: name, ok: true }); }
    else results.push({ screen: name, ok: false, errors: admitted.errors });
  }
  return { pin, results };
}
