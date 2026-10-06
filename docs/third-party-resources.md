# Third-party resources (licenses verified 2026-10-06)

## Bundled in the repo
| Name | Purpose | Source | Version | License | Commercial | Attribution | Offline | Usage |
|---|---|---|---|---|---|---|---|---|
| Baloo Bhaijaan 2 (arabic+latin woff2) | Kid-friendly Arabic/Latin UI type | Google Fonts (github.com/google/fonts) | v21 (variable 500–800) | **OFL 1.1** (`assets/licenses/OFL-BalooBhaijaan2.txt`) | Yes | Include OFL text (done) | Fully bundled `public/fonts/` | `--font` in styles.css |
| Dawn chorus ambience (123s ogg) | Garden/nature bed | Wikimedia Commons `File:20090610 0 ambience.ogg` (PDsounds.org, artist: nille) | 2013 upload | **Public domain** (LicenseShortName: Public domain) | Yes | Appreciated, not required | Bundled `public/audio/ambience/` | SoundBank `garden` |
| Kenney Interface Sounds v1.0 (8 curated files, ~57KB) | UI SFX (tap/pop/good/win/bad/coin/build/step) | https://kenney.nl/assets/interface-sounds — zip: `.../interface-sounds/fa43c1dd4d-1677589452/kenney_interface-sounds.zip` (104 files, 961KB; full zip kept in `assets/source/` as pipeline input) | v1.0 (2020-02-11) | **CC0 1.0** (`assets/licenses/CC0-kenney-interface-sounds.txt`) — free for personal/educational/commercial; credit appreciated, NOT mandatory | Yes | Optional (credited here; in-product credit deferred to parent credits in NOVA 2.0) | Fully bundled `public/audio/sfx/` | SoundBank SFX manifest. Curation: tap=click_001, pop=pluck_002, good=confirmation_001, win=confirmation_002, bad=drop_001 (soft thud, never a harsh buzzer), coin=glass_001, build=toggle_001, step=tick_001. `splash` intentionally synth (no water in pack). |
| Pebble beach surf (ogg) | Sea bed | Wikimedia Commons `File:On a pebble beach.ogg` | — | **Verify before commercial ship** (downloaded; re-check File page) | Unknown | Unknown | Bundled `public/audio/ambience/` | SoundBank `sea` — REPLACE or re-verify license before any store release |
| Open-Meteo sample JSON | Weather fixture + test vector | api.open-meteo.com (Ramallah coords) | 2026-10-06 | Data CC-BY 4.0 per terms page; free tier (non-commercial). **Re-verify for commercial production** | Fixture only — OK | Attribute in parent credits if live API ships | Bundled `assets/data/` | `services/world-data.ts` |

## npm dependencies (all pinned exact)
| Package | Version | License | Why | Cost/risk |
|---|---|---|---|---|
| howler | 2.2.4 | MIT | File SFX/ambience w/ mobile fallback | ~30KB gzip; lazy-loaded |
| dexie | 4.4.6 | Apache-2.0 | IndexedDB blobs (drawings, voice packs) | ~25KB; only imported by blobstore |
| gsap | 3.15.0 | MIT | DOM/UI tweens (NOT canvas loop) | Tree-shaken; use `gsap/` sub-imports |
| vite-plugin-pwa | 2.0.0 | MIT | Workbox SW generation | Build-time only |
| sharp | 0.35.5 | Apache-2.0 | Icon/asset optimization scripts | Dev-only; native binary (linux-x64 in lockfile — rerun `npm ci` on other OS) |
| fake-indexeddb | 6.2.3 | MIT | Dexie tests in Node | Dev-only |
| @types/howler | 2.2.13 | MIT | Types | Dev-only |

## Evaluated, NOT bundled (no license/weight risk taken)
- **pixi.js 8.22.0** (MIT, Commercial-OK) — integrity `sha512-QbTANHMZ751MIjLiLSUSM8a7LNMWwMIf0KbRCqlW+SPS9hNLfSVS+cl1O2SEp9g1K/wyLzj/OJHv+1TUfiPr/w==`; npm cache pre-warmed. Needs no token, fully offline-capable. Adopt only for a scene that needs WebGL.
- **Mapbox** — REJECTED for now: token required, paywalled tiles, hostile to offline-first. Revisit only if globe needs real tiles; prefer procedural globe.
- **Kenney.nl assets (CC0)** — license ideal, but downloads require JS session; manual step documented in `asset-pipeline.md`.
- **ElevenLabs** — commercial TTS with per-seat/character pricing; use for *content production only*, never runtime. No key created.
- **Sentry** — privacy review required before ANY child telemetry; NOT installed.
- **Supabase 2.117.2 / @capacitor/core 8.5.2** — versions recorded; no adoption without demonstrated need.

## License hygiene rules
- Every new asset needs a row in this table + license file under `assets/licenses/`.
- "Free tier" ≠ commercial license. Re-verify before any store submission.
- The `pebble-beach.ogg` file is the single known license risk — tracked, quarantined from release.
