import { describe, expect, it, vi } from 'vitest';
import { defaultSave, migrateSave } from '../src/core/save';
import { SkillGraph } from '../src/core/skills';
import { ProjectEngine } from '../src/core/projects';
import { Voice, type VoiceBackend } from '../src/core/voice';
import { worldObjects, ZONE_PLOTS } from '../src/world/objects';
import { guideStep, guideNotifyActivity, guideNotifyVisit, completeGuide } from '../src/world/guide';
import type { AttemptEvidence, SaveData } from '../src/core/types';

function memSave(): { data: SaveData; persist: () => void } {
  return { data: defaultSave(), persist: () => {} };
}

const ev = (over: Partial<AttemptEvidence>): AttemptEvidence => ({
  activityId: 'float-sink', skillIds: ['prediction'], success: true,
  durationMs: 8000, tries: 1, hintsUsed: 0, at: Date.now(), ...over,
});

describe('save migration v1 → v2 (no data loss)', () => {
  it('adds onboard[] and per-skill contexts[] to old saves', () => {
    const old = defaultSave();
    delete (old as Partial<SaveData>).onboard;
    old.version = 1;
    old.skills = { memory: { strength: 0.8, plays: 2, successes: 2, lastPlayedAt: 1, needsHelp: false } as never };
    const m = migrateSave(old);
    expect(m.version).toBe(2);
    expect(m.onboard).toEqual([]);
    expect(m.skills['memory'].contexts).toEqual([]);
    expect(m.skills['memory'].strength).toBe(0.8); // untouched
    expect(m.world.coins).toBe(20);
  });
  it('fresh saves already carry v2 fields', () => {
    const d = defaultSave();
    expect(d.version).toBe(2);
    expect(d.onboard).toEqual([]);
  });
});

describe('voice backend abstraction (same API, swappable)', () => {
  const backend = (spoken: string[]): VoiceBackend => ({
    id: 'mock',
    available: () => true,
    speak: (t) => { spoken.push(t); },
    stop: () => {},
  });
  it('delegates speak/stop to the backend and keeps lastText replay', () => {
    const spoken: string[] = [];
    const v = new Voice(backend(spoken));
    v.settings = { voice: true, voiceRate: 1, music: false, sfx: false, reduceMotion: false, aiAssist: false };
    v.speak('مرحبا');
    expect(spoken).toEqual(['مرحبا']);
    spoken.length = 0;
    v.replay();
    expect(spoken).toEqual(['مرحبا']);
  });
  it('stays silent (never throws) when voice is off or backend unavailable', () => {
    const v = new Voice({ id: 'dead', available: () => false, speak: () => { throw new Error('x'); }, stop: () => {} });
    v.settings = { voice: true, voiceRate: 1, music: false, sfx: false, reduceMotion: false, aiAssist: false };
    expect(() => v.speak('hi')).not.toThrow();
    v.settings!.voice = false;
    const spoken: string[] = [];
    const v2 = new Voice(backend(spoken));
    v2.settings = { voice: false, voiceRate: 1, music: false, sfx: false, reduceMotion: false, aiAssist: false };
    v2.speak('hi');
    expect(spoken).toEqual([]);
  });
  it('setBackend swaps implementation at runtime', () => {
    const a: string[] = []; const b: string[] = [];
    const v = new Voice(backend(a));
    v.settings = { voice: true, voiceRate: 1, music: false, sfx: false, reduceMotion: false, aiAssist: false };
    v.speak('one');
    v.setBackend(backend(b));
    v.speak('two');
    expect(a).toEqual(['one']);
    expect(b).toEqual(['two']);
  });
});

describe('skill transfer tracking (same concept, new context)', () => {
  it('records activity contexts and reports transfer at ≥2', () => {
    const m = memSave();
    const g = new SkillGraph(() => m.data, m.persist);
    g.record(ev({ activityId: 'bridge-count', skillIds: ['counting'] }));
    expect(g.transferred()).toEqual([]);
    g.record(ev({ activityId: 'shop', skillIds: ['counting'] }));
    const t = g.transferred();
    expect(t.map((x) => x.id)).toContain('counting');
    expect(t.find((x) => x.id === 'counting')!.contexts).toEqual(['bridge-count', 'shop']);
  });
  it('never duplicates a context', () => {
    const m = memSave();
    const g = new SkillGraph(() => m.data, m.persist);
    g.record(ev({ activityId: 'shop', skillIds: ['money'] }));
    g.record(ev({ activityId: 'shop', skillIds: ['money'] }));
    expect(m.data.skills['money'].contexts).toEqual(['shop']);
  });
});

