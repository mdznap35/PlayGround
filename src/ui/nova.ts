/* NovaGuide: the gentle companion. Speaks only when needed:
   screen entry, hints, celebration. Never nags (cooldown + dismiss). */

import { bus } from '../core/events';
import { el } from './helpers';
import { MoodController, type NovaMood } from './moods';

export class NovaGuide {
  private layer: HTMLElement;
  private bubble: HTMLElement | null = null;
  private lastShown = 0;
  private speak: (text: string) => void;
  /** Emotional state for the 2.0 character layer (CSS hooks only for now). */
  readonly moods = new MoodController();

  constructor(speak: (text: string) => void) {
    this.speak = speak;
    this.layer = el('div');
    this.layer.id = 'nova-layer';
    document.body.append(this.layer);
    bus.on<{ text: string }>('nova:say', ({ text }) => this.say(text, false));
    bus.on<{ mood: NovaMood }>('nova:mood', ({ mood }) => {
      this.moods.setMood(mood);
      this.applyMood();
    });
    this.moods.onChange(() => this.applyMood());
  }

  private applyMood(): void {
    if (this.bubble) this.bubble.className = `nova-bubble mood-${this.moods.current}`;
  }

  say(text: string, voice = true): void {
    const now = Date.now();
    if (now - this.lastShown < 800) return;
    this.lastShown = now;
    this.layer.innerHTML = '';
    const b = el('div', 'nova-bubble');
    const face = el('div', 'nova-face', '✨');
    const t = el('div', 'nova-text', text);
    const hear = el('button', 'nova-hear', '🔊') as HTMLButtonElement;
    hear.setAttribute('aria-label', 'اسمع مرة أخرى');
    hear.onclick = (e) => { e.stopPropagation(); this.speak(text); };
    const ok = el('button', 'nova-next', 'حاضر!') as HTMLButtonElement;
    ok.onclick = () => { this.layer.innerHTML = ''; this.bubble = null; };
    b.append(face, t, hear, ok);
    this.layer.append(b);
    this.bubble = b;
    if (voice) this.speak(text);
    window.setTimeout(() => {
      if (this.bubble === b) { this.layer.innerHTML = ''; this.bubble = null; }
    }, 12000);
  }

  hide(): void {
    this.layer.innerHTML = '';
    this.bubble = null;
  }
}

export function toasts(): void {
  let layer = document.getElementById('toast-layer');
  if (!layer) {
    layer = el('div');
    layer.id = 'toast-layer';
    document.body.append(layer);
  }
  bus.on<{ text: string }>('toast', ({ text }) => {
    const t = el('div', 'toast', text);
    layer!.append(t);
    window.setTimeout(() => t.remove(), 3200);
  });
}
