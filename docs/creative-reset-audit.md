# NOVA — Creative Reset Audit
> Mission: separate from all previous missions. Nothing is sacred except what provably serves a premium children's game.
> Verdict on the question "would I ship this as a premium kids product?": **No.**
> Date: 2026-10-07 · Auditor: autonomous (code-inspected, not vibe-assessed)

## 1. Current Product Diagnosis

**What NOVA actually is today** (verified in code):
A flat 18-route screen switcher (`src/main.ts:45-64`, `app.go()` wipes `root.innerHTML`) wrapped around a clickable island diorama (`src/screens/world.ts`). The island holds 14 fixed pins (`LAYOUT:25-41`) that open mini-apps: water tank, magnet wall, lamp slider, bridge counting, robot grid, shop, stories, music sequencer, etc. Around it: coins/toasts/quests/confetti, a Nova overlay bubble (`src/ui/nova.ts`), SpeechSynthesis narration, WebAudio sine-blip SFX (`src/core/audio.ts`), versioned localStorage save (`src/core/save.ts`), SkillGraph + adaptive difficulty + content registry.

It works. Build passes. Tests pass. And it feels like **educational software with a game skin** — a dashboard of activities, not a world a child lives in.

### Dimension-by-dimension (brutal, file-anchored)

**PRODUCT** — No core promise. The island answers "where do I click next?" not "why do I come back?". Coins (`purse-orb`, `world.ts:57`) + quest dots (`●○`) + `confetti()` in 4 places = generic F2P sticker-chart, not a toy desire. There is no single fantasy a 4-year-old can say in one sentence.

**GAMEPLAY** — Worksheet with drag enabled. Water room (`lab.ts:468-495`): tap to toggle a `true/false` guess, drag emoji (`fillText('🪵'/'🪨'/'🍎')` at 40px) into a rect `TANK`, auto-fall `vy+=900*dt`, `fx.splash/celebrate` on drop. Magnet (`lab.ts:692-710`) is proximity vacuum; light (`lab.ts:623-626`) is an HTML `<input range>`. No timing, no skill, no physics to master, no fail state — only "teacher corrects you" (`settle():528` says `توقعت صح!`).

**LEARNING** — Content attached to a mechanic, not mechanic as learning. `FLOAT_POOL:45-54` hardcodes the moral (`voice:'تطفو! الخشب خفيف!'`) and Nova speaks the concept *before* discovery. Adaptive (`decide()`) only varies object count 3/4/6 — difficulty by quantity, not scaffolding, misconception modeling, or transfer. No mental model is built; the child memorizes verdicts (wood=floats, stone=sinks).

**ART DIRECTION** — Programmer-art vector kit, not authored identity. `engine/art.ts` promises "emoji never as the place itself" but gameplay IS emoji. Buildings = same cream box + triangle roof re-tinted (house/workshop/plot-house). Sky = 4-stop linear gradient + ellipse clouds (`world.ts:102-105`). Zero texture, lighting logic, material language, or silhouette variation. Primitives + gradients + particles IS the final language — exactly what §19 forbids.

**CHARACTER** — A blob, not a friend. `drawNova:779-908` = circle + ear-ellipses + white-eye-ellipses; DOM Nova = `div.nova-face` + `✨` emoji + radial gradient. "Identity" (`avatar.ts:12-24`) = 4 tint hexes + 3 emoji charms glued on. No rig, no face rig, no personality. She walks at 300px/s, says tutorial lines, and opens a picker when tapped. No ownership, no relationship.

**ANIMATION** — PowerPoint bob. Everything is `Math.sin(t/500)*3` (`world.ts:117,162,311`). Walk = feet ellipse offset ±sin, celebrate = `squash=1+0.08*sin`. `first.ts:102-112` "pop" is linear scale. Only juice is a camera zoom (`cam.focus(...,1.9,750)`). No anticipation, overshoot, squash-and-stretch with meaning, secondary motion, or eye/gaze acting.

