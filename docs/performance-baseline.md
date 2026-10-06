# Performance baseline (measured 2026-10-06, Linux CI, `npm run build`)

Autonomous-run refresh (2.0 prep): core JS 182,555 B (was 177,450 B; +5 KB for
bank hook + mood controller + validation), howler lazy chunk 37,079 B, CSS
10,094 B. Precache now **19 entries** (was 10): app + fonts + icons + 8 sfx +
2 ambience. `dist/` on disk still 5.0 MB (4.6 MB ambience — re-encode ≤3 MB
before any store release stands). Tests: 65 passing, suite wall-time ~1.4 s.

## Bundle (production, gzip in parentheses)
| File | Size |
|---|---|
| `assets/*.js` (app + howler/dexie lazy chunks excluded) | 177.45 kB (57.6 kB gzip) |
| `assets/*.css` (incl. bundled Baloo Bhaijaan 2 @font-face) | 9.88 kB (3.0 kB gzip) |
| `index.html` | 0.93 kB |
| Workbox runtime `workbox-*.js` | ~130 kB (served cache-first, not render-blocking) |
| `sw.js` + `registerSW.js` | <2 kB |

Totals: JS payload unchanged vs pre-window baseline (177.45 kB — new deps are
lazy: howler/dexie load only when SoundBank/blobstore are first used).
`dist/` on disk 4.9 MB, of which **4.6 MB is the two ambience oggs**
(target: trim/re-encode to ≤3 MB before any store release).

## Precached (19 entries, SW manifest verified)
index.html, app JS/CSS, registerSW, manifest assets, 2 fonts (73 kB),
2 icons (20 kB), 8 sfx (~57 kB), 2 ambience oggs (4.6 MB).

## Load profile (static file server, cold)
- Precached shell: index + JS + CSS + fonts ≈ **260 kB** for first paint path.
- Ambience streams on demand (HTML5 audio), never blocks interaction.

## Runtime budgets (design targets for low-end Android)
| Metric | Budget | Current |
|---|---|---|
| Canvas objects / frame | ≤250 vector draws | within (pooled particles, capped at 160) |
| Audio memory | ≤8 MB decoded | synth ≈ 0; ambience streams |
| localStorage save | ≤200 kB | small JSON; blobs go to IndexedDB |
| IndexedDB `nova-blobs` | ≤50 MB (drawings + voice packs) | empty |
| SW caches | ≤12 MB | ~5 MB |

## Interaction latency targets
- Tap → feedback sound: <100 ms (synth path; bank path after first lazy load).
- Zone transition: <300 ms. Save flush: 5 s interval + on hide (unchanged).

## How to re-measure
`npm run build` prints sizes. For device numbers, use the release procedure in
`offline-architecture.md` + remote-debug a low-end Android (FPS meter, Memory
tab). Never claim "60 FPS" without a device trace.
