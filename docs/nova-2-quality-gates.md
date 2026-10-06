# NOVA 2.0 — Quality Gates (`npm run gates` — all green)

`scripts/quality-gates.mjs` (zero dependencies) runs five groups:
1. **Secrets** — sk-/AKIA/ghp_/gsk_/xox_/AIza/private-key/JWT patterns across
   src/docs/scripts/public/.env.example. The script's own documentation of
   patterns is self-excluded by filename.
2. **Remote URLs** — any `http(s)://` in src/index.html/scripts must be
   allowlisted (open-meteo endpoint, creativecommons + kenney attribution
   comments, SVG namespace). Catches accidental CDN/runtime deps.
3. **Asset references** — every `./audio/**` literal in `sound.ts` must exist
   under `public/audio/` (currently 10/10); shipped-but-unreferenced oggs warn
   (sea bed staged for the 2.0 beach zone — intentional).
4. **.env.example hygiene** — placeholders only, VITE_* public keys only.
5. **Precache sanity** (when `dist/` exists) — sfx + ambience + fonts + icons
   present in `sw.js`.

Content/schema rules stay in vitest (`validateContent`); runtime behavior in
vitest + Chromium harnesses (`/tmp` scripts, not committed — they need a
browser + server and are documented in `offline-architecture.md`).

Rerun: `npm run gates` (<1 s). Release order: `npm test` → `npm run gates` →
`npm run build` → offline smoke → ship `dist/`.
