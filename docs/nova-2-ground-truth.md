# NOVA 2.0 — Ground Truth (verified 2026-10-06, NOT trusted from prior reports)

Every claim below was re-verified by reading code, running the build/tests, or
inspecting `dist/`. Status words: IMPLEMENTED / PREPARED / PROPOSED / DEFERRED / UNVERIFIED.

## A. Architecture (IMPLEMENTED)
Vanilla Vite 6.4.3 + TS 5.9.3, no framework. `src/main.ts` owns the route table
(18 screens) + global `app.go()` with try/catch error screen. `App` (`core/app.ts`)
wires Save/SkillGraph/ProjectEngine/Analytics/Voice/AudioManager and exposes
`ctx()` (say/hint/report/earnCoins/spotlight). `report()` auto-advances the
first-steps guide AND quest steps on any successful play (central hooks).

## B. Rendering (IMPLEMENTED, 2D canvas — adequate, not premium)
`engine/scene.ts`: WorldScene (layers + parallax 0..1, depth-sorted SceneObjs,
particles, tap/drag/pan input, rAF loop that self-cleans when canvas leaves DOM,
DPR≤1.5 + adaptive 1→0.55 backing store, reduceMotion path). `camera.ts`:
fit/focus/pan/clamp + world↔screen round-trip (tested). `art.ts`: vector buildings,
`particles.ts`: capped pool (160). No framework, no WebGL. Howler is a separate
lazy chunk (37 KB); dexie/gsap installed but tree-shaken out (unused at runtime).

## C. State/save (IMPLEMENTED)
`SaveData` v2, single localStorage key + backup slot, `migrateSave()` chain,
autosave 5 s + hide/close, 500-attempt cap, atomic `update()`. No corruption
recovery beyond backup slot (accepted). BlobStore (dexie `nova-blobs`) exists
but is NOT wired to any screen (drawings still use ad-hoc localStorage key).

## D. Learning systems (IMPLEMENTED, honest scope)
- SkillGraph: EMA (α=0.25) strength, hint penalty, needsHelp rule, per-activity
  `contexts[]` → `transferred()` (≥2 contexts), `weakest()`, `topThemes()`.
- Adaptive `decide()`: 6-attempt window; signals = winRate/tries/hints/time/
  same-error-repeat; outcomes first-contact/support/stretch/fade-hints/steady.
  GAPS (verified): no hesitation signal, no strategy-change signal, no transfer
  or cross-activity context in decisions, no difficulty recorded per attempt.
- `AttemptEvidence`: activityId/skillIds/success/durationMs/tries/hintsUsed/
  errorKind/at. No strategy/difficulty/mastery fields.
- Analytics: in-memory only, capped 300, no PII, aggregates for parents.

## E. Audio (IMPLEMENTED, partially wired)
AudioManager synth SFX + pentatonic music loop, settings-gated, unlock-on-gesture.
Voice: `VoiceBackend` interface, SystemSpeech default, `setBackend()` swap,
`RecordedFileBackend` scaffold (no packs shipped — `public/audio/voices/` absent).
SoundBank (howler, lazy): 8 curated Kenney CC0 SFX in `public/audio/sfx/`
(precached, verified in `dist/sw.js`), splash→synth by design, volumes/mute/fade.
GAP (verified): screens call `app.audio.sfx()` directly — `bank.play()` is used
by NOTHING at runtime; only `ambience()` is wired (world + explorer/garden).

## F. Content (IMPLEMENTED, data-driven)
20 activities / 10 quests / 6 projects / 2 stories / 6 destinations / 6 values /
12 buildings / 8 EN words, all with stable IDs + Arabic voice lines.
`validateContent()` checks dup activities, voice presence, quest links, project
steps, story graph, value sources. GAPS: quest step zones, project
rewardBuildings, project step id uniqueness/voice, story label content,
cross-registry duplicate ids — all UNCHECKED.

## G. World/persistence (IMPLEMENTED)
`worldObjects()` pure mapper: zones + bridge/robot/garden/films/city/flags from
save. Project `finish()` writes museum + building + companion/film/plants +
coins + museum unlock. Guide (`onboard[]`) advances from real play. Quests
auto-complete with rewards. World reacts — mechanism EXISTS.

## H. Character (MVP)
NovaGuide = DOM bubble (✨ face), cooldown 800 ms, auto-dismiss 12 s, replay
button. No mood/state machine, no in-canvas presence states. (World island may
draw its own Nova — out of scope of this audit file; see product audit.)

## I. Offline/PWA (IMPLEMENTED, previously smoke-tested)
generateSW, precache 18 entries (app + fonts + icons + 8 sfx + 2 ambience),
`nova-v1` cacheId, navigateFallback index.html. Runtime: same-origin SWR only.
`fetch()` exists ONLY in `services/world-data.ts` (6 s timeout → fixture).

## J. Tests/build/perf (IMPLEMENTED)
4 files, 54 tests, all green. tsc clean. Build 181 KB JS + 37 KB lazy howler.
`dist/` 5.0 MB (4.6 MB ambience — flagged for re-encode ≤3 MB before release).
No FPS claims (no device). Quality gates: NONE automated (manual only).

## K. Safety (IMPLEMENTED by architecture)
No secrets in repo (only CI secret reference). No ads/social/chat/AI-chat.
AI = NoopAI default; gateway needs `VITE_AI_ENDPOINT` (empty default) and sends
no Authorization header. No telemetry library. Analytics never leaves device.

## L. Docs (PARTIAL)
8 docs exist; `docs/voice-packs.md` is REFERENCED by code but MISSING.
`performance-baseline.md` is STALE (says 177 KB / 10 precache entries).