**AUDIO** — Prototype-grade. `SFX_FREQ={tap:[520],bad:[300,220]}` single sine blips; `startMusic` = `setInterval 1200ms` triangle pentatonic at gain 0.05. Voice = raw `speechSynthesis` `pitch=1.1, ar-SA` — on most devices a robotic adult mispronouncing kids' copy, silently no-ops when voice missing/off (`voice.ts:51-53`). No character barks, no score states, no discovery stingers.

**UX** — School flow with nicer buttons. `app.go()` = hard cut + one `translateY(14px)` fade. Nova bubble is a fixed bottom bar (`styles.css:160-183`, max-width 640px) covering play area with text + `🔊` + `حاضر!`. Navigation = menus → room → back. The child presses buttons and gets judged.

**NARRATIVE** — No story, only tutorial copy. Entire lore (`first.ts:114-134`) in ~11s: `أنا نوفا! هذا عالمك! شوف! المختبر!`. Mystery crate (`world/mystery.ts:1-7`) drips because `lab.ts:248-253` draws a blue dot. No want, obstacle, mystery, or change. `DECOR_LINES` are one-liners (`جسرك! بنيته بيدك!`).

**WORLD** — A diorama, not a place. Island = 2 ellipses (sand + grass) + quadratic river + dashed road. "Living" = circling boat, 3 walkers, wobbling crate. Persistence just toggles more doodles + `labelPill('جسري!')`. Nothing to tend, nothing that needs you, nothing that changes without you clicking a menu.

**REPLAYABILITY** — One-shot. `mysteryPhase()` = find→grow→done; `applyBloom` returns false if BLOOM exists. Only variance is shuffled pool + 3 petal colors. No levels, seeds, combos, daily wonder.

**MOBILE UX** — Letterboxed. `canvas.world-canvas{height:min(60dvh,540px)}` squeezes a 1000×620 design space into portrait; 34px orbs on a scaled canvas are miss-prone for 4yo thumbs. Drag uses `touch-action:none` + global pointerdown audio unlock — fights scroll. Slider lamp is unusable one-handed.

**PERFORMANCE** — Not slow, under-scoped. Bundle ~192KB, all procedural. Cost is naive per-frame canvas (gradients recreated in lab room every frame, 14 buildings `breathe()` each frame) draining battery for visuals that look static. No asset budget because there are no assets.

**PRE-READER EXPERIENCE** — Claim "no reading required" is false. Every building has an Arabic `labelPill`, choices are text (`بيكبر/بيصغر`), quests/toasts are text. All meaning is carried by TTS which may not exist on the device. Guess affordance (`💭❓⬆️⬇️`) is illegible without an adult.

## 2. Root Causes (not complaints)

1. **No core fantasy → everything becomes a menu.** Why does the child need 14 buildings? Because there is no answer to "why do I enter NOVA?" So the team added doors. The UI exists to navigate content, not to live a role. Fix the fantasy and 80% of the UI can die.
2. **Learning is verdicts, not mechanics.** Why does Nova tell the answer? Because the activity is a quiz (predict→judged) with drag as decoration. The concept (density, magnetism, light) never *causes* gameplay. So voice must lecture to "teach". If the physics itself were the toy, no lecture would be needed.
3. **No authored identity → simplicity looks cheap, not intentional.** Why do primitives look cheap? Not because they are simple — because there is no shape/color/material logic making simplicity feel deliberate. One cream box × 14 with different labels reads as "no artist". A single strong silhouette language would make the same poly-count feel premium.
4. **Character is an overlay, not an inhabitant.** Why does Nova feel dead? Because she is a DOM bubble + a canvas circle with no needs, no growth, no memory of the child. Pickers (4 tints + 3 charms) substitute for personality. Ownership cannot come from options; it comes from shared history.
5. **World has no needs → child has no role.** Why is there no agency? The island is complete without the child. Nothing is thirsty, cold, dark, or lonely. So actions leave doodles, not consequences. A world that needs keeping creates a Keeper; a finished diorama creates a tourist.
6. **Feel is an afterthought.** Why does touch feel dead? Because interactions are discrete events (tap→sfx→toast) with linear tweens, not continuous tactile systems (rub, hold, tilt, hover) with anticipation/snap/bounce. Game feel lives in the 200ms after touch — exactly where NOVA has nothing.

## 3. What Must Die

