/* SaveSystem: versioned, autosaving, crash-safe (backup slot + migrations). */

import type { SaveData, Avatar } from './types';
import { bus } from './events';

export const SAVE_VERSION = 3;
const KEY = 'nova.save.v1'; // key unchanged on purpose: v1 data migrates in place
const BACKUP_KEY = 'nova.save.v1.backup';

export function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    childName: '',
    createdAt: Date.now(),
    skills: {},
    attempts: [],
    projects: [],
    museum: [],
    quests: [],
    world: { buildings: ['home'], unlockedZones: ['home'], companions: [], coins: 20, films: [], garden: { plants: 0, animals: [] } },
    settings: { voice: true, voiceRate: 0.95, music: true, sfx: true, reduceMotion: false, aiAssist: true },
    passport: [],
    spotlight: {},
    onboard: [],
    avatar: { tint: 'violet', charm: 'none', claimed: false },
  };
}

/** Migration chain: v1 → v2 adds onboard[] + per-skill contexts[];
 * v2 → v3 adds avatar (my Nova). Exported for tests. */
export function migrateSave(data: SaveData): SaveData {
  if (typeof data.version !== 'number') data.version = 1;
  if (data.version < 2) {
    if (!Array.isArray(data.onboard)) data.onboard = [];
    for (const s of Object.values(data.skills)) {
      if (!Array.isArray((s as { contexts?: unknown }).contexts)) (s as { contexts: string[] }).contexts = [];
    }
  }
  if (data.version < 3) {
    const a = (data as Partial<SaveData>).avatar;
    if (!a || typeof a !== 'object') {
      (data as SaveData).avatar = { tint: 'violet', charm: 'none', claimed: false };
    } else {
      const tints = ['violet', 'teal', 'coral', 'sunny'];
      const charms = ['none', 'leaf', 'star', 'shell'];
      (data as SaveData).avatar = {
        tint: (tints.includes(a.tint) ? a.tint : 'violet') as Avatar['tint'],
        charm: (charms.includes(a.charm) ? a.charm : 'none') as Avatar['charm'],
        claimed: a.claimed === true,
      };
    }
  }
  data.version = SAVE_VERSION;
  return data;
}

function migrate(data: SaveData): SaveData {
  return migrateSave(data);
}

export class SaveSystem {
  data: SaveData;
  private timer: number | null = null;
  private dirty = false;

  constructor() {
    this.data = this.load();
    // autosave every 5s when dirty + on hide/close
    this.timer = window.setInterval(() => this.flush(), 5000);
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.flush(); });
    window.addEventListener('beforeunload', () => this.flush());
  }

  private load(): SaveData {
    for (const key of [KEY, BACKUP_KEY]) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw) as SaveData;
        if (!parsed || typeof parsed !== 'object' || !parsed.world) continue;
        return migrate({ ...defaultSave(), ...parsed });
      } catch { /* try backup */ }
    }
    return defaultSave();
  }

  markDirty(): void {
    this.dirty = true;
    bus.emit('save:dirty', null);
  }

  flush(): void {
    if (!this.dirty) return;
    try {
      const prev = localStorage.getItem(KEY);
      if (prev) localStorage.setItem(BACKUP_KEY, prev);
      localStorage.setItem(KEY, JSON.stringify(this.data));
      this.dirty = false;
      bus.emit('save:flushed', null);
    } catch (e) {
      console.error('[save] flush failed', e);
    }
  }

  /** Force immediate write (used by tests & critical checkpoints). */
  saveNow(): void {
    this.dirty = true;
    this.flush();
  }

  reset(): void {
    this.data = defaultSave();
    this.saveNow();
    bus.emit('save:reset', null);
  }

  update(fn: (d: SaveData) => void): void {
    fn(this.data);
    this.markDirty();
  }

  destroy(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
  }
}
