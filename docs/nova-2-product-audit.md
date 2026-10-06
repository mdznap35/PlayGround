# NOVA 2.0 — Product Audit (evidence: live Chromium screenshots + code reads)

Verdict first: NOVA already feels like a small island world, not a dashboard.
Screenshots show a living island hub (zones as places, coins, quest pill, parent
gate) and a zone screen (home: 4 big icon cards + persistent voice bubble with
replay + dismiss). Navigation works (tap entered home zone), zero page errors.

## Dimension scores (CRITICAL/HIGH/MEDIUM/LOW/DEFER)

1. Core fantasy — HEALTHY. Island you inhabit; screenshots confirm.
2. Core loop — HEALTHY. Tap zone → play → earn → world changes (finish() writes
   buildings/companions/films/museum/coins; verified in code).
3. Emotional loop — MEDIUM. Celebration exists (confetti/toasts/win sounds) but
   Nova herself shows no emotion states (static ✨ face). → mood hooks (this run).
4. World persistence — HEALTHY. Pure mapper + gifts + guide + quest auto-advance.
5. Character identity — MEDIUM. Nova = helpful bubble + island drawing, no
   personality states. → mood foundation (this run); full art direction DEFERRED.
6. Exploration — HEALTHY. 14 zone plots, passport flags, destinations.
7. Discovery — HEALTHY (guide spotlights, badges, unlocks).
8. Agency — HEALTHY. Free zone choice, drag/tap/draw/build inputs.
9. Consequence — HEALTHY. Bridge/robot/garden/films/city persist visibly.
10. Learning integration — HEALTHY. Every activity carries skillIds + voice-first
    instruction; skills hidden from child as required.
11. Pre-reader interaction — HEALTHY with one LOW finding: the guide bubble kept
    lab text while inside home zone (stale guidance; LOW — bubble is dismissable
    and voice-led). Voice present on all 17 child screens (grep counts).
12. Visual identity — MEDIUM (honest). Coherent vector style + Baloo Arabic font,
    but NOT premium yet. Full art direction explicitly DEFERRED (needs human art
    decision, not code).
13. Audio identity — HIGH finding, FIXED THIS RUN. Synth + 1 ambience bed wired;
    8 curated CC0 SFX shipped in `dist/` precache but never played at runtime.
    → wired via AudioManager bank hook (fallback-safe).
14. Reward structure — HEALTHY. Coins + museum + buildings + companions + quest
    rewards; no streaks/guilt mechanics found.
15. Replayability — MEDIUM. Adaptive difficulty + shuffles exist; content volume
    (20 activities) is 2.0's job, not this run's.
16. Progression — HEALTHY. World growth + guide + quests (no XP levels shown).
17. Parent experience — HEALTHY (gated dashboard, local-only aggregates).

## CRITICAL: none found. App boots, plays, saves, works offline.
## HIGH: SFX bank unwired (fixed), content-validation gaps (fixed).
## DEFERRED: premium art, content volume, beach zone, voice packs, backend sync.
