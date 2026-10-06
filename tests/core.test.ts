import { describe, expect, it } from 'vitest';
import { decide } from '../src/core/adaptive';
import { validateContent, PROJECTS, QUESTS } from '../src/core/content';
import { SkillGraph } from '../src/core/skills';
import { ProjectEngine } from '../src/core/projects';
import { defaultSave } from '../src/core/save';
import type { AttemptEvidence, SaveData } from '../src/core/types';

function memSave(): { data: SaveData; persist: () => void; count: () => number } {
  const data = defaultSave();
  let n = 0;
  return { data, persist: () => { n++; }, count: () => n };
}

const ev = (over: Partial<AttemptEvidence>): AttemptEvidence => ({
  activityId: 'memory-pairs', skillIds: ['memory'], success: true,
  durationMs: 10000, tries: 1, hintsUsed: 0, at: Date.now(), ...over,
});

describe('content system', () => {
  it('validates cleanly (ids stable, links resolve, sources present)', () => {
    expect(validateContent()).toEqual([]);
  });
  it('quests reference real zones only', () => {
    const zones = new Set(['home', 'lab', 'body', 'mind', 'make', 'robot', 'explorer', 'space', 'impossible', 'stories', 'music', 'values', 'city', 'museum', 'parents']);
    for (const q of QUESTS) for (const s of q.steps) expect(zones.has(s.zone)).toBe(true);
  });
  it('projects all have steps and rewards', () => {
    for (const p of PROJECTS) expect(p.steps.length).toBeGreaterThanOrEqual(3);
  });
});

describe('adaptive engine (not +1/-1)', () => {
  it('first contact starts gentle with an example', () => {
    const d = decide([], 'memory-pairs');
    expect(d).toMatchObject({ difficulty: 0, offerExample: true });
  });
  it('repeated same-error failure triggers support mode', () => {
    const h = [0, 1, 2].map(() => ev({ success: false, tries: 4, hintsUsed: 0, errorKind: 'pattern' }));
    const d = decide(h, 'memory-pairs');
    expect(d.difficulty).toBe(0);
    expect(d.offerExample).toBe(true);
    expect(d.startHintLevel).toBe(1);
  });
  it('fast clean wins raise the ceiling', () => {
    const h = [0, 1, 2, 3].map(() => ev({ success: true, tries: 1, hintsUsed: 0, durationMs: 5000 }));
    expect(decide(h, 'memory-pairs').difficulty).toBe(2);
  });
  it('hint-dependent success fades hints instead of leveling up blindly', () => {
    const h = [0, 1, 2].map(() => ev({ success: true, tries: 2, hintsUsed: 1, durationMs: 60000 }));
    const d = decide(h, 'memory-pairs');
    expect(d.note).toBe('fade-hints');
    expect(d.startHintLevel).toBe(1);
  });
});

describe('skill graph (hidden)', () => {
  it('records evidence and strengthens skills', () => {
    const m = memSave();
    const g = new SkillGraph(() => m.data, m.persist);
    g.record(ev({}));
    g.record(ev({}));
    expect(m.data.skills['memory'].plays).toBe(2);
    expect(m.data.skills['memory'].strength).toBeGreaterThan(0.5);
    expect(m.count()).toBe(2);
  });
  it('hint-heavy wins count less and flag help needed', () => {
    const m = memSave();
    const g = new SkillGraph(() => m.data, m.persist);
    for (let i = 0; i < 3; i++) g.record(ev({ success: true, hintsUsed: 3 }));
    g.record(ev({ success: false, tries: 5, hintsUsed: 3 }));
    const need = g.needsPractice().map((x) => x.id);
    expect(need).toContain('memory');
  });
  it('weakest() picks the right skill to scaffold', () => {
    const m = memSave();
    const g = new SkillGraph(() => m.data, m.persist);
    g.record(ev({ skillIds: ['memory'], success: true }));
    g.record(ev({ activityId: 'x', skillIds: ['patterns'], success: false, tries: 4, hintsUsed: 0 }));
    expect(g.weakest(['memory', 'patterns'])).toBe('patterns');
  });
});

