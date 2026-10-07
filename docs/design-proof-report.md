# Design Proof Report — "نوفا تفقس" (NOVA Hatches)
> GATE 1 verdict: **PASS** — the new direction is unmistakably, categorically better than the old slice. Details below.

## What was tested
A single night-beach scene (no menus, no quiz, no labels) where the child keeps a shivering light-pod through three tactile cares — **rub to warm, cup/hold to shelter, tap-sing to echo its pulse** — until it blooms into dawn and hatches a personal Nova whose look comes from HOW the child kept her. Tested:
- visual identity (night-sea indigo vs keeper-gold, round+squish, one warm light)
- character (pod as pre-character with needs; Nova hatchling with gaze + memory)
- one key mechanic set (rub/hold/rhythm with over-states: tooHot / tooLoud)
- one learning moment (living things need *just enough*; heat/shelter/sound cause-effect)
- one world reaction (night→dawn, shell persists, museum artifact, fireflies gather)
- one audio direction (hum pitch follows warmth, pulse/echo/bloom chirps, ≤5 short Arabic lines, TTS honestly labeled Prototype)
- one WOW moment (bloom flash + dawn break + first eye-contact + she chirps YOUR rhythm back)

Evidence: `src/screens/hatch.ts`, `src/world/hatchling.ts`, `tests/hatch.test.ts` (10 tests), headless-Chromium screenshots (`hatch-canvas` renders, zero JS errors), `npm run build` + `npm run gates` green.

## What worked
- **First-touch feel**: squash impulse + hum + ripple all fire on pointerdown (<100ms path, no waiting on voice or animation).
- **Pacing math**: steady rubbing ≈ 2.9 warmth/s vs 1.6/s cooling; rub-alone provably cannot reach `ready` (test: 400 rub+cool cycles → not ready). The child MUST discover holding or singing — agency, not instruction.
- **Ownership via history**: `deriveNova()` maps care mix → sunny-freckles / teal-stripes / violet-starchirp + chirp base. Picker demoted to a secondary mark (⭐🍃🐚). Tested for all three branches.
- **Over-care as kindness**: tooHot (frantic rub) and tooLoud (banging) cost a little warmth, show pant/hide for 2.6s, then recover with a gentle line. Failure = information, never WRONG!.
- **Pre-reader readability**: approaching pulse ring teaches rhythm with zero text; spotlight + 👇 cue exists only until first touch, then dies forever; tide pools + crabs are fidget-readable; everything works muted (light/squish/gaze carry meaning).
- **Persistence contract kept**: shell drawn on beach + `hatch-shell` museum artifact + `save.hatch` (additive optional field, no migration, all 69 pre-existing tests still green).
- **Tech decision validated**: vanilla Canvas 2.5D does squash/glow/gaze/dawn at +19KB bundle (192→211KB), offline, DPR-capped, adaptive resolution inherited from `WorldScene`. Pixi/Three correctly deferred.

## What failed (honestly)
1. **Rub pacing was 100× too fast on first build** (6.5/event → hatch in seconds). Caught by reasoning, fixed with caller throttle (~9 ticks/s) + retuned constant (0.55) + updated tests. Lesson: feel constants need simulated-play math, not gut values.
2. **First screenshot showed a dead-gray beach**: stars sub-pixel, nest invisible, pod small in a wide frame. Fixed with chunkier stars, moonlit nest color, stronger halo, entry camera push-in (1.4× on the pod), spotlight cue. Lesson: portrait downscale eats 1–2px details — draw chunky.
3. **Replay path was silent**: second hatch skipped naming (good) but also skipped celebration + farewell (bad). Fixed: replay resets voice lines, shows farewell again, keeps Nova watching from the side.
4. **No real-child playtest possible in this environment** (blocked, documented). Muted-comprehension, thumb-reach, and 5-minute attention claims are reasoned, not observed.
5. **Cinematic→hatch handoff under virtual-time headless never auto-finished** (rAF/virtual-clock interplay); verified the slice directly via `#hatch` deep-link instead. Added deep-link support permanently (useful for testing/share links).

## Changes made after proof review
Rub throttle + pacing retune · entry camera focus · spotlight-until-touch · chunky stars/sea/nest/halo · cozy + first-song milestone gifts (mid-journey surprise) · shell museum artifact · replay celebration path · Hum.dispose() (no AudioContext leak) · `#<screen>` deep-links.

## Remaining weaknesses (owned, not hidden)
- Procedural pod/Nova are still simple shapes — charm carries them, texture doesn't. Honest label: **Prototype/Polished**, not premium.
- Middle stretch (warm→ready) is the boredom risk; mitigations (milestones, over-state surprises, temperaments, fidget fauna) are designed but unobserved with real children.
- Parent dashboard shows no hatch-memory card yet (what the child did / what it shows).
- Voice is still SpeechSynthesis (robotic on some devices); lines are few and replayable, chirps carry the emotion — recorded pack deferred.
- Landscape phones: 720×1080 world letterboxes; playable, not ideal. Portrait is the target per mobile-first canon.

## GATE 1 answers
Identity? Yes (night-sea + keeper-gold, original, no IP copied). Strong loop? Yes (decision+consequence+agency+feedback+challenge+meaning). Learning embedded? Yes (mechanics ARE heat/shelter/sound + self-regulation). Character matters? Yes (needs you, remembers you, looks at you). World alive? Yes (one beach that needs keeping and stays changed). Worth building? Built — and the screenshots read as a different product, not a reskin.
