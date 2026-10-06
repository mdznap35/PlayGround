#!/usr/bin/env node
/* NOVA quality gates — fast, dependency-free, rerunnable via `npm run gates`.
   FAILS (exit 1): secrets, non-allowlisted remote URLs in shipped code,
   missing referenced assets, secret-looking .env.example values.
   WARNS (exit 0): unreferenced-but-shipped assets, missing dist/.
   Content/schema rules live in vitest (validateContent), not here. */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
let fails = 0;
let warns = 0;
const fail = (m) => { fails++; console.log(`FAIL  ${m}`); };
const warn = (m) => { warns++; console.log(`warn  ${m}`); };
const ok = (m) => console.log(`ok    ${m}`);

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { if (!['node_modules', '.git', 'dist'].includes(e.name)) walk(p, out); }
    else out.push(p);
  }
  return out;
}

// ---- 1. secrets ----
const SECRET_RES = [
  /sk-(live|test)-[A-Za-z0-9]{8,}/,
  /AKIA[0-9A-Z]{16}/,
  /gh[pousr]_[A-Za-z0-9]{8,}/,
  /gsk_[A-Za-z0-9]{8,}/,
  /xox[bap]-[A-Za-z0-9-]+/,
  /AIza[0-9A-Za-z_-]{20,}/,
  /-----BEGIN .*PRIVATE KEY-----/,
  /[A-Za-z0-9_-]{32,}\.[A-Za-z0-9_-]{32,}\.[A-Za-z0-9_-]{16,}/, // jwt-shaped
];
{
  const files = walk(ROOT).filter((f) => ['.ts', '.js', '.mjs', '.html', '.css', '.json', '.md', '.example', '.txt'].includes(extname(f)));
  let hits = 0;
  for (const f of files) {
    if (f.includes('quality-gates') || f.includes('final-autonomous-report')) continue; // this file documents patterns
    let text = '';
    try { text = readFileSync(f, 'utf8'); } catch { continue; }
    for (const re of SECRET_RES) {
      const m = text.match(re);
      if (m) { fail(`possible secret in ${f.replace(ROOT + '/', '')}: ${m[0].slice(0, 24)}…`); hits++; break; }
    }
  }
  if (!hits) ok('no secrets in repo (src/docs/scripts/public/.env.example)');
}

// ---- 2. remote URLs in shipped code ----
const URL_ALLOW = [
  'https://api.open-meteo.com', // keyless weather, 6s timeout → bundled fixture
  'https://creativecommons.org', // license comments
  'http://creativecommons.org', // license comments
  'https://www.kenney.nl', // attribution comments
  'http://patreon.com/kenney', // license file reference (assets/, not shipped)
  'https://twitter.com/KenneyNL', // license file reference (assets/, not shipped)
  'http://www.w3.org/2000/svg', // SVG XML namespace identifier — never fetched
];
{
  const shipped = walk(join(ROOT, 'src'))
    .concat([join(ROOT, 'index.html')])
    .concat(walk(join(ROOT, 'scripts')))
    .filter((f) => existsSync(f) && ['.ts', '.js', '.mjs', '.html'].includes(extname(f)));
  let bad = 0;
  for (const f of shipped) {
    const text = readFileSync(f, 'utf8');
    for (const m of text.matchAll(/https?:\/\/[^\s"'`)}\]]+/g)) {
      const url = m[0].replace(/[.,;]+$/, '');
      if (!URL_ALLOW.some((a) => url.startsWith(a))) {
        fail(`non-allowlisted remote URL in ${f.replace(ROOT + '/', '')}: ${url.slice(0, 80)}`);
        bad++;
      }
    }
  }
  if (!bad) ok('no unexpected runtime network dependencies in shipped code');
}

// ---- 3. referenced audio assets exist ----
{
  const sound = readFileSync(join(ROOT, 'src/core/sound.ts'), 'utf8');
  const refs = [...sound.matchAll(/\.\/audio\/((?:sfx|ambience)\/[A-Za-z0-9_.-]+\.ogg)/g)].map((m) => m[1]);
  const uniq = [...new Set(refs)];
  let missing = 0;
  for (const r of uniq) {
    if (!existsSync(join(ROOT, 'public/audio', r))) { fail(`missing audio asset: public/audio/${r}`); missing++; }
  }
  if (!missing) ok(`${uniq.length} referenced audio assets exist`);
  const shipped = [];
  for (const d of ['sfx', 'ambience']) {
    const dir = join(ROOT, 'public/audio', d);
    if (existsSync(dir)) for (const f of readdirSync(dir)) if (f.endsWith('.ogg')) shipped.push(`${d}/${f}`);
  }
  for (const s of shipped) {
    if (!uniq.includes(s)) warn(`shipped but unreferenced (staged for 2.0?): public/audio/${s}`);
  }
}

// ---- 4. .env.example hygiene ----
{
  const p = join(ROOT, '.env.example');
  if (!existsSync(p)) { fail('.env.example missing'); }
  else {
    const lines = readFileSync(p, 'utf8').split('\n').filter((l) => l && !l.startsWith('#'));
    let bad = 0;
    for (const l of lines) {
      const [k, ...rest] = l.split('=');
      const v = rest.join('=').trim();
      if (!k.startsWith('VITE_') && v) { fail(`non-public key with value in .env.example: ${k}`); bad++; }
      for (const re of SECRET_RES) {
        if (re.test(v)) { fail(`secret-looking value for ${k} in .env.example`); bad++; break; }
      }
    }
    if (!bad) ok('.env.example has placeholders only');
  }
}

// ---- 5. dist precache sanity (when built) ----
{
  const sw = join(ROOT, 'dist/sw.js');
  if (!existsSync(sw)) { warn('dist/ absent — run npm run build to check precache'); }
  else {
    const text = readFileSync(sw, 'utf8');
    const want = ['tap.ogg', 'dawn-chorus.ogg', 'baloo-arabic.woff2', 'icon-192.png'];
    const missing = want.filter((w) => !text.includes(w));
    if (missing.length) fail(`precache missing: ${missing.join(', ')}`);
    else ok('precache covers sfx + ambience + fonts + icons');
  }
}

console.log(`\ngates: ${fails} failure(s), ${warns} warning(s)`);
process.exit(fails ? 1 : 0);