describe('project engine (reusable)', () => {
  it('runs a full project lifecycle: start → steps → finish → museum + world', () => {
    const m = memSave();
    const pe = new ProjectEngine(() => m.data, m.persist);
    const ps = pe.start('p-bridge');
    expect(ps.steps.every((s) => !s.done)).toBe(true);
    expect(pe.start('p-bridge')).toBe(ps); // idempotent resume
    for (const st of ps.steps) expect(pe.completeStep('p-bridge', st.stepId)).toBe(true);
    expect(pe.completeStep('p-bridge', ps.steps[0].stepId)).toBe(false); // no double-complete
    expect(pe.isComplete('p-bridge')).toBe(true);
    const coinsBefore = m.data.world.coins;
    pe.finish('p-bridge', { kind: 'p-bridge', title: 'مشروع الجسر', emoji: '🌉', description: 'done', createdAt: 0 });
    expect(m.data.museum.length).toBe(1);
    expect(m.data.world.buildings).toContain('bridge');
    expect(m.data.world.coins).toBe(coinsBefore + 20);
    expect(pe.active().length).toBe(0);
  });
  it('rejects unknown projects', () => {
    const m = memSave();
    const pe = new ProjectEngine(() => m.data, m.persist);
    expect(() => pe.start('nope')).toThrow();
  });
});

describe('save defaults', () => {
  it('starts with home + coins + safe settings', () => {
    const d = defaultSave();
    expect(d.world.buildings).toContain('home');
    expect(d.world.coins).toBeGreaterThan(0);
    expect(d.settings.voice).toBe(true);
    expect(d.version).toBe(2);
  });
});

describe('adaptive engine: hesitation + self-correction', () => {
  it('slow outlier pre-arms a cue instead of changing level', () => {
    const h = [40000, 42000, 44000, 40000].map((durationMs) =>
      ev({ success: true, tries: 1, hintsUsed: 0, durationMs }));
    h.push(ev({ success: true, tries: 1, hintsUsed: 0, durationMs: 120000 }));
    const d = decide(h, 'memory-pairs');
    expect(d.note).toBe('steady+hesitant');
    expect(d.difficulty).toBe(1);
    expect(d.startHintLevel).toBe(1);
  });
  it('self-correction after hints scaffolds instead of dropping', () => {
    const h = [
      ev({ success: true, tries: 3, hintsUsed: 2, durationMs: 20000 }),
      ev({ success: true, tries: 2, hintsUsed: 2, durationMs: 18000, strategyChanged: true }),
      ev({ success: true, tries: 2, hintsUsed: 1, durationMs: 15000 }),
    ];
    const d = decide(h, 'memory-pairs');
    expect(d.note).toBe('adapting');
    expect(d.difficulty).toBe(1);
  });
  it('ignores strategy/difficulty evidence fields it does not need (backward compatible)', () => {
    const h = [0, 1, 2, 3].map(() => ev({ success: true, difficulty: 1 }));
    expect(decide(h, 'memory-pairs').difficulty).toBe(2);
  });
});

describe('content validation: registries', () => {
  it('still validates the shipped content cleanly', async () => {
    const { validateRegistries, ACTIVITIES, QUESTS, PROJECTS, STORIES, VALUES } = await import('../src/core/content');
    const { DESTINATIONS, BUILDINGS, ZONES } = await import('../src/core/content');
    expect(validateRegistries({
      activities: ACTIVITIES, quests: QUESTS, projects: PROJECTS,
      stories: STORIES, values: VALUES, destinations: DESTINATIONS,
      buildings: BUILDINGS, zones: ZONES,
    })).toEqual([]);
  });
  it('catches bad zones, buildings, steps, labels, and id collisions', async () => {
    const { validateRegistries, ACTIVITIES, QUESTS, PROJECTS, STORIES, VALUES } = await import('../src/core/content');
    const { DESTINATIONS, BUILDINGS, ZONES } = await import('../src/core/content');
    const badActs = [...ACTIVITIES, { ...ACTIVITIES[0], id: 'x-bad-zone', zone: 'moon' as never }];
    const badProjs = PROJECTS.map((p, i) => (i === 0
      ? { ...p, rewardBuilding: 'nope', steps: [...p.steps, p.steps[0]], worldGift: { companion: '' } }
      : p));
    const badStories = STORIES.map((s, i) => (i === 0
      ? { ...s, nodes: { ...s.nodes, [s.start]: { ...s.nodes[s.start], choices: [{ label: '', emoji: 'x', next: s.start }] } } }
      : s));
    const badVals = [...VALUES, { ...VALUES[0] }]; // duplicate id
    const errs = validateRegistries({
      activities: badActs, quests: QUESTS, projects: badProjs,
      stories: badStories, values: badVals, destinations: DESTINATIONS,
      buildings: BUILDINGS, zones: ZONES,
    });
    expect(errs.some((e) => e.includes('unknown zone moon'))).toBe(true);
    expect(errs.some((e) => e.includes('unknown rewardBuilding'))).toBe(true);
    expect(errs.some((e) => e.includes('duplicate step'))).toBe(true);
    expect(errs.some((e) => e.includes('empty companion gift'))).toBe(true);
    expect(errs.some((e) => e.includes('empty choice label'))).toBe(true);
    expect(errs.some((e) => e.includes('duplicate id v-honesty'))).toBe(true);
  });
});
