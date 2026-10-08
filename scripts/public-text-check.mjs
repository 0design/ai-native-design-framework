#!/usr/bin/env node
// Public-text check: this repository is public, so its text must describe the code and nothing about how the work is
// organized. Refuses internal process wording with file:line (or PR field / commit).
//   node scripts/public-text-check.mjs --tree                    scan every tracked file (push to main)
//   node scripts/public-text-check.mjs --pr <base> <head>        PR title and body (from the event file or env), added
//                                                                diff lines and commit messages in base..head
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

export const PATTERNS = [
  [/\bowner(?:'s|’s)?\s+(?:ok|okay|decision|approved?|approval|yes)\b|\b(?:needs?|waits? for|after)\s+the\s+owner(?:'s|’s)?\b|\bset by the owner\b|\bchosen by the owner\b/i, 'owner decision / approval'],
  [/\bapproved by\b/i, 'approval wording'],
  [/Рішення\s+Олега|Олег/u, 'name or decision of a person (Cyrillic)'],
  [/\bквіз\s*\d+/iu, 'quiz number'],
  [/\b0D-\d+/, 'internal issue id'],
  [/linear\.app/i, 'internal tracker link'],
  [/\bplan\s+step\b|\bplugin\s+plan\b/i, 'plan step'],
  [/\breview\s+round\b/i, 'review round'],
  [/\bREPORT\b/, 'report marker'],
  [/\bDELIVERY-\d/, 'process id'],
  [/\b(?:coordinator|orchestrator)\b/i, 'process role'],
  [/\bdraft\s+for\b[^\n]{0,40}\breview\b/i, 'draft-for-review marker'],
  [/\bdo not merge\b|не\s+мерж/iu, 'merge instruction'],
];
// Text that is legitimate although it looks close: the author and brand, the license line, a yaml `owner:` key.
export const ALLOW = [/Oleg\.Design/g, /design\.oleg/g, /Copyright \(c\) \d{4} Oleg Kukharuk/g, /^\s*owner:/gm];
// This tool names the patterns, so it and its tests are not scanned.
export const SKIP_PATHS = [/^scripts\/public-text-check\.mjs$/, /^scripts\/test\/public-text-check\.test\.mjs$/, /\.bundle\.json$/, /^docs\/media\//];

export function violations(text) {
  let clean = text;
  for (const a of ALLOW) clean = clean.replace(a, m => ' '.repeat(m.length));
  const out = [];
  clean.split('\n').forEach((line, i) => {
    for (const [re, why] of PATTERNS) { const m = line.match(re); if (m) out.push({ line: i + 1, why, match: m[0] }); }
  });
  return out;
}

const git = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
const found = [];
const report = (where, vs) => { for (const v of vs) found.push(`${where}${v.line ? `:${v.line}` : ''}  ${v.why}: "${v.match}"`); };

export function scanTree() {
  for (const f of git('ls-files', '-z').split('\0').filter(Boolean)) {
    if (SKIP_PATHS.some(re => re.test(f))) continue;
    let text; try { text = readFileSync(f, 'utf8'); } catch { continue; }
    if (text.includes('\0')) continue;
    report(f, violations(text));
  }
}

export function scanPr(base, head) {
  const ev = process.env.GITHUB_EVENT_PATH ? JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')).pull_request : null;
  const title = ev?.title ?? process.env.PR_TITLE ?? '', body = ev?.body ?? process.env.PR_BODY ?? '';
  report('PR title', violations(title).map(v => ({ ...v, line: 0 })));
  report('PR description', violations(body));
  for (const c of git('log', '--no-merges', '--format=%H%x00%B%x01', `${base}..${head}`).split('\x01').map(s => s.trim()).filter(Boolean)) {
    const [sha, msg] = c.split('\0');
    report(`commit ${sha.slice(0, 8)}`, violations(msg ?? ''));
  }
  let file = null, n = 0;
  for (const l of git('diff', '--unified=0', '--no-color', `${base}...${head}`).split('\n')) {
    if (l.startsWith('+++ ')) { file = l.slice(6) === '/dev/null' ? null : l.slice(6); continue; }
    const h = l.match(/^@@ -\S+ \+(\d+)/); if (h) { n = Number(h[1]); continue; }
    if (l.startsWith('+') && file && !SKIP_PATHS.some(re => re.test(file))) { for (const v of violations(l.slice(1))) report(file, [{ ...v, line: n }]); n++; }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [mode, base, head] = process.argv.slice(2);
  if (mode === '--tree') scanTree(); else if (mode === '--pr' && base && head) scanPr(base, head);
  else { console.error('usage: public-text-check.mjs --tree | --pr <base> <head>'); process.exit(2); }
  if (found.length) { console.error(`public-text-check: ${found.length} hit(s)\n${found.join('\n')}`); process.exit(1); }
  console.log('public-text-check: PASS');
}
