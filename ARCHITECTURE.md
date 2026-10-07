# NOVA — Architecture Decision Record

## Decision (PHASE 1–2)

**Stack: Vite + TypeScript (vanilla, no framework) + Three.js (lazy, globe only) + procedural SVG/CSS/Canvas art.**

### Why not Flutter / Godot / React-Native
- Target is **phone/tablet + web preview** from a Linux CI with only Node available.
- No Flutter/Godot toolchains installed; installing them breaks offline-first delivery and the
  required static `dist/` deployment (`start.sh` supports `vite` or plain `index.html`).
- A Web build installs, updates incrementally, and runs on any low-end device browser.

### Why vanilla TS instead of React
- Bundle stays tiny (~100–200KB), critical for low-end devices.
- Screens are simple mount/unmount functions — no VDOM overhead, no rebuild storms.
- Full control over canvas + pointer events for simulations.

### Why Three.js was dropped for the MVP
- Initially reserved for a 3D globe; removed from dependencies because nothing imports it
  (verified: identical bundle with/without). The Explorer ships rich 2D + passport.
- Re-add `three` (lazy `import()`) only when a real 3D scene lands, to protect low-end perf.

## Module map

```
src/core/   types · events(bus) · save(versioned+autosave+backup) · audio(WebAudio synth)
            skills(hidden SkillGraph/EMA) · adaptive(multi-signal) · analytics(local-only)
            content(data registry + validateContent) · projects(ProjectEngine) · app(wiring)
src/ui/     helpers(big-touch builders, confetti) · nova(NovaGuide overlay + toasts)
src/world/  objects(pure save→island mapper, tested) · render(2.5D canvas vista +
            Nova avatar + tap-travel + ambient life) · guide(first-steps onboarding, tested)
src/engine/  camera(smooth follow/focus/clamp, tested) · scene(layers+parallax+
            tap/drag input + pooled particles + adaptive resolution) · art(one vector
            art direction: 14 buildings + Nova 9 moods + props) · feedback(celebrate/
            oops/discover + spotlight language) · particles(capped pool, tested)
src/scenes ARE screens: opening/first(cinematic) · world(island) · lab(water room +
            drag physics) · make(workshop + physical bridge) · mind(room + drag-sort) ·
            city(living system) + museum(hall). Old menus/sims kept as apparatus views.
src/screens/ first(cinematic) · world(hub) · home · lab(sims) · body · mind · make
             robot(grid coding) · explorer · space · impossible(illusions+what-if)
             stories(branching) · music(sequencer) · values(curated+sourced)
             city(builder) · museum · projects(runner) · quests · parents(gated)
src/content/  (lives in core/content.ts — data only, stable IDs)
tests/      vitest: content validation, adaptive, skills, projects, save
```

## Key principles enforced
- **No-reading-required**: every screen speaks (SpeechSynthesis ar/en) + replays; visuals carry meaning.
- **Concrete before abstract**: counting/bridge, money/shop, code/robot-grid.
- **Predict→Experiment→Observe**: lab sims, garden, what-if engine.
- **Failure is play**: no "خطأ!" walls — characters react, hints ladder (visual → focus → strong → explain).
- **Content ≠ code**: new activity/quest/project = data entry + `validateContent()` test.
- **Religious content**: curated constants with `source` field; AI never generates it (`VALUES`).
- **Privacy**: no network calls at all; analytics in-memory; save in localStorage with backup slot.
- **World persistence**: museum artifacts, buildings, companions, garden, films all mutate `WorldState`
  and reappear across zones.

## What was deliberately cut / deferred
- 3D globe (Three.js dep kept, 2D explorer ships first for perf).
- NOVA Studio (architecture ready: content registry is data; a future web tool can emit it).
- Server sync / AI features (offline-first; `aiAssist` setting reserved, no network code).
- Arabic TTS voice assets (uses OS SpeechSynthesis; replay + rate controls included).

---

# NOVA World Phase — Hybrid Architecture (Foundation is kept, not rebuilt)

## Audit verdict (what the previous phase produced)
- **Production-ready, untouched**: SaveSystem (versioned/autosave/backup/migration),
  event bus, SkillGraph (EMA), AdaptiveEngine (multi-signal), ProjectEngine
  (start/steps/save-resume/finish→museum+world), content registry + `validateContent()`,
  AudioManager synth SFX/music, gated parent dashboard, all 18 screens, 13 green tests.
- **MVP-grade (works, thin)**: world hub is a button grid (= "a collection of screens");
  Nova is an overlay bubble with no in-world presence; city screen is a static shelf,
  not a system; no guided first-5-minutes; Voice is hardwired to SpeechSynthesis;
  no cross-context skill tracking; films/garden/companions are stored but invisible
  in the world.
