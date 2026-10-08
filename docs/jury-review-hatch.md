# NOVA "Hatches" — Independent Expert Review Session + Jury Verdict
> Date: 2026-10-08. Subject: the playable night-beach slice (`src/screens/hatch.ts` + `src/world/hatchling.ts`).
> Method: each expert reviewed the ACTUAL running game in headless Chromium (mobile viewport,
> touch emulation, full playthrough to hatch + dawn + naming + farewell, zero JS errors) plus
> code inspection. Reviews were written independently, then compared in jury. Audio judged from
> code + design (headless has no ears — stated honestly, not faked).

---

## EXPERT 1 — Game / Creative Director

**Score: 7/10**

This is a game. The fantasy survives the one-sentence test ("a baby light is cold — keep her warm until morning"), the first 30 seconds are genuinely compelling (night beach, one shivering light, a ring that says *touch here* without words), and the loop — notice → try → watch → adjust → dawn — is a real gameplay loop, not a lesson wearing a costume. The WOW (bloom flash, dawn break, first eye-contact, she sings YOUR rhythm back) is earned because the child did minutes of keeping, and the identity trick (her look comes from HOW you kept her, not a picker) is the single most commercial idea in the whole NOVA project. A child could absolutely choose this again — to get a different Nova.

**Strongest aspect:** Ownership-via-history. `deriveNova()` mapping care-mix → tint/pattern/chirp is a real emotional mechanic, and the farewell replays it ("she chirps your rhythm back"). This is the soul. Protect it.

**Weakest aspect:** The middle. Minutes 2–5 are one verb (rub) with a filling ring. The two other verbs exist but the game doesn't *need* the child to want them — holding is discovered by accident (finger rests), singing by luck (tapping). A game is decisions; here the only decision is "keep touching." That's thin for the 60% of runtime it occupies.

**Three serious problems:**
1. **Soft-lock by design for rub-only players.** Rub alone mathematically cannot reach `ready` (needs shelter/song ≥ 45, shelter comes only from holding). The game's own feedback at warmth>30 says "keep going!" — reinforcing the exact behavior that can't finish. A stubborn 5-year-old can rub for ten minutes and conclude the game is broken. This is the closest thing to a fatal flaw.
2. **No stakes, no fail state with teeth.** Over-care costs 6 warmth and a 2.6s pout. Nothing can go wrong, so nothing feels risked; the dawn feels scheduled, not earned, on replay when the child knows the recipe.
3. **The ending exits into the old product.** Farewell offers "see my island" — a hard cut to the daytime dashboard of 14 labeled mini-apps, coins, and quest dots. The spell breaks instantly. The premium slice funnels into the mediocre product it was built to replace.

**Three strongest opportunities:**
1. Make holding a *desire*, not an accident: the pod visibly shivers toward stillness (it already leans/gazes — extend to a "cup me" pose + cupped-hands glow when shelter-starved).
2. Temperament as replay engine: sleepy/hungry/singy already shift thresholds — surface it ("this one loves songs") so replays are different games, not repeats.
3. Keep the farewell inside the slice world (second egg, dawn beach with Nova watching) and demote the island button — the slice should feel complete, not like a trailer for homework.

**Exact changes required for world-class:** (a) stall-detector + cup affordance (visual + one voice line) when rub-only ≥ N seconds with shelter < 15; (b) mid-play persistence snapshot so a closed tab doesn't erase 4 minutes of keeping; (c) farewell hierarchy: replay primary, island secondary — plus a beat of Nova following before any exit.

---

## EXPERT 2 — Child UX + Learning Design

**Score: 7/10**

**Strongest educational mechanic:** Rhythm echo. Prediction (when will the ring meet the pod?), timing (tap on the beat), memory (her pulse period), self-regulation (banging → she hides) — four cognitive skills in ONE verb with zero text. This is learning-as-mechanic, the thing the brief demands. The heat/shelter model ("living things need *just enough*") is a genuine mental model, corrected kindly by the world (pant/hide), not by a red X.

**Weakest interaction:** Hold-to-shelter. It has no visual affordance: nothing shows cupped hands, stillness, or shelter charging until AFTER the child accidentally holds 450ms. Every other verb is cued (spotlight+👇 for touch, approaching rings for rhythm). The most load-bearing verb is invisible. For a muted pre-reader, shelter is undiscoverable except by accident.