- The 14-door hub as the first experience. Keep the island renderer, kill the "menu of mini-apps" framing.
- The float/sink quiz loop (tap-guess → drag → verdict voice). Keep the water tank as a *toy*, kill it as a *test*.
- `labelPill` everywhere, quest dots, coin toasts, `confetti()` as default feedback.
- DOM Nova bubble as lecturer. Nova speaks to explain UI — that job should not exist.
- `سر الصندوق العجيب` as the slice: one-shot crate→seed→flower with no replay, no mastery, no character bond.
- HTML range slider as "light mechanic", proximity vacuum as "magnet mechanic".
- Claim that SpeechSynthesis = final voice. It is a dev backend only.

## 4. What Must Stay

- SaveSystem (versioned/autosave/backup/migration, `src/core/save.ts`) — production-ready. Extend with optional fields only.
- SkillGraph + `contexts[]`/transfer + adaptive `decide()` + `validateContent()` + ProjectEngine — wire real play into them instead of replacing them.
- Offline-first, no-network-at-runtime, local-only analytics, PWA shell.
- Canvas 2.5D engine (`engine/scene.ts` camera/parallax/pooled particles), `Voice` API boundary (add backends, don't rewire screens).
- All 18 screens as *places you can visit later* — but NOT as the first 10 minutes.
- Tests: content validation, adaptive, skills, projects, save.

## 5. Biggest Design Mistakes (so we don't repeat)

1. Mistook **more doors for more game** (scope over depth).
2. Mistook **interaction widgets for gameplay** (drag/slider/tap = game).
3. Mistook **telling for teaching** (voice verdict = learning).
4. Mistook **options for ownership** (tint picker = my character).
5. Mistook **effects for feel** (particles/confetti = joy).
6. Mistook **labels for pre-reader support** (TTS over text = accessible).

## 6. New Core Fantasy

**«أنا حارس الدفء — جزيرتي الصغيرة تحتاجني.»**
(I am the Keeper of Warmth — my tiny island needs me.)

NOVA is a small night-sea island where little lights sleep. The child wakes them, keeps them warm, and grows the island glow. Nova herself is one of those lights — a baby glow-creature who hatches *because of how the child touches*, and then remembers.

One-sentence pitch a 4-year-old gets: **"دفّي النور الصغير… وشوف مين بيطلع!"** (Warm the little light… see who comes out!)

## 7. New Core Loop

**WONDER → TOUCH → TRY → WATCH → FEEL → GROW → CHANGE WORLD → WANT MORE**

Concretely (5–10 min slice "نوفا تفقس / NOVA Hatches"):
1. Night beach. One dim pulsing pod. Nothing to read. It shivers.
2. Child touches → it leans toward touch, warms a little, hums. (continuous feedback, <100ms)
3. Child discovers 3 tactile cares: **rub to warm, cup to shelter (hold), tap-sing to wake** (rhythm echo). Water drop + leaf-blanket are bonus experiments.
4. Pod responds with light/squish/sound per care; over-care also reacts (too hot → pants, too loud → hides). Child forms mental model: living things need *just enough*.
5. Hatch: light blooms, island dawn breaks, Nova emerges with pattern tinted by HOW the child cared (warm-rub → sunny freckles; gentle-hold → teal calm stripes; song → star chirps). True ownership via history, not picker.
6. Nova follows, points, celebrates; beach stays lit; pod shell remains as the child's first artifact. "Again?" → second pod with new temperament (replay: different hatch).

Learning objectives embedded: heat transfer (rub→warm), shelter/insulation (hold→holds warmth), vibration/sound (rhythm→response), observation + self-regulation (too much/little), care/persistence. No quiz. Evidence = child modulates pressure/rhythm without prompting.

## 8. New Child Role

Not user/student/player-pressing-buttons. **Keeper (حارس الدفء)**:
- Who: the warm hands the island waited for.
- Can: warm, shelter, wake, comfort, name (by choosing, not typing — pick a glow-mark).
- Wants: to see who comes out; to keep the light on.
- Changes: night→dawn on the beach; pod→Nova; dark shore→lit garden patch (persistent).
- Why needed: lights dim without keeping; Nova shivers and dims if ignored — the world visibly needs you.

## 9. Character Direction

Nova v2 = **hatchling, not mascot**:
- Silhouette: round glow-body (squishable), sprout-leaf ears (asymmetric on purpose), big low eyes (look at what child touches), tiny feet that dangle when carried. Must read at 32px and 200px.
- Personality: curious > instructive. Notices, startles, hides, peeks, celebrates. Fails softly (bonks, giggles). Never lectures; *shows* by looking/pointing/leaning.
- Performance set (minimum): idle breathe, notice (snap-look + ear perk), lean-to-touch, shiver, warm-glow, hide/peek, hatch-bloom, follow, point, celebrate, sleep. Each = 300–600ms authored tween with anticipation + overshoot, not sin-bob.
- Ownership architecture: `hatch.memory = { warmth, gentleness, song }` → derives tint/pattern/chirp; stored in save; Nova greets child with history ("you sang to me!") — picker becomes *secondary* (rename/ribbon), never the source of identity.
- Relationship: Nova needs the child (dims when ignored) and helps without stealing solutions (looks at next affordance, never auto-solves).

## 10. Learning Philosophy

Mechanic IS the lesson. Prediction→Action→Experiment→Observation→Understanding, never Question→Answer.
- Every experience declares: Objective / Mental Model / Observable Evidence / Misconceptions / Adaptation / Transfer / Reflection (see Bible §7).
- Failure = information: "too hot — she pants, let's wait" (world shows, Nova shows, no WRONG wall).
- Transfer probe: same "just enough warmth" model reappears later (garden sprout, lamp moth) — tracked via `skill.contexts[]`.

## 11. Art Direction (reset)

- **Shape**: everything round + squishable; no sharp triangles (roofs become domes/pods). Asymmetry is charm.
- **Silhouette**: Nova readable as blob+leaf-ears at any size; pod = teardrop with breathing seam.
- **Color logic**: night-sea indigo (`#1b2350` → `#2f7fc9`) vs warm glow (`#ffd76e`/`#ff9d6b`); warmth is literally visible (cold blue ↔ warm gold lerp). UI uses deep-sea translucent, never white cards.
- **Lighting**: single warm light source (the pod/Nova) with radial falloff; island dawn = sky lerp driven by hatch progress. No generic drop shadows.
- **Depth**: 4 layers (sky-stars → sea → beach → foreground grass) + depth-sorted glow sprites; no fake 3D.
- **Materials**: soft matte (sand), wet gloss (pod), velvet glow (Nova). Canvas radial gradients + baked sprites, not per-frame gradient churn.
- **UI language**: no pills/cards in play; only 2 orbs (🏠 back, 🔊 replay-sound). Progress = light itself (pod glow ring), not bars/dots.
- **Typography**: keep system Arabic rounded; text only for parents/debug — never required for play.
- **Animation style**: squash-and-stretch + anticipation + overshoot; 200ms touch response budget; reduceMotion respected (glow pulse instead of bounce).
- **Feedback**: light + squish + chirp co-occur; success = dawn + bloom + song, never confetti rain.

## 12. Audio Direction

Prototype now, honest labels. `Voice` keeps API, adds backends later (recorded Arabic girl/boy + Nova chirps). Sound states: night ambience (soft waves, synth loop), touch hum (pitch follows warmth), hatch bloom (rising fifth + shimmer), Nova barks (3 chirps: happy/curious/sleepy, synthesized now). Arabic copy: short, warm, spoken once, replayable via orb — never walls of text. No auto-TTS lecture chains.

## 13. World Direction

One beach at night that becomes dawn. Landmarks: pod nest, shell (persists after hatch), tide pools (ripple on touch), firefly grass (holds warmth memory). Recurring: Nova + 2 crabs (ambient, non-blocking). Cause/effect everywhere: touch sand → ripple + chirp; tide pool → reflection wobble; grass → fireflies gather where Nova sleeps. Persistent: lit nest + shell + dawn sky stay lit on return. Build ONE place that proves world-ness; other 14 zones become "beyond the dunes" (locked by story, not by grid).

## 14. UX Direction

No menus in play. Enter → see shivering light → touch → it responds. Discovery over instruction: gaze + glow + Nova-look replace arrows/labels/popups. Two orbs only. Portrait-first: 720×1080 design space, thumb-reach bottom half, ≥56px targets, camera frames pod+Nova together. Pre-reader: everything understandable muted (light/squish/gaze carry meaning; sound is bonus, text is absent).

## 15. Vertical Slice Proposal — "نوفا تفقس" (NOVA Hatches)

- Duration 5–10 min. One scene (night beach) + hatch + dawn + naming + follow.
- Beats: arrive (boat? no — fade from stars) → notice shiver → touch-warm → shelter-hold → song-echo → over-care discovery → hatch WOW (bloom + dawn + first look) → Nova follows + names you (glow-mark pick, 3 options) → island remembers (shell + lit nest) → tease second pod ("listen… another one?").
- WOW moment: the bloom — child's accumulated warmth erupts as light, night breaks into dawn, Nova opens eyes and looks AT the child first (gaze), then chirps the child's rhythm back. Caused by child + meaningful + surprising + world-changing. Not particles.
- Systems required: tactile care engine (rub/hold/rhythm with pressure-time model), pod state machine (cold→warming→cozy→ready→blooming + over-states), Nova hatchling actor (moods + gaze + follow), dawn lighting director, hatch-memory→appearance mapper, save extension (`hatch` field, optional), skill observation hooks (no new infra).
- Replay: 3 temperaments (sleepy/hungry/singy pod) → different hatch patterns + chirps; "gentle" vs "bouncy" keeping yields different Nova.

## 16. Required Systems / Asset Requirements / Technology Decision

- **Build**: `src/screens/hatch.ts` (new slice), `src/world/hatchling.ts` (pod+Nova state), `src/engine/care.ts` (rub/hold/rhythm input), `src/engine/dawn.ts` (lighting director) — or fold into hatch if smaller. Reuse `WorldScene`, `Feedback`, `SaveSystem`, `Voice`, `AudioManager`.
- **Assets**: zero downloads required for slice (procedural glow/Nova/sand/tide). Optional later: 1 recorded Arabic lullaby + Nova chirp pack (documented, deferred). No asset collage.
- **Tech verdict**: KEEP vanilla TS + Canvas 2.5D. PixiJS DEFERRED — current renderer already does parallax/depth/pooled particles at 192KB offline; slice needs squash/glow/gaze, not lighting rigs or skeletal rigs. Re-evaluate only if scene needs true rotation/lighting/physics. No new deps. Hybrid/CSS3D rejected (insufficient depth control). Three.js rejected for slice (600KB for a beach = harm).
- **Save**: additive `hatch?: { novaName, pattern, tint, memory, hatchedAt, podCount }` — no migration bump needed (optional field, defaults at read).

## 17. Risk Assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| Touch cares feel same-y (rub≈hold) | med | distinct channels: rub=heat rate, hold=heat retention, rhythm=responsiveness; separate meters (glow vs pulse vs chirp) + over-states |
| Hatch WOW underwhelms on low-end | med | dawn = sky lerp + light radius, not particles; tested at 2x DPR cap; reduceMotion path |
| Pre-reader still confused at start | med | shiver + lean + Nova-look + warm hum on first touch within 3s; playtest muted |
| Voice TTS ruins emotion | high | speak rarely (≤4 lines), short, replay-orb; chirps carry feeling; label Prototype honestly |
| Scope creep (garden/crabs/city) | high | slice = beach only; everything else is a tease, not a build |
| Breaking save/tests | low | additive field, no migration; keep `validateContent`, run vitest + build |

## 18. Gates

- **GATE 1 (creative approval)**: Is the new direction unmistakably better? Identity/warmth vs menu; loop with agency/surprise/mastery; learning as mechanic; character with need+memory; living beach; slice worth building. → Judged in `design-proof-report.md`.
- **GATE 2 (product quality)**: Does the built slice match the vision? → Judged in `world-class-reset-report.md` + Red Team.

---
*Next: `docs/nova-creative-bible.md` (the new canon), then a tiny design proof before full build.*
