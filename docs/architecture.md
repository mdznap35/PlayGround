# NOVA architecture (living doc — extends `ARCHITECTURE.md` at repo root)

## Stack (2026-10 internet-window baseline)
Vite 6.4.3 + TypeScript 5.9.3 + vanilla DOM/Canvas (no framework) + Vitest 2.1.9.
All versions pinned exact in `package.json`; reproduce with `npm ci`.

## Layers
1. **Application shell** — navigation (`src/main.ts` route table), settings,
   parent gate (`screens/parents.ts`), content registry (`core/content.ts`).
2. **World engine** (`src/world/`) — island mapper + onboarding guide.
3. **Activity engine** (`src/engine/`) — camera, scene graph w/ parallax,
   particles, vector art, feedback language. 2D canvas by decision (see below).
4. **Learning core** (`src/core/`) — save, skills, adaptive, projects, content.
5. **Enhancement services** (`src/services/`, `src/core/sound.ts`,
   `src/core/blobstore.ts`) — all optional, all offline-safe, all default-off
   or fallback-first. The child experience never requires them.

## New infrastructure (this session)
| Piece | Role | Default behavior |
|---|---|---|
| `core/sound.ts` SoundBank (howler, lazy) | file SFX + ambience beds | synth fallback; silent no-op w/o audio HW |
| `core/blobstore.ts` (dexie, v1 `nova-blobs`) | large blobs (drawings, voice packs) | memory fallback; localStorage saves untouched |
| `services/world-data.ts` (Open-Meteo, keyless) | real weather for explorer | bundled fixture on any failure |
| `services/ai.ts` (NoopAI default; GatewayAI scaffold) | future explanations/summaries | deterministic local text; no network unless endpoint configured |
| `services/voice-pack.ts` RecordedFileBackend | pre-generated line audio | per-line fallback to system speech |
| `config.ts` + `.env.example` | public-only runtime config | empty AI endpoint = AI disabled |
| PWA (`vite-plugin-pwa`, generateSW) | precache app shell + fonts + ambience | app works with zero network after first load |

## Why NOT PixiJS / a framework (recorded decision, re-evaluate for NOVA 2.0)
- Custom canvas engine is ~1k LOC, measured, and sufficient for the current art.
- Pixi 8.22.0 evaluated: MIT, offline-safe, but +600KB min and a migration with
  zero visual payoff today. Tarball hash recorded in `third-party-resources.md`;
  npm cache on this machine is pre-warmed. Adopt only with a scene that needs it.
- GSAP 3.15.0 installed for DOM/UI tweens only — never the canvas hot loop.

## What must NOT change casually
- Save keys (`nova.save.v1*`) + `SAVE_VERSION` migration chain in `core/save.ts`.
- Content IDs in `core/content.ts` (stable; validated by tests).
- `VoiceBackend` / `AIService` interfaces (screens depend on them).
- Dexie store name `nova-blobs` and table `blobs`.
- SW `cacheId: nova-v1` bump discipline (see `offline-architecture.md`).