**Three serious UX/learning problems:**
1. **Rub-only stall (agrees with Expert 1, from the learning side):** the child practicing the cued behavior gets positive feedback ("getting warm! keep going!") toward an unreachable state. Positive feedback toward a dead end is worse than no feedback — it teaches learned helplessness, the opposite of the brief.
2. **Voice bubble hogs the playfield.** The bottom sheet covers ~25% of a portrait screen with Arabic text a pre-reader can't read, a 🔊 button, and a "حاضر!" button that demands a tap to dismiss Boredom-Tap Risk: kids will tap "حاضر!" to remove it without listening. Meaning must survive with the bubble dismissed — mostly true (glow/gaze/rings carry it), but the bubble is the only channel for the shelter line, which is exactly the undiscoverable verb.
3. **Transfer is claimed, not present.** The bible names garden-sprout + lamp-moth transfer; neither exists in this build. The q-science quest credit fires (`reportKeep`), but that's logging, not transfer. Don't claim a learning system — claim one good mental model, honestly.

**Three strongest opportunities:**
1. Stall-detector → cup-hands glow + one line. Turns the biggest flaw into the biggest teaching moment ("she needs stillness, not more rubbing" IS the lesson).
2. Make over-states more findable (only frantic >0.92 triggers): a "too much" lesson nobody meets is a dead lesson. Lower slightly + add a visible pant/sweat cue readable muted.
3. Hatch-memory parent card (bible promises it): 3 lines — what she did, what it shows. Closes the learning loop for the adult without touching the child's experience.

**Exact changes required:** (a) cup affordance + stall line; (b) progress snapshot persistence (a child interrupted mid-hatch currently loses everything — `localStorage` stays empty until bloom; for kids, interruptions are the norm, not the edge); (c) shrink/defer the bubble: collapse to face+replay after first play, never cover the pod.

---

## EXPERT 3 — Premium Art + Audio + Game-Feel

**Score: 6/10** (with an honesty flag: audio judged from code/design only — headless Chromium has no ears; no score inflation from imagined sound)

**Strongest visual/audio element:** The light language. One warm source, blue↔gold as progress, dawn as sky-lerp payoff. The w-r2 frame (day beach, open shell, teal Nova with leaf ears looking at camera) is genuinely charming and original — no IP copied, readable silhouette, asymmetric ears as identity. The pulse-ring rhythm visual is the best piece of game-feel in the build.

**Weakest visual/audio element:** Audio, by forfeit. `SFX_FREQ` single-sine blips + `setInterval` pentatonic + raw SpeechSynthesis (robotic adult on most devices, mispronounced kid Arabic, silent no-op when unavailable). The design *says* chirps carry emotion — I cannot verify a single chirp sounds good. Voice is correctly labeled Prototype; the score reflects that nothing premium exists to judge.

**Three serious quality problems:**
1. **Procedural simplicity without texture.** Pod = ellipse + seam; beach = flat fills; dawn = lerp. It reads "clean prototype," not "premium." The bible's material language (matte sand, wet-gloss pod, velvet Nova) is aspirational text, not rendered reality. Nearest gap: no texture/grain/vignette anywhere.
2. **Animation is bob, not acting.** Everything is `sin(t)` offsets; walk = ellipse phase-shift; celebrate = 1.08× scale wobble. The code HAS a spring (`squashV` impulse on touch, ripple decay) — but moods lack anticipation/overshoot authoring; gaze is the only "acting" and it's good. A premium bar needs 2–3 authored beats (hatch pop, first-look double-take, sleepy blink).
3. **Feel gaps at the edges:** camera push-in exists at entry (good); bloom flash + dawn ring exist (good); but transitions between screens are hard cuts (`app.go` wipes root), and the farewell→island cut is the worst one — maximum emotion into maximum menu.

