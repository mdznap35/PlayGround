/* InteractionFeedback: the visual language of understanding.
   Touchable things breathe; important things glow; errors wobble the world
   instead of showing text; success blooms. All cues pair with AudioManager. */

import type { AudioManager } from '../core/audio';
import type { Particles } from './particles';

export class Feedback {
  constructor(private fx: Particles, private audio: AudioManager) {}

  /** success: bloom + happy sound */
  celebrate(x: number, y: number, big = false): void {
    this.fx.spawn('spark', x, y - 20, big ? 26 : 14);
    this.fx.spawn('star', x, y - 30, big ? 10 : 5);
    this.audio.sfx('good');
  }

  win(x: number, y: number): void {
    this.celebrate(x, y, true);
    this.audio.sfx('win');
  }

  /** gentle error: wobble + curious sound — never a "wrong" screen */
  oops(x: number, y: number): void {
    this.fx.spawn('puff', x, y, 6, 40, -30);
    this.audio.sfx('bad');
  }

  discover(x: number, y: number): void {
    this.fx.spawn('spark', x, y, 10);
    this.audio.sfx('pop');
  }

  coin(x: number, y: number): void {
    this.fx.spawn('star', x, y, 8);
    this.audio.sfx('coin');
  }

  splash(x: number, y: number): void {
    this.fx.spawn('drop', x, y, 12, 90, -120);
    this.audio.sfx('splash');
  }

  build(x: number, y: number): void {
    this.fx.spawn('puff', x, y, 8, 50, -40);
    this.audio.sfx('build');
  }

  tap(): void {
    this.audio.sfx('tap');
  }
}

/** Gentle attention pulse for tappable things (breathing, not blinking). */
export function breathe(t: number, phase = 0): number {
  return 1 + 0.045 * Math.sin(t / 520 + phase);
}

/** Spotlight ring: marks THE thing to touch right now (onboarding/objective). */
export function spotlight(
  ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number, reduceMotion: boolean,
): void {
  const pulse = reduceMotion ? 0.65 : 0.45 + 0.3 * Math.sin(t / 300);
  ctx.strokeStyle = `rgba(255,205,90,${pulse})`;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(x, y, r + (reduceMotion ? 0 : 7 * Math.sin(t / 300)), 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, r + (reduceMotion ? 4 : 12 + 7 * Math.sin(t / 300)), 0, Math.PI * 2);
  ctx.stroke();
  if (!reduceMotion) {
    // bouncing finger from above — no reading required
    const ay = y - r - 34 - 10 * Math.abs(Math.sin(t / 320));
    ctx.font = '30px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('👇', x, ay);
  }
}