- **Dead code to remove**: `locked` logic in `world.ts` (always-false), the
  `questLink as _questLink` void-hack in `home.ts`.

## Decision: Hybrid, 4 layers
- **Layer 1 — Application Shell (kept)**: navigation, settings, parents, save,
  profile, content registry, skill graph. No rewrites; additive changes only.
- **Layer 2 — World Engine (new, `src/world/`)**: one living 2.5D island —
  camera-fixed vista, depth-sorted places, Nova avatar, tap-to-travel,
  ambient life, artifact placement. Pure mapping (`objects.ts`) is unit-tested;
  renderer (WorldScene in `engine/scene.ts`) is a self-cleaning canvas loop.
- **Layer 3 — Activity Engine (kept 2D)**: all sims/puzzles/sequencers stay
  Canvas/SVG/DOM. They are *entered from the world* and *report back to it*.
- **Layer 4 — Project Engine (extended, not rewritten)**: `finish()` additionally
  applies data-driven `worldGift`s (companion / film / plants) so every project
  ends as a real artifact placed in the world — never as a bare "أحسنت!" screen.

## 2D vs 3D matrix (per-zone decision, not ideology)
| Keep 2D/SVG/Canvas | Reason |
|---|---|
| mind puzzles, patterns, sorting, memory | abstract logic reads best flat; 3D adds occlusion, zero learning |
| lab sims (float/magnet/light) | direct manipulation + clear cause/effect; canvas is precise & fast |
| music sequencer, stories, values, parents | UI/text-first; 3D would be decoration |
| dashboards, forms, gates | readability |
| Go 2.5D (isometric canvas, new) | Reason |
| world hub island, city plots, buildings | place-ness, travel, persistence of artifacts |
| Nova avatar | character presence: appears, walks, points, celebrates |
| space launch, explorer travel, garden | environments the child *enters* |

## 3D-engine strategy (evaluated, deferred)
| Option | Bundle | Mobile | Offline | Touch | Verdict |
|---|---|---|---|---|---|
| Three.js | ~600KB min | good w/ care | yes | manual | best real-3D candidate **later** (globe/space), lazy `import()` |
| Babylon.js | ~1MB+ | heavier | yes | built-in | overkill for sprites-and-places |
| PlayCanvas engine | ~500KB | good | yes | good | strong, but new pipeline + editor lock-in |
| CSS 3D only | 0KB | weak for scenes | yes | n/a | insufficient depth |
| **2.5D canvas (chosen)** | **0KB** | **60fps on low-end** | yes | native pointer | vista + parallax + depth-sort = the *visual result* without the engine |

Rule: no 3D library until a scene needs true camera rotation/lighting/physics
(globe, submarine dive). The visual bar is judged by the picture, not the tech name.

## Audio architecture (evolution without rebuild)
`Voice` keeps its exact API (`speak/stop/replay/settings`) but delegates to a
`VoiceBackend`. `SystemSpeechBackend` ships now; `RecordedVoiceBackend`
(Arabic/English studio voices, per-character voices, asset bundles) can replace
it later with zero screen changes. SFX/music stay synthesized WebAudio (offline).

## Skill graph (extended, not replaced)
- Every activity/project/adventure keeps its skill list; audit below.
- `SkillState.contexts[]` records *which activities* each skill was used in →
  `transferred()` = used in ≥2 contexts. Parent dashboard shows transfer badges.
  This is how "same concept, new context" becomes observable.
- Adaptive keeps varying count/time/scaffolding/hint-type/steps (already in
  `decide()` + per-screen difficulty branches); transfer probes ride on the
  existing quest/auto-link system (e.g. counting in bridge → counting in shop).

## Skill-mapping audit (activity → skills, verified)
- p-bridge: counting, planning, construction, problemSolving **+ spatial** (added)
- p-robot: construction, sequence, debugging, invention **+ planning** (added: route planning is explicit)
- stories: listening/prediction + vocabulary in context (kept)
- garden/whatif: prediction, systems, nature (kept; systems = the transfer target)
- shop: money, comparison, addition + counting-transfer from bridge (noted, not forced)

## World persistence contract (the bar for "one world")
`WorldState` is the single source of truth; `worldObjects(save)` is the single
mapper. If it is in the save, it is visible on the island:
bridge→river, school/lab/shop/…→city plots, robot→wanders by workshop,
garden→grows with `plants`, films→cinema marquee, passport→gate flags,
companions→inhabitants. Projects may only finish through artifacts.