**Three strongest opportunities:**
1. Author 3 micro-beats (hatch pop with overshoot, Nova's first-look double-take, sleepy blink loop) — cheap, huge charm delta, all inside existing `drawNovaActor`.
2. One grain/vignette overlay + wet-sand gloss band: 20 lines, kills the "flat fills" read instantly.
3. Recorded chirps (even 5 hand-made WebAudio FM chirps replacing sine blips) + a real dawn pad — prototype-grade audio is the ceiling on emotion right now.

**Exact changes required to reach premium:** authored anticipation/overshoot on 3 beats; texture pass (grain + gloss + vignette); recorded/replaced voice + chirp identity; seamless slice-internal transitions. None of these need Pixi/Three — all Canvas-achievable, which is the right call.

---

## JURY SESSION

**1. Problems all three agree on:**
- (a) Rub-only stall / hold undiscoverability (E1-fatal-flaw, E2-weakest-interaction + dead-end feedback, E3-nothing-to-add — unanimous as top issue).
- (b) Mid-play progress loss (E2 explicit; E1 stakes; E3 n/a but assents — unanimous).
- (c) Farewell→dashboard cut breaks the spell (E1 #3, E3 #3 + worst-transition, E2 silent-assent).
- (d) Audio is prototype-grade, unverifiable as premium (E3 weakest, E1/E2 depend on voice lines landing — unanimous).

**2. Problems only one expert noticed:**
- Bubble hogging playfield + "حاضر!" boredom-taps (E2 only).
- Over-states undiscoverable at 0.92 threshold (E2 only).
- Transfer claimed-but-absent (E2 only — honesty correction, not a build task).
- Flat-fill texture gap quantified as ~20 lines (E3 only).
- Replay buried beside exit (E1 only).

**3. Single biggest weakness preventing world-class:** the rub-only stall. It converts the core verb into a potential dead end with encouraging feedback — a game-breaking, learning-inverting flaw hiding inside a working game. Everything else is polish; this is structural.

**4. Single strongest element worth preserving:** ownership-via-history (`deriveNova` + rhythm sung back + dawn payoff). Unanimous. Touch nothing about it except surfacing it more.

**5. Highest-impact improvements (do these):**
1. Stall-detector + cup affordance + one voice line. (fixes fatal flaw; IS the lesson)
2. Mid-play persistence snapshot (phase transitions → save; reload resumes mid-hatch).
3. Farewell hierarchy + Nova-follows beat before any exit (keep the spell).
4. Three authored micro-beats (hatch pop, first-look double-take, sleepy blink).
5. Grain/vignette/gloss texture pass.

**6. Unnecessary polish (do NOT pursue now):** Pixi/Three migration (all agree: Canvas suffices); content volume (second pod already replays); parent dashboard card (nice, not load-bearing); full recorded voice (needs human casting — prep only); island-hub rework (out of slice scope — just stop funneling INTO it as the reward).

**7. Keep, redesign, or discard?** KEEP — unanimously. The concept (keeper fantasy + tactile keeping + history-identity + earned dawn) is strong and the execution is a genuine game. Verdict category below.

---

## SCORING

| Dimension | Score | One-line justification |
|---|---|---|
| Game Design | 7/10 | Real loop + fantasy + agency; middle sags, one stall flaw |
| Child UX | 7/10 | Pre-reader playable muted; hold undiscoverable, bubble hogs |
| Learning Integration | 8/10 | Rhythm/heat/shelter ARE the mechanics; transfer absent (−2) |
| Visual Art | 6/10 | Coherent night-sea identity; flat procedural fills |
| Animation | 6/10 | Spring core exists; bob-dominated, 3 beats missing |
| Audio | 5/10 | Unverifiable by ear; synth+TTS prototype by author's own label |
| Game Feel | 7/10 | <100ms squish+hum+ripple; edges (cuts) hurt |
| Emotional Impact | 8/10 | Dawn + first look + your-song-back lands (screenshot-verified) |
| Replayability | 6/10 | Temperaments + identity variants exist; buried + unplayed-observed |
| Originality | 8/10 | Keeper-warmth + history-identity; no IP copied |

**Overall: 6.8/10 → reported as 7/10 with the stall flaw fixed, 6/10 without it.**
The math doesn't hide the weakness: Game Design 7 is *contingent* — a rub-only child experiences a 4/10 game. Fix the stall and the whole board rises a point.

## FINAL VERDICT: **B — Strong Foundation**
The core idea is worth developing; significant but bounded work is required. Not world-class yet (audio unverified, art untextured, one structural stall), nowhere near weak (it plays, it moves, it remembers, kids would replay for a different Nova).

## FINAL QUESTION — "If a child were given this game without being told it was educational, would they genuinely choose to keep playing?"
**Yes — for the first hatch.** The shivering light, the warming glow, the dawn, and a creature that looks back at you are toy-desires, not lesson-desires. **But:** a rub-only child may stall and quit thinking it's broken (the stall flaw), and almost no child replays without an adult pointing at "another egg." So: yes to 10 minutes, *maybe* to tomorrow. Fixing the stall + farewell hierarchy is what converts "played it" into "keeps it."
