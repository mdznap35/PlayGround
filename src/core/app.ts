/* AppContext: the single object screens receive. Wires all core systems. */

import { SaveSystem } from './save';
import { AudioManager } from './audio';
import { Voice } from './voice';
import { SkillGraph } from './skills';
import { ProjectEngine } from './projects';
import { Analytics } from './analytics';
import type { ActivityContext, AttemptEvidence, ZoneId } from './types';
import { bus } from './events';

export type ScreenName =
  | 'world' | 'home' | 'lab' | 'body' | 'mind' | 'make' | 'robot'
  | 'explorer' | 'space' | 'impossible' | 'stories' | 'music'
  | 'values' | 'city' | 'museum' | 'parents' | 'projects' | 'quests';

export class App {
  save = new SaveSystem();
  audio = new AudioManager();
  voice = new Voice();
  analytics = new Analytics();
  skills: SkillGraph;
  projects: ProjectEngine;
  go: (name: ScreenName, param?: string) => void = () => {};

  constructor() {
    this.skills = new SkillGraph(() => this.save.data, () => this.save.markDirty());
    this.projects = new ProjectEngine(() => this.save.data, () => this.save.markDirty());
    this.audio.settings = this.save.data.settings;
    this.voice.settings = this.save.data.settings;
  }

  ctx(): ActivityContext {
    return {
      say: (text, opts) => {
        bus.emit('nova:say', { text });
        this.voice.speak(opts?.en ?? text, opts?.en ? 'en' : 'ar');
      },
      hint: (_level, text) => {
        bus.emit('nova:say', { text });
        this.voice.speak(text);
      },
      report: (ev: Omit<AttemptEvidence, 'at'>) => {
        this.skills.record({ ...ev, at: Date.now() });
        this.analytics.track('activity:attempt', { id: ev.activityId, success: ev.success });
        // first-steps guide advances from real play (central hook, no per-screen code)
        if (ev.success) {
          import('../world/guide').then(({ guideNotifyActivity }) => {
            const fresh = guideNotifyActivity(this.save.data, ev.activityId);
            if (fresh.length) {
              this.save.markDirty();
              bus.emit('toast', { text: '✨ خطوة جديدة في عالمك!' });
            }
          });
        }
        // quests stay alive: any real play counts toward matching quest steps
        if (ev.success) {
          import('./content').then(({ QUESTS }) => {
            let changed = false;
            for (const q of QUESTS) {
              for (const st of q.steps) {
                if (st.activityId === ev.activityId) {
                  const qp = this.save.data.quests.find((x) => x.questId === q.id);
                  if (!qp?.stepsDone.includes(st.id)) {
                    this.visitActivity(q.id, st.id);
                    changed = true;
                  }
                }
              }
              const qp = this.save.data.quests.find((x) => x.questId === q.id);
              if (qp && !qp.done && qp.stepsDone.length >= q.steps.length) {
                qp.done = true;
                this.save.update((d) => { d.world.coins += q.rewardCoins; });
                bus.emit('toast', { text: `🏆 أنهيت مغامرة ${q.title}! +${q.rewardCoins} 🪙` });
                bus.emit('nova:mood', { mood: 'celebrate' as const });
                this.audio.sfx('win');
                this.voice.speak(`رائع! أنهيت مغامرة ${q.title}!`);
              }
            }
            if (changed) this.save.markDirty();
          });
        }
      },
      earnCoins: (n, reason) => {
        this.save.update((d) => { d.world.coins += n; });
        this.analytics.track('coins', { n, reason });
        bus.emit('toast', { text: `+${n} 🪙 ${reason}` });
        this.audio.sfx('coin');
      },
      spotlight: (theme) => {
        this.save.update((d) => { d.spotlight[theme] = (d.spotlight[theme] ?? 0) + 1; });
      },
    };
  }

  unlockZone(z: ZoneId): void {
    if (!this.save.data.world.unlockedZones.includes(z)) {
      this.save.update((d) => { d.world.unlockedZones.push(z); });
      bus.emit('toast', { text: '🌟 منطقة جديدة انفتحت!' });
    }
  }

  visitActivity(questId: string, stepId: string): void {
    this.save.update((d) => {
      let q = d.quests.find((x) => x.questId === questId);
      if (!q) { q = { questId, stepsDone: [], done: false }; d.quests.push(q); }
      if (!q.stepsDone.includes(stepId)) q.stepsDone.push(stepId);
    });
  }
}
