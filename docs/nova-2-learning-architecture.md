# NOVA 2.0 — Learning Architecture (IMPLEMENTED foundations + honest limits)

## Evidence schema (IMPLEMENTED)
`AttemptEvidence`: activity/skillIds/success/durationMs/tries/hintsUsed/
errorKind + optional `strategyChanged` (self-correction) + `difficulty`
(level-at-time, for future mastery/transfer analysis). All optional additions
are backward compatible (old records validate unchanged).

## Skill model (IMPLEMENTED)
Per-skill EMA strength (α=0.25) with hint penalty, `needsHelp` rule,
`contexts[]` (≤8 recent activity ids) → `transferred()` (≥2 contexts),
`weakest()` for scaffolding choice, `topThemes()` for affinity. Skills hidden
from child; aggregates feed the parent dashboard only.

## Adaptation (IMPLEMENTED, deterministic rules — precedence documented)
`decide()` over a 6-attempt window: first-contact → support (same-error repeat
| low win + many tries | hint load) → stretch (fast clean wins) → fade-hints →
adapting (self-correction + decent wins) → hesitant-softened steady/fade-hints
(last > max(30 s, 2.5× own median), ≥3 samples) → steady. Every branch is unit
tested including precedence (adapting beats hesitant-softening; stretch exits
before hesitation matters).

## What we do NOT claim (by design)
No mastery scores, no diagnostic labels, no ML. `needsPractice()` surfaces
"needs repetition", never a diagnosis. Parent copy must keep this framing.

## PROPOSED (not built — needs product/education review)
- `ProjectDef.reflection?: { prompt, skills }` + engine support (see content doc).
- Per-activity expected-time bands to sharpen hesitation (currently self-median).
- Transfer-weighted scaffolding (prefer activities sharing weak skills' contexts).
- Confidence signals (e.g. answer-change-before-submit) as new evidence fields.

## DEFERRED
ML-based adaptation, cross-device sync of learning state, educator dashboards.
