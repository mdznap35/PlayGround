/* Capped, pooled particle system. One array, no allocation in loop. */

export type ParticleKind = 'spark' | 'bubble' | 'leaf' | 'note' | 'drop' | 'puff' | 'star' | 'heart';

interface P {
  alive: boolean; kind: ParticleKind;
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; size: number; rot: number; vr: number;
}

const MAX = 160;
const COLORS: Record<ParticleKind, string[]> = {
  spark: ['#ffd76e', '#fff3c4', '#ffb63d'],
  bubble: ['rgba(180,225,255,0.8)', 'rgba(255,255,255,0.7)'],
  leaf: ['#7ed492', '#4da96a', '#a8e6b0'],
  note: ['#b3a8ff', '#7c6cf0'],
  drop: ['#5db9f5', '#9adcff'],
  puff: ['rgba(255,255,255,0.75)', 'rgba(230,235,245,0.6)'],
  star: ['#ffd76e', '#fff7d6'],
  heart: ['#ff8f9e', '#ff6b7e'],
};

export class Particles {
  private pool: P[] = [];
  constructor() {
    for (let i = 0; i < MAX; i++) {
      this.pool.push({ alive: false, kind: 'spark', x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 4, rot: 0, vr: 0 });
    }
  }

  spawn(kind: ParticleKind, x: number, y: number, n: number, spread = 60, up = -60): void {
    let c = 0;
    for (const p of this.pool) {
      if (p.alive) continue;
      p.alive = true; p.kind = kind;
      p.x = x + (Math.random() - 0.5) * 14;
      p.y = y + (Math.random() - 0.5) * 14;
      p.vx = (Math.random() - 0.5) * spread * 2;
      p.vy = up * (0.4 + Math.random() * 0.9);
      p.maxLife = 0.9 + Math.random() * 0.9;
      p.life = p.maxLife;
      p.size = kind === 'puff' ? 7 + Math.random() * 7 : 3 + Math.random() * 5;
      p.rot = Math.random() * Math.PI;
      p.vr = (Math.random() - 0.5) * 4;
      if (++c >= n) break;
    }
  }

  update(dt: number): void {
    const s = dt / 1000;
    for (const p of this.pool) {
      if (!p.alive) continue;
      p.life -= s;
      if (p.life <= 0) { p.alive = false; continue; }
      p.x += p.vx * s; p.y += p.vy * s;
      p.vy += (p.kind === 'bubble' ? -30 : p.kind === 'leaf' ? 26 : 130) * s;
      p.vx *= 1 - 0.9 * s;
      p.rot += p.vr * s;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.pool) {
      if (!p.alive) continue;
      const a = Math.max(0, p.life / p.maxLife);
      const cols = COLORS[p.kind];
      ctx.globalAlpha = a;
      ctx.fillStyle = cols[(Math.abs(p.x + p.y) | 0) % cols.length];
      if (p.kind === 'bubble') {
        ctx.strokeStyle = cols[0];
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * a + 1, 0, Math.PI * 2); ctx.stroke();
      } else if (p.kind === 'star' || p.kind === 'spark') {
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        const r = p.size * (0.5 + a * 0.5);
        ctx.fillRect(-r, -r * 0.28, r * 2, r * 0.56);
        ctx.fillRect(-r * 0.28, -r, r * 0.56, r * 2);
        ctx.restore();
      } else if (p.kind === 'note') {
        ctx.font = `${p.size + 8}px serif`;
        ctx.fillText('♪', p.x, p.y);
      } else if (p.kind === 'heart') {
        ctx.font = `${p.size + 8}px serif`;
        ctx.fillText('♥', p.x, p.y);
      } else {
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.size * a + 0.5, p.size * 0.7 * a + 0.5, p.rot, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  clear(): void { for (const p of this.pool) p.alive = false; }

  /** live count (used by tests + perf guards) */
  aliveCount(): number {
    let n = 0;
    for (const p of this.pool) if (p.alive) n++;
    return n;
  }
}