describe('world mapper (persistence contract: saved ⇒ visible)', () => {
  it('every zone is a place on the island', () => {
    const objs = worldObjects(defaultSave());
    const zones = new Set(objs.filter((o) => o.kind === 'zone').map((o) => o.zone));
    for (const p of ZONE_PLOTS) expect(zones.has(p.zone)).toBe(true);
  });
  it('bridge appears only after it is earned', () => {
    expect(worldObjects(defaultSave()).some((o) => o.id === 'bridge')).toBe(false);
    const d = defaultSave();
    d.world.buildings.push('bridge');
    const b = worldObjects(d).find((o) => o.id === 'bridge');
    expect(b?.emoji).toBe('🌉');
  });
  it('robot companion, garden, films and city cluster follow the save', () => {
    const d = defaultSave();
    d.world.companions.push('🤖');
    d.world.garden.plants = 4;
    d.world.films.push({ title: 'فيلمي', scenes: ['🦁', '🐰'] });
    d.world.buildings.push('school', 'park');
    const objs = worldObjects(d);
    expect(objs.some((o) => o.id === 'comp-robot')).toBe(true);
    expect(objs.filter((o) => o.id.startsWith('plant-')).length).toBe(4);
    expect(objs.some((o) => o.id === 'cinema')).toBe(true);
    expect(objs.some((o) => o.id === 'city-school')).toBe(true);
  });
});

describe('project world gifts (artifacts enter the world, not a bare screen)', () => {
  function finishedSetup(defId: string, stepData: Record<string, Record<string, unknown>> = {}) {
    const m = memSave();
    const pe = new ProjectEngine(() => m.data, m.persist);
    pe.start(defId);
    const ps = m.data.projects[0];
    for (const st of ps.steps) {
      pe.completeStep(defId, st.stepId, stepData[st.stepId]);
    }
    return { m, pe };
  }
  it('p-robot leaves a living companion', () => {
    const { m, pe } = finishedSetup('p-robot', { parts: { parts: ['🤖', '📦', '🛞'] } });
    pe.finish('p-robot', { kind: 'p-robot', title: 'روبوت', emoji: '🤖', description: '', createdAt: 0 });
    expect(m.data.world.companions).toContain('🤖');
    expect(worldObjects(m.data).some((o) => o.id === 'comp-robot')).toBe(true);
  });
  it('p-film stores a watchable film with its cast', () => {
    const { m, pe } = finishedSetup('p-film', { chars: { cast: ['🦁', '🐰'] } });
    pe.finish('p-film', { kind: 'p-film', title: 'فيلمي', emoji: '🎬', description: '', createdAt: 0 });
    expect(m.data.world.films).toEqual([{ title: 'فيلمي', scenes: ['🦁', '🐰'] }]);
  });
  it('p-garden grows real plants', () => {
    const { m, pe } = finishedSetup('p-garden');
    pe.finish('p-garden', { kind: 'p-garden', title: 'حديقة', emoji: '🌱', description: '', createdAt: 0 });
    expect(m.data.world.garden.plants).toBe(3);
  });
});

describe('first-steps guide (pure onboarding logic)', () => {
  it('walks lab → make → city in order', () => {
    const d = defaultSave();
    expect(guideStep(d)?.id).toBe('meet-lab');
    expect(guideNotifyActivity(d, 'float-sink')).toEqual(['meet-lab']);
    expect(guideStep(d)?.target).toBe('make');
    expect(guideNotifyActivity(d, 'float-sink')).toEqual([]); // no double count
    expect(guideNotifyActivity(d, 'bridge-count')).toEqual(['make']);
    expect(guideStep(d)?.target).toBe('city');
    expect(guideNotifyVisit(d, 'home')).toBe(false); // wrong place: no advance
    const coins = d.world.coins;
    expect(guideNotifyVisit(d, 'city')).toBe(true);
    expect(d.world.coins).toBe(coins + 10);
    expect(guideStep(d)).toBeNull();
  });
  it('drawing counts as making', () => {
    const d = defaultSave();
    guideNotifyActivity(d, 'magnet');
    expect(completeGuide(d, 'make')).toBe(true);
    expect(completeGuide(d, 'make')).toBe(false);
  });
  it('spy check: guide never blocks when already done', () => {
    const d = defaultSave();
    d.onboard.push('done');
    expect(guideStep(d)).toBeNull();
    expect(vi.fn()).toBeDefined();
  });
});
