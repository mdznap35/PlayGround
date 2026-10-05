/* ProjectEngine: reusable machine — steps, goals, state, validation,
   save/resume, artifact → museum + world. New projects = data only. */

import { PROJECTS } from './content';
import type { Artifact, ProjectSave, SaveData } from './types';
import { bus } from './events';

export class ProjectEngine {
  constructor(private save: () => SaveData, private persist: () => void) {}

  active(): ProjectSave[] {
    return this.save().projects.filter((p) => p.status === 'active');
  }

  start(defId: string): ProjectSave {
    const d = this.save();
    const existing = d.projects.find((p) => p.defId === defId && p.status === 'active');
    if (existing) return existing;
    const def = PROJECTS.find((p) => p.id === defId);
    if (!def) throw new Error(`unknown project ${defId}`);
    const ps: ProjectSave = {
      defId, status: 'active', startedAt: Date.now(), updatedAt: Date.now(),
      steps: def.steps.map((s) => ({ stepId: s.id, done: false })),
    };
    d.projects.push(ps);
    this.persist();
    bus.emit('project:started', { defId });
    return ps;
  }

  completeStep(defId: string, stepId: string, data?: Record<string, unknown>): boolean {
    const d = this.save();
    const ps = d.projects.find((p) => p.defId === defId && p.status === 'active');
    if (!ps) return false;
    const st = ps.steps.find((s) => s.stepId === stepId);
    if (!st || st.done) return false;
    st.done = true;
    if (data) st.data = data;
    ps.updatedAt = Date.now();
    this.persist();
    bus.emit('project:step', { defId, stepId });
    return true;
  }

  isComplete(defId: string): boolean {
    const ps = this.save().projects.find((p) => p.defId === defId && p.status === 'active');
    return !!ps && ps.steps.every((s) => s.done);
  }

  finish(defId: string, artifact: Artifact): void {
    const d = this.save();
    const ps = d.projects.find((p) => p.defId === defId && p.status === 'active');
    if (!ps) return;
    const def = PROJECTS.find((p) => p.id === defId);
    ps.status = 'done';
    ps.artifact = artifact;
    ps.updatedAt = Date.now();
    d.museum.push({ ...artifact, id: `m-${Date.now()}`, projectId: defId });
    if (def?.rewardBuilding && !d.world.buildings.includes(def.rewardBuilding)) {
      d.world.buildings.push(def.rewardBuilding);
    }
    // world gifts: the creation enters the child's world as a living thing
    const gift = def?.worldGift;
    if (gift?.companion && !d.world.companions.includes(gift.companion)) {
      d.world.companions.push(gift.companion);
    }
    if (gift?.film) {
      const castStep = ps.steps.find((s) => s.stepId === 'chars');
      const data = (castStep?.data ?? {}) as { cast?: unknown; parts?: unknown };
      const scenes = Array.isArray(data.cast) ? (data.cast as string[])
        : Array.isArray(data.parts) ? (data.parts as string[]) : ['🎬'];
      d.world.films.push({ title: artifact.title, scenes });
    }
    if (gift?.plants) {
      d.world.garden.plants += gift.plants;
    }
    d.world.coins += 20;
    if (!d.world.unlockedZones.includes('museum')) d.world.unlockedZones.push('museum');
    this.persist();
    bus.emit('project:finished', { defId, artifact });
  }
}
