# NOVA Creative Bible (v1 — Creative Reset canon)
> The single reference for all future NOVA work. If it contradicts older docs, THIS wins.
> Status: **Prototype canon** (honest label — not "world-class" until a child proves it).

## 1. One-line truth
**«مو عم تتعلم نوفا… أنت عم تعيشها.»** — You don't learn Nova. You live her.

## 2. Fantasy & role
- Fantasy: **حارس الدفء** — keeper of little lights on a night-sea island.
- Child is: warm hands the island waited for. Warms, shelters, wakes, comforts.
- Nova is: a baby glow-creature who hatches from HOW you keep her, then remembers you.
- World need: lights dim without keeping. You matter because without you it stays dark.

## 3. Core loop (canonical)
**WONDER → TOUCH → TRY → WATCH → FEEL → GROW → CHANGE WORLD → WANT MORE**
- Every experience must answer: where is the WOW? where is the choice? what changes forever?
- Forbidden loop: lesson → question → button → tick. If a design reduces to that, redesign.

## 4. Character canon — Nova the hatchling
- Body: round glow-blob, squashable; sprout-leaf ears (left flops, right perks — asymmetry = identity); big low eyes that look at what the child touches; tiny dangling feet.
- Color: night indigo outline `#2a2350`, body glows cold-blue `#9fd8ff` when cold → warm gold `#ffd76e` when cozy. Pattern from keeping history (freckles/stripes/star-chirps).
- Voice: chirps first (happy/curious/sleepy/hatch-song); Arabic words rare, short, warm. Never lectures.
- Behavior rules: (1) look before speaking — gaze is the pointer; (2) notice out loud (startle/peek/giggle); (3) help without solving (look at affordance, never auto-complete); (4) need the child (dims/shivers when ignored >8s); (5) remember (greets with history: your song, your warmth).
- Moods (authored, 300–600ms with anticipation+overshoot): idle-breathe, notice, lean, shiver, cozy-glow, hide/peek, bonk-giggle, bloom, follow, point, celebrate, sleep.
- Ownership = history (`hatch.memory`), not picker. Picker (ribbon/name-mark) is secondary.

## 5. World canon — the night-sea island
- Place: one beach at night → dawn after hatch. Stars → sea shimmer → wet sand → nest → firefly grass → tide pools.
- Physics of meaning: **warmth is visible** (blue↔gold), **care accumulates** (glow ring fills), **too much is information** (pant/hide, then recover).
- Inhabitants: Nova, 2 crabs (ambient, tappable, never blocking), fireflies (gather where Nova sleeps).
- Persistence law: *if it's in the save, it's visible.* Shell stays. Nest stays lit. Dawn stays broken. No invisible progress.
- Beyond the dunes: other zones exist as silhouettes (tease, not build).

## 6. Interaction canon (feel first)
- Touch budget: **first visible response <100ms**, full settle 300–600ms with overshoot.
- Cares (the only verbs in the slice): **rub** (heat rate), **cup/hold** (heat retention), **tap-sing** (rhythm echo). Bonus experiments: water drop, leaf blanket.
- Every touch: light + squish + chirp co-occur. No dead taps. No instruction walls.
- Over-care is designed: too hot → pants + cools; too loud → hides + peeks. Recovery is quick and kind.
- Portrait-first, thumb-reach, ≥56px targets, `touch-action:none` only on the caring surface.

## 7. Learning canon
Template for every experience:
- **Objective** (skill), **Mental model** (what understanding looks like), **Evidence** (observable behavior proving it), **Misconceptions** (likely wrong ideas + how world corrects kindly), **Adaptation** (how challenge shifts), **Transfer** (where else the model appears), **Reflection** (does child grasp *why*?).
- Slice instance ("Hatches"): objective = heat/shelter/sound cause-effect + self-regulation; model = living things need *just enough* warmth/shelter/rhythm; evidence = child modulates rub pressure, holds to retain, echoes rhythm without prompting; misconceptions = "more rubbing = always better" (pant corrects), "loud = wake faster" (hide corrects); adaptation = pod temperament (sleepy/hungry/singy) shifts thresholds; transfer = garden sprout + lamp moth later; reflection = Nova chirps child's rhythm back ("she learned MY song").
- Failure canon: never WRONG!. Always: world shows → Nova shows → try again kindly.

## 8. Art canon
- Shape: round + squish; domes/pods, never sharp triangles. Silhouette readable at 32px.
- Color: night-sea indigo vs keeper-gold. Cold `#9fd8ff` ↔ warm `#ffd76e` lerp IS progress. UI: deep-sea translucent, no white cards.
- Light: ONE warm source (pod/Nova) with radial falloff; dawn = sky lerp by hatch progress.
- Materials: matte sand, wet-gloss pod, velvet-glow Nova. Baked sprites where hot; no per-frame gradient churn on mobile.
- UI in play: 2 orbs max (🏠 🔊). Progress = glow ring, not bars/dots/labels. No pills on characters.
- Motion: squash-and-stretch + anticipation + overshoot; reduceMotion = glow pulse, no bounce.

## 9. Audio canon
- States: night (soft waves), touch-hum (pitch = warmth), bloom (rising fifth + shimmer), chirps (3+1), dawn (gentle major pad).
- Voice: ≤4 short Arabic lines per slice, replayable, never chained lectures. TTS = dev backend; label Prototype. Abstraction: `Voice.speak()` unchanged; recorded pack replaces backend later.
- Silence is allowed. Chirps + light often say enough.

## 10. Narrative canon (small, load-bearing)
- Arrival: stars, waves, one shivering light. No title, no menu.
- Question: who is inside? (never stated in text — shown by seam breathing + peeking light)
- Discovery: warmth + shelter + song wake her.
- Change: night breaks, she looks at YOU first.
- Promise: "listen… another one?" (replay tease).
- No lore dumps. Story = what happened to the light because of you.

## 11. Product canon
- 10 excellent minutes > 2 average hours. One beach alive > 14 doors.
- Slice exit: shell + lit nest + named Nova who follows; parent sees hatch-memory card (what child did, what it shows).
- Quality bar: pre-reader can play muted; touch feels delicious; WOW is memorable and retellable ("she sang MY song!"); performance 60fps low-end, offline, <300KB delta.
- Honest labels: Prototype → Good → Polished → Strong → Premium candidate → Production-ready. Never claim higher than evidence.

## 12. Tech canon
- Vanilla TS + Canvas 2.5D for slice. No new deps. Pixi/Three DEFERRED until a scene needs them (decision in audit §16).
- Save: additive `hatch?` field; no migration bump; `validateContent` + vitest stay green.
- Structure: `src/screens/hatch.ts` (slice), `src/world/hatchling.ts` (pod+Nova logic, pure + tested), `src/engine/care.ts` maybe folded in. Reuse `WorldScene`, `Feedback`, `Voice`, `AudioManager`.

## 13. What is NON-canon (explicitly killed)
Menu-hub-first, quiz-verdict learning, labelPill-everywhere, coin-toast-confetti feedback, DOM-lecturer Nova, tint-picker-as-identity, slider-as-light, vacuum-as-magnet, SpeechSynthesis-as-final, "more doors = more game".

---
*Companion: `docs/creative-reset-audit.md` (why) · Next: `docs/design-proof-report.md` (proof it works).*
