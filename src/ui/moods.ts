/* Nova mood states — pure logic, no DOM. NovaGuide applies the current mood
   as a CSS class (`mood-<name>`) on its bubble; art direction can restyle
   per mood later without touching logic. Moods auto-revert to idle so a
   celebration never gets stuck on screen. */

export type NovaMood = 'idle' | 'talk' | 'celebrate' | 'think';

const VALID: NovaMood[] = ['idle', 'talk', 'celebrate', 'think'];

export class MoodController {
  private mood: NovaMood = 'idle';
  private timer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<(m: NovaMood) => void>();

  constructor(private holdMs = 4000) {}

  get current(): NovaMood { return this.mood; }

  onChange(fn: (m: NovaMood) => void): () => void {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }

  setMood(m: NovaMood, holdMs = this.holdMs): void {
    if (!VALID.includes(m)) return; // unknown moods are ignored, never crash
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    this.mood = m;
    this.emit();
    if (m !== 'idle') {
      this.timer = setTimeout(() => {
        this.timer = null;
        this.mood = 'idle';
        this.emit();
      }, Math.max(0, holdMs));
    }
  }

  private emit(): void {
    for (const fn of [...this.listeners]) {
      try { fn(this.mood); } catch { /* listener must never break mood */ }
    }
  }

  destroy(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.listeners.clear();
  }
}
