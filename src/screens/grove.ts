/* GROVE — "الغابة التي نسيت كيف تنمو" (The Forest That Forgot How to Grow).
   A twilight glade where water forgot its way. No menus, no quiz, no labels.
   Verbs: DRAG stones out of dams · TAP clouds aside · TAP critters · WATCH.
   Water + light make plants grow in stages; weak combos stay pale (never wrong).
   All beds blooming at once = the chain reaction (WOW) → the grove joins NOVA. */

import type { App } from '../core/app';
import { decide } from '../core/adaptive';
import { bus } from '../core/events';
import type { Difficulty } from '../core/types';
import { Feedback, spotlight } from '../engine/feedback';
import { WorldScene, type SceneObj } from '../engine/scene';
import { el } from '../ui/helpers';
import { mountScreen } from './shell';
import { drawNova, lookFromAvatar, type NovaMood } from '../engine/art';
import {
  bedLit, blockedSegs, chainComplete, groveLayout, groveStalled, growthTick,
  wateredBeds, wetSegs, type GroveBed,
} from '../world/grove';

const W = 720;
const H = 1080;

/* Channel polylines per segment (must match grove.ts topology). */
const SEG_PATHS: Record<string, [number, number][]> = {
  s0: [[360, 170], [360, 300]],
  s1: [[360, 300], [360, 430], [360, 505]],
  s2: [[360, 505], [310, 570], [250, 640]],
  s3: [[360, 560], [420, 585], [470, 620], [470, 700]],
  s4: [[360, 560], [360, 660], [360, 780], [300, 815], [250, 830]],
  s4b: [[360, 780], [430, 820], [500, 860]],
};
const FLOWER = ['#ff8fb0', '#ffd76e', '#b3a8ff', '#ff6b7e'];

/* ---------- tiny grove synth (Prototype backend; respects settings) ---------- */
class GroveSynth {
  private ctx: AudioContext | null = null;
  constructor(private app: App) {}
  private tone(freq: number, dur: number, type: OscillatorType, vol: number, when = 0): void {
    if (!this.app.save.data.settings.sfx) return;
    try {
      if (!this.ctx) this.ctx = new AudioContext();
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      const t = this.ctx.currentTime + when;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(this.ctx.destination);
      o.start(t); o.stop(t + dur + 0.05);
    } catch { /* never break play */ }
  }
  plop(): void { this.tone(300, 0.12, 'sine', 0.12); this.tone(520, 0.1, 'sine', 0.08, 0.06); }
  drop(): void { this.tone(700, 0.2, 'sine', 0.07); this.tone(1050, 0.25, 'sine', 0.05, 0.08); }
  sprout(): void { this.tone(660, 0.15, 'triangle', 0.1); this.tone(880, 0.2, 'triangle', 0.08, 0.1); }
  bird(): void { const b = 1800 + Math.random() * 600; this.tone(b, 0.09, 'sine', 0.05); this.tone(b * 1.2, 0.09, 'sine', 0.04, 0.1); }
  wave(): void {
    [523, 587, 659, 784, 880, 1047].forEach((f, i) => this.tone(f, 0.5, 'triangle', 0.1, i * 0.12));
    [1568, 2093].forEach((f, i) => this.tone(f, 0.8, 'sine', 0.05, 0.7 + i * 0.2));
  }
  oops(): void { this.tone(320, 0.2, 'triangle', 0.07); }
}

export interface GroveProgress {
  seed: number; diff: Difficulty;
  stages: number[]; growth: number[];
  damStones: Record<string, number>;
  at: number;
}

export function grove(app: App, root: HTMLElement): void {
  const s = mountScreen(root);
  s.classList.add('grove-screen');
  const d = app.save.data;
  const rm = d.settings.reduceMotion;

  const chrome = el('div', 'world-chrome');
  const home = el('button', 'orb', '🏠') as HTMLButtonElement;
  home.setAttribute('aria-label', 'رجوع');
  const replay = el('button', 'orb', '🔊') as HTMLButtonElement;
  replay.setAttribute('aria-label', 'إعادة الصوت');
  chrome.append(home, replay);
  s.append(chrome);

  const canvas = document.createElement('canvas');
  canvas.className = 'world-canvas grove-canvas';
  canvas.setAttribute('aria-label', 'غابة الغروب');
  s.append(canvas);

  const scene = new WorldScene(canvas, { worldW: W, worldH: H, reduceMotion: rm, background: '#16213d' });
  scene.panEnabled = false; // fixed glade: drags are for stones, never the camera
  const fx = new Feedback(scene.particles, app.audio);
  const synth = new GroveSynth(app);

  // ---- difficulty from real adaptive history (first visit = gentle) ----
  const dec = decide(d.attempts, 'grove-keep');
  const diff = dec.difficulty;
  const doneBefore = (d.grove?.completedAt ?? 0) > 0;
  const seed = (Date.now() % 100000) + (d.grove?.blooms ?? 0) * 101;

  // ---- resume an interrupted visit (snapshot written on every bloom) ----
  let layout = groveLayout(diff, seed);
  let resumed = false;
  const prog = d.groveProgress as GroveProgress | undefined;
  if (prog && prog.diff === diff && Date.now() - prog.at < 7 * 24 * 3600 * 1000 && prog.stages.length === layout.beds.length) {
    const re = groveLayout(diff, prog.seed);
    re.beds.forEach((b, i) => {
      b.growth = prog.growth[i] ?? 0;
      b.stage = Math.min(3, Math.max(0, Math.floor(prog.stages[i] ?? 0))) as 0 | 1 | 2 | 3;
    });
    for (const dam of re.dams) {
      if (prog.damStones[dam.id] !== undefined) dam.stones = prog.damStones[dam.id];
    }
    layout = re;
    resumed = prog.stages.some((st) => st > 0);
  }

  // ---- live state ----
  let stonesRemoved = 0;
  let firstClearWatered: boolean | null = null;
  let reblocked = 0;
  let cloudTaps = 0;
  let hints = 0;
  let lastProgressAt = performance.now();
  let stallSaid = false;
  let waved = false;
  let finished = false;
  let waveT0 = 0;
  let firefliesOut = layout.beds.some((b) => b.stage >= 3);
  let hedgehogOut = false;
  const t0 = Date.now();

  const say = (() => {
    const said = new Set<string>();
    let lastLine = '';
    replay.onclick = () => { app.audio.sfx('tap'); if (lastLine) app.voice.speak(lastLine, 'ar', true); };
    return (key: string, text: string) => {
      if (said.has(key)) return;
      said.add(key); lastLine = text;
      bus.emit('nova:say', { text });
      app.voice.speak(text, 'ar', true);
    };
  })();

  const wetOf = () => wateredBeds(layout, blockedSegs(layout.dams));

  const snapshot = () => {
    try {
      const damStones: Record<string, number> = {};
      for (const dm of layout.dams) damStones[dm.id] = dm.stones;
      app.save.update((sv) => {
        sv.groveProgress = {
          seed, diff,
          stages: layout.beds.map((b) => b.stage),
          growth: layout.beds.map((b) => b.growth),
          damStones, at: Date.now(),
        };
      });
    } catch { /* progress must never break play */ }
  };

  // ================= NOVA (watches the spring, gazes at thirst) =================
  let novaMood: NovaMood = 'idle';
  let novaUntil = 0;
  let novaX = 560, novaY = 350;
  const setMood = (m: NovaMood, ms = 1600) => { novaMood = m; novaUntil = performance.now() + ms; };
  const thirstiest = (): GroveBed | null => {
    const wet = wetOf();
    const dry = layout.beds.filter((b) => !wet.has(b.id) && b.stage < 3);
    return dry[0] ?? null;
  };

  home.onclick = () => { app.audio.sfx('tap'); try { scene.destroy(); } catch { /* noop */ } app.go('world'); };

  // ================= SKY (dusk that warms as the grove wakes) =================
  const bloomCount = () => layout.beds.filter((b) => b.stage >= 3).length;
  scene.addLayer({
    parallax: 0.05,
    paint: (ctx, t) => {
      const k = Math.min(1, bloomCount() / Math.max(1, layout.beds.length)) * 0.7;
      const g = ctx.createLinearGradient(0, 0, 0, 620);
      g.addColorStop(0, '#1b2452');
      g.addColorStop(0.6, '#3d3a6e');
      g.addColorStop(1, `rgb(${122 + k * 60},${110 + k * 40},${140 - k * 20})`);
      ctx.fillStyle = g;
      ctx.fillRect(-100, -100, W + 200, 720);
      // early stars
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      for (let i = 0; i < 34; i++) {
        const sx = (i * 211 + 60) % W;
        const sy = (i * 131 + 40) % 380;
        const tw = rm ? 0.7 : 0.4 + 0.4 * Math.sin(t / 600 + i * 2.1);
        ctx.globalAlpha = Math.max(0.15, tw) * (1 - k * 0.6);
        const sz = i % 6 === 0 ? 4 : 2.5;
        ctx.fillRect(sx, sy, sz, sz);
      }
      ctx.globalAlpha = 1;
      // low amber sun-band on the horizon
      ctx.fillStyle = `rgba(255,170,110,${0.25 + k * 0.3})`;
      ctx.beginPath(); ctx.ellipse(560, 470, 180, 34, 0, 0, Math.PI * 2); ctx.fill();
    },
  });

  // ================= CANOPY + GROUND =================
  scene.addLayer({
    parallax: 1,
    paint: (ctx, t) => {
      // dark canopy crown across the top
      ctx.fillStyle = '#14342b';
      for (let i = 0; i < 9; i++) {
        const cx = 20 + i * 82;
        const sway = rm ? 0 : Math.sin(t / 1400 + i) * 5;
        ctx.beginPath(); ctx.arc(cx + sway, 60, 62, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#0f2a22';
      ctx.fillRect(-100, 0, W + 200, 46);
      // hanging moss strands
      ctx.strokeStyle = 'rgba(95,174,107,0.5)'; ctx.lineWidth = 3;
      for (let i = 0; i < 12; i++) {
        const mx = 40 + i * 58;
        const sway = rm ? 0 : Math.sin(t / 1100 + i * 1.3) * 6;
        ctx.beginPath(); ctx.moveTo(mx, 90); ctx.quadraticCurveTo(mx + sway, 130, mx + sway * 0.5, 150); ctx.stroke();
      }
      // mossy ground
      const g = ctx.createLinearGradient(0, 380, 0, H);
      g.addColorStop(0, '#2c5a44');
      g.addColorStop(1, '#16352a');
      ctx.fillStyle = g;
      ctx.fillRect(-100, 380, W + 200, H - 280);
      // light pools where sun lands
      ctx.fillStyle = 'rgba(255,220,150,0.10)';
      ctx.beginPath(); ctx.ellipse(360, 700, 260, 200, 0, 0, Math.PI * 2); ctx.fill();
      // carved streambed (dry clay under every channel)
      ctx.strokeStyle = '#6e5138'; ctx.lineCap = 'round';
      for (const seg of Object.keys(SEG_PATHS)) {
        const pts = SEG_PATHS[seg];
        ctx.lineWidth = seg === 's0' || seg === 's1' ? 30 : 24;
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.stroke();
      }
      // cracks in the dry bed
      ctx.strokeStyle = 'rgba(40,25,15,0.6)'; ctx.lineWidth = 2;
      for (let i = 0; i < 10; i++) {
        const cxp = 300 + ((i * 137) % 180);
        const cyp = 420 + ((i * 89) % 380);
        ctx.beginPath(); ctx.moveTo(cxp, cyp); ctx.lineTo(cxp + 14, cyp + 8); ctx.stroke();
      }
    },
  });

  // ================= SPRING (the source that never runs dry) =================
  const springObj: SceneObj = {
    id: 'spring', x: 360, y: 150, r: 70, depth: 200,
    draw: (ctx, t) => {
      const pulse = rm ? 1 : 1 + 0.05 * Math.sin(t / 500);
      ctx.save();
      ctx.translate(360, 150); ctx.scale(pulse, pulse); ctx.translate(-360, -150);
      // mossy rocks around the mouth
      ctx.fillStyle = '#3f6b52';
      for (const [rx, ry, rr2] of [[310, 150, 26], [410, 152, 30], [360, 118, 22]] as const) {
        ctx.beginPath(); ctx.arc(rx, ry, rr2, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 3; ctx.stroke();
      }
      // glowing mouth
      const g = ctx.createRadialGradient(360, 155, 4, 360, 155, 44);
      g.addColorStop(0, '#dff6ff');
      g.addColorStop(1, 'rgba(90,185,245,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(360, 155, 44, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#bfe9ff';
      ctx.beginPath(); ctx.ellipse(360, 155, 22, 14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    },
    onTap: () => { fx.splash(360, 155); synth.drop(); },
  };
  scene.addObject(springObj);

  // ================= STONES (draggable; the whole game in your fingers) =================
  interface Stone extends SceneObj { damId: string; homeX: number; homeY: number; gone: boolean; }
  const stones: Stone[] = [];
  for (const dam of layout.dams) {
    dam.slots.forEach((slot, k) => {
      const st: Stone = {
        id: `stone-${dam.id}-${k}`, damId: dam.id, homeX: slot.x, homeY: slot.y, gone: false,
        x: slot.x, y: slot.y, r: 30, depth: 400,
        draggable: true,
        draw: (ctx, t) => {
          if (st.gone) return;
          const bob = rm ? 0 : Math.sin(t / 700 + slot.x) * 1.5;
          ctx.fillStyle = '#8d8578';
          ctx.beginPath(); ctx.ellipse(st.x, st.y + bob, 24, 18, 0.2, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 3; ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,0.35)';
          ctx.beginPath(); ctx.ellipse(st.x - 7, st.y - 6 + bob, 7, 5, -0.4, 0, Math.PI * 2); ctx.fill();
        },
        onDrop: (target) => {
          void target;
          const dam = layout.dams.find((dd) => dd.id === st.damId)!;
          const backHome = Math.hypot(st.x - st.homeX, st.y - st.homeY) < 46;
          const inChannel = nearChannel(st.x, st.y);
          if (!st.gone && !backHome && !inChannel) {
            // freed! (dropped on open ground — the only place stones belong now)
            st.gone = true;
            dam.stones = Math.max(0, dam.stones - 1);
            stonesRemoved++;
            fx.splash(st.x, st.y);
            synth.plop();
            const newlyWet = wetOf();
            if (firstClearWatered === null) {
              firstClearWatered = newlyWet.size > 0;
              app.ctx().report({
                activityId: 'grove-keep', skillIds: ['prediction'], success: newlyWet.size > 0,
                durationMs: Date.now() - t0, tries: 1, hintsUsed: 0,
                errorKind: newlyWet.size > 0 ? undefined : 'dry-bed', difficulty: diff,
              });
            }
            if (newlyWet.size > 0 && !saidWater) { saidWater = true; setMood('discover', 2000); say('water', 'المي وصلت! شوف وين رايحة!'); }
            lastProgressAt = performance.now();
            snapshot();
          } else {
            // snap back to its dam slot (kind: nothing is ever "wrong")
            st.x = st.homeX; st.y = st.homeY;
            if (!backHome && inChannel && !st.gone) {
              reblocked++;
              fx.build(st.x, st.y);
              synth.plop();
            }
          }
        },
      };
      stones.push(st);
      scene.addObject(st);
    });
  }
  let saidWater = layout.beds.some((b) => b.stage > 0);

  // loose-stone pile: tap to send the last stone home (kind undo, feeds strategy evidence)
  const pileObj: SceneObj = {
    id: 'pile', x: 120, y: 950, r: 48, depth: 410,
    draw: (ctx, t) => {
      const back = stones.filter((st) => st.gone);
      if (!back.length) return;
      ctx.fillStyle = 'rgba(20,24,60,0.45)';
      ctx.beginPath(); ctx.ellipse(120, 956, 52, 18, 0, 0, Math.PI * 2); ctx.fill();
      back.slice(0, 4).forEach((_, i) => {
        ctx.fillStyle = '#8d8578';
        ctx.beginPath(); ctx.ellipse(100 + i * 16, 946 - (i % 2) * 8 + (rm ? 0 : Math.sin(t / 800 + i) * 1.5), 15, 11, 0.2, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 2.5; ctx.stroke();
      });
      if (!rm) spotlight(ctx, 120, 946, 44, t, true);
    },
    onTap: () => {
      const back = stones.filter((st) => st.gone);
      if (!back.length) return;
      const st = back[back.length - 1];
      const dam = layout.dams.find((dd) => dd.id === st.damId)!;
      st.gone = false;
      st.x = st.homeX; st.y = st.homeY;
      dam.stones += 1;
      reblocked++;
      fx.build(st.x, st.y);
      synth.plop();
      lastProgressAt = performance.now();
    },
  };
  scene.addObject(pileObj);

  function nearChannel(x: number, y: number): boolean {
    for (const pts of Object.values(SEG_PATHS)) {
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, ay] = pts[i];
        const [bx, by] = pts[i + 1];
        const dx = bx - ax, dy = by - ay;
        const len2 = dx * dx + dy * dy || 1;
        const k = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len2));
        if (Math.hypot(x - (ax + dx * k), y - (ay + dy * k)) < 30) return true;
      }
    }
    return false;
  }

  // ================= CLOUDS (tap aside → sun pours through) =================
  for (const cloud of layout.clouds) {
    const cObj: SceneObj = {
      id: cloud.id, x: cloud.x, y: 150, r: 85, depth: 150,
      draw: (ctx, t) => {
        const drift = rm ? 0 : Math.sin(t / 2600 + cloud.x) * 26;
        const x = cloud.x + drift;
        const cleared = performance.now() < cloud.clearedUntil;
        ctx.globalAlpha = cleared ? 0.35 : 0.95;
        ctx.fillStyle = cleared ? '#cfd8ec' : '#8e9ab5';
        ctx.beginPath();
        ctx.ellipse(x, 150, 92, 34, 0, 0, Math.PI * 2);
        ctx.ellipse(x - 58, 160, 48, 24, 0, 0, Math.PI * 2);
        ctx.ellipse(x + 60, 158, 52, 26, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        // shadow band on the ground = the mechanic, drawn honestly
        if (!cleared) {
          ctx.fillStyle = 'rgba(20,26,60,0.30)';
          ctx.beginPath(); ctx.ellipse(x, 620, cloud.halfWidth, 130, 0, 0, Math.PI * 2); ctx.fill();
        } else if (!rm) {
          // sun rays burst through the gap
          ctx.strokeStyle = 'rgba(255,220,150,0.5)'; ctx.lineWidth = 5;
          for (let i = -1; i <= 1; i++) {
            ctx.beginPath(); ctx.moveTo(x + i * 60, 200);
            ctx.lineTo(x + i * 90, 560 + 40 * Math.sin(t / 900 + i)); ctx.stroke();
          }
        }
      },
      onTap: () => {
        cloud.clearedUntil = performance.now() + layout.clearSecs * 1000;
        cloudTaps++;
        fx.splash(cloud.x, 200);
        synth.drop();
        setMood('look', 1200);
        lastProgressAt = performance.now();
      },
    };
    scene.addObject(cObj);
  }

  // ================= BEDS (growth you can watch) =================
  const now0 = () => performance.now();
  for (const bed of layout.beds) {
    const bObj: SceneObj = {
      id: bed.id, x: bed.x, y: bed.y, r: 62, depth: 420,
      draw: (ctx, t) => {
        const wet = wetOf();
        const watered = wet.has(bed.id);
        const lit = bedLit(bed, layout.clouds, t);
        drawBed(ctx, bed, watered, lit, t, rm, now0());
      },
      onTap: () => {
        fx.discover(bed.x, bed.y - 30);
        synth.plop();
        if (bed.stage >= 3) say(`bloom-${bed.id}`, 'زهرتك مبسوطة!');
      },
    };
    scene.addObject(bObj);
  }

  function drawBed(ctx: CanvasRenderingContext2D, bed: GroveBed, watered: boolean, lit: boolean, t: number, rm: boolean, now: number): void {
    void now;
    // soil mound
    ctx.fillStyle = watered ? '#5a3d28' : '#4a3520';
    ctx.beginPath(); ctx.ellipse(bed.x, bed.y + 16, 52, 18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 2.5; ctx.stroke();
    if (watered) {
      // pooled shimmer
      ctx.fillStyle = `rgba(120,200,245,${rm ? 0.4 : 0.3 + 0.15 * Math.sin(t / 500 + bed.x)})`;
      ctx.beginPath(); ctx.ellipse(bed.x, bed.y + 12, 40, 10, 0, 0, Math.PI * 2); ctx.fill();
    }
    if (lit && !rm) {
      ctx.fillStyle = 'rgba(255,230,160,0.20)';
      ctx.beginPath(); ctx.ellipse(bed.x, bed.y - 20, 44, 60, 0, 0, Math.PI * 2); ctx.fill();
    }
    const pale = bed.pale > 3;
    const sway = rm ? 0 : Math.sin(t / 900 + bed.x) * 3;
    const col = (c: string) => (pale ? '#9aa88f' : c);
    if (bed.stage === 0) {
      ctx.fillStyle = '#d9c49a';
      for (const [dx, dy] of [[-12, 4], [0, 0], [12, 6]] as const) {
        ctx.beginPath(); ctx.arc(bed.x + dx, bed.y + dy, 5, 0, Math.PI * 2); ctx.fill();
      }
    } else if (bed.stage === 1) {
      ctx.strokeStyle = col('#3f8a4f'); ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(bed.x, bed.y + 10); ctx.quadraticCurveTo(bed.x + sway, bed.y - 14, bed.x + sway, bed.y - 26); ctx.stroke();
      ctx.fillStyle = col('#5fd68a');
      ctx.beginPath(); ctx.ellipse(bed.x - 12 + sway, bed.y - 16, 12, 7, -0.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(bed.x + 12 + sway, bed.y - 22, 12, 7, 0.5, 0, Math.PI * 2); ctx.fill();
    } else if (bed.stage === 2) {
      ctx.fillStyle = col('#3f8a4f');
      for (const [dx, dy, r2] of [[-16, -8, 18], [14, -10, 20], [0, -24, 22]] as const) {
        ctx.beginPath(); ctx.arc(bed.x + dx + sway * 0.5, bed.y + dy, r2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 2; ctx.stroke();
    } else {
      // bloom: stem + colored flower + glow
      ctx.strokeStyle = col('#3f8a4f'); ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(bed.x, bed.y + 10); ctx.quadraticCurveTo(bed.x + sway, bed.y - 30, bed.x + sway, bed.y - 52); ctx.stroke();
      const fx2 = bed.x + sway, fy2 = bed.y - 62;
      const petal = FLOWER[layout.beds.indexOf(bed) % FLOWER.length];
      const open = Math.min(1, bed.growth - 2);
      ctx.fillStyle = petal;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + (rm ? 0 : t / 4000);
        ctx.beginPath();
        ctx.ellipse(fx2 + Math.cos(a) * 15 * open, fy2 + Math.sin(a) * 15 * open, 10 * open, 7 * open, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#fff3cf';
      ctx.beginPath(); ctx.arc(fx2, fy2, 8 * open, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = 'rgba(255,220,150,0.30)';
      ctx.beginPath(); ctx.arc(fx2, fy2, 30 + (rm ? 0 : 5 * Math.sin(t / 600)), 0, Math.PI * 2); ctx.fill();
    }
    if (pale && bed.stage < 3) {
      // droop mark: the world showing, not telling
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(bed.x + 30, bed.y - 34); ctx.lineTo(bed.x + 30, bed.y - 26); ctx.stroke();
    }
  }

  // ================= FLOWING WATER (drawn over wet channels) =================
  const flowObj: SceneObj = {
    id: 'flow', x: 360, y: 500, r: 0.0001, depth: 390,
    draw: (ctx, t) => {
      const wet = wetSegs(layout, blockedSegs(layout.dams));
      ctx.lineCap = 'round';
      for (const [seg, pts] of Object.entries(SEG_PATHS)) {
        if (!wet.has(seg)) continue;
        ctx.strokeStyle = 'rgba(120,200,245,0.85)';
        ctx.lineWidth = seg === 's0' || seg === 's1' ? 16 : 12;
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.stroke();
        if (!rm) {
          // travelling sparkles = direction + life, no arrows needed
          ctx.fillStyle = 'rgba(255,255,255,0.85)';
          for (let k = 0; k < 3; k++) {
            const ph = (t / 900 + k / 3 + pts[0][0] / 500) % 1;
            const total = pts.length - 1;
            const fi = Math.min(total - 0.001, ph * total);
            const i0 = Math.floor(fi), fr = fi - i0;
            const x = pts[i0][0] + (pts[i0 + 1][0] - pts[i0][0]) * fr;
            const y = pts[i0][1] + (pts[i0 + 1][1] - pts[i0][1]) * fr;
            ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
          }
        }
      }
    },
  };
  scene.addObject(flowObj);

  // ================= CRITTERS =================
  interface Fly { x: number; y: number; ph: number }
  const flies: Fly[] = [];
  const fliesObj: SceneObj = {
    id: 'flies', x: 360, y: 500, r: 0.0001, depth: 700,
    draw: (ctx, t) => {
      if (!firefliesOut) return;
      const blooms = layout.beds.filter((b) => b.stage >= 3);
      if (!blooms.length) return;
      while (flies.length < 3) flies.push({ x: 360, y: 300, ph: Math.random() * 6 });
      ctx.fillStyle = '#ffe98a';
      flies.forEach((f, i) => {
        const home = blooms[i % blooms.length];
        const tx = home.x + (rm ? 0 : Math.sin(t / 800 + f.ph) * 44);
        const ty = home.y - 70 + (rm ? 0 : Math.cos(t / 640 + f.ph) * 26);
        f.x += (tx - f.x) * 0.04; f.y += (ty - f.y) * 0.04;
        const gl = rm ? 0.8 : 0.4 + 0.5 * Math.abs(Math.sin(t / 300 + f.ph));
        ctx.globalAlpha = gl;
        ctx.beginPath(); ctx.arc(f.x, f.y, 4, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = gl * 0.35;
        ctx.beginPath(); ctx.arc(f.x, f.y, 10, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      });
    },
  };
  scene.addObject(fliesObj);

  const hedge = { x: -80, homeX: 150, y: 770, out: false };
  const hedgeObj: SceneObj = {
    id: 'hedge', x: 150, y: 770, r: 44, depth: 710,
    draw: (ctx, t) => {
      if (!hedge.out) return;
      if (!rm && hedge.x < hedge.homeX) hedge.x = Math.min(hedge.homeX, hedge.x + 1.1);
      const sniff = rm ? 0 : Math.sin(t / 300) * 2;
      ctx.fillStyle = '#8a6a4a';
      ctx.beginPath(); ctx.ellipse(hedge.x, hedge.y + sniff, 30, 20, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 3; ctx.stroke();
      // spines
      ctx.strokeStyle = '#5e4630'; ctx.lineWidth = 2.5;
      for (let i = 0; i < 7; i++) {
        const a = Math.PI + (i / 6) * Math.PI;
        ctx.beginPath();
        ctx.moveTo(hedge.x + Math.cos(a) * 22, hedge.y + sniff + Math.sin(a) * 14);
        ctx.lineTo(hedge.x + Math.cos(a) * 32, hedge.y + sniff + Math.sin(a) * 22);
        ctx.stroke();
      }
      // face
      ctx.fillStyle = '#ffd9b8';
      ctx.beginPath(); ctx.arc(hedge.x + 26, hedge.y - 2 + sniff, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2a2350';
      ctx.beginPath(); ctx.arc(hedge.x + 29, hedge.y - 4 + sniff, 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(hedge.x + 34, hedge.y + sniff, 2.8, 0, Math.PI * 2); ctx.fill();
    },
    onTap: () => {
      if (!hedge.out) return;
      fx.discover(hedge.x, hedge.y - 20);
      synth.bird();
      setMood('celebrate', 1200);
    },
  };
  scene.addObject(hedgeObj);

  // ================= growth ticker + stall watch (in draw of an invisible steward) =================
  let stewardLast = 0;
  const steward: SceneObj = {
    id: 'steward', x: -1000, y: -1000, r: 0.0001, depth: -1000,
    draw: (_ctx, t) => {
      const now = performance.now();
      const dt = stewardLast === 0 ? 0 : Math.min(0.5, (now - stewardLast) / 1000);
      stewardLast = now;
      const wet = wetOf();
      let progressed = false;
      for (const bed of layout.beds) {
        const watered = wet.has(bed.id);
        const lit = bedLit(bed, layout.clouds, now);
        const r = growthTick(bed, watered, lit, rm ? 0 : dt);
        if (r === 'bloom') {
          progressed = true;
          fx.celebrate(bed.x, bed.y - 40);
          synth.sprout();
          setMood('celebrate', 1500);
          if (!firefliesOut) {
            firefliesOut = true;
            say('firstbloom', 'زهرة! الغابة عم تصحى!');
          }
          snapshot();
        }
      }
      if (progressed) lastProgressAt = now;
      if (!finished && groveStalled(lastProgressAt, now, layout.dams.some((dm) => dm.stones > 0))) {
        if (!stallSaid) {
          stallSaid = true;
          hints++;
          setMood('point', 3000);
          say('stall', 'المي واقفة… في حجارة مسكّرة الطريق!');
        }
      }
      if (!finished && !waved && chainComplete(layout.beds)) {
        waved = true;
        waveT0 = now;
        finishChain();
      }
      void t;
    },
  };
  scene.addObject(steward);

  // ================= NOVA =================
  const novaObj: SceneObj = {
    id: 'nova', x: novaX, y: novaY, r: 44, depth: 900,
    draw: (ctx, t) => {
      const m = performance.now() > novaUntil ? 'idle' : novaMood;
      const th = thirstiest();
      const gx = m === 'point' ? undefined : th ? th.x : undefined;
      const gy = m === 'point' ? undefined : th ? th.y : undefined;
      drawNova(ctx, novaX, novaY, 30, { mood: m === 'point' ? 'point' : m, gazeX: gx, gazeY: gy }, t, rm,
        lookFromAvatar(app.save.data.avatar), app.save.data.avatar.charm);
    },
    onTap: () => {
      fx.discover(novaX, novaY - 30);
      setMood('celebrate', 900);
      synth.bird();
    },
  };
  scene.addObject(novaObj);

  // ================= WOW: the chain reaction =================
  function finishChain(): void {
    finished = true;
    setMood('celebrate', 4000);
    fx.win(360, 500);
    synth.wave();
    bus.emit('nova:mood', { mood: 'celebrate' as const });
    if (!hedgehogOut) { hedgehogOut = true; hedge.out = true; }
    const blooms = layout.beds.filter((b) => b.stage >= 3).length;
    const prev = d.grove;
    app.save.update((sv) => {
      sv.grove = {
        blooms: (prev?.blooms ?? 0) + blooms,
        bestChain: Math.max(prev?.bestChain ?? 0, blooms),
        completedAt: Date.now(),
        firefly: true,
      };
      delete sv.groveProgress;
      sv.museum.push({
        id: `grove-bloom-${Date.now()}`, kind: 'grove-bloom',
        title: 'زهرة الغابة', emoji: '🌸',
        description: 'فتّحت المي طريقها والغابة صحيت!',
        createdAt: Date.now(),
      });
      sv.world.garden.plants = Math.min(9, sv.world.garden.plants + 2);
      if (!sv.world.garden.animals.includes('✨')) sv.world.garden.animals.push('✨');
    });
    app.save.saveNow();
    app.ctx().report({
      activityId: 'grove-keep',
      skillIds: ['prediction', 'observation', 'sequencing', 'nature', 'problemSolving', 'spatial'],
      success: true, durationMs: Date.now() - t0,
      tries: stonesRemoved + cloudTaps + 1, hintsUsed: hints,
      strategyChanged: reblocked > 0, difficulty: diff,
    });
    app.ctx().earnCoins(12, 'الغابة صحيت!');
    say('finale', 'الغابة صحيت بسببك! شوف كيف الكل مبسوط!');
    // replay seed: a fresh glade grows beside this one
    const again = el('button', 'orb', '🌱') as HTMLButtonElement;
    again.setAttribute('aria-label', 'غابة جديدة');
    again.onclick = () => { app.audio.sfx('pop'); again.remove(); app.go('grove'); };
    const chrome = s.querySelector('.world-chrome');
    chrome?.append(again);
  }

  // wave rings overlay during the WOW
  const waveObj: SceneObj = {
    id: 'wave', x: 360, y: 600, r: 0.0001, depth: 800,
    draw: (ctx, t) => {
      if (!waved || rm) return;
      const k = Math.min(1, (performance.now() - waveT0) / 2600);
      for (let i = 0; i < 3; i++) {
        const kk = Math.max(0, Math.min(1, (k - i * 0.18) / 0.7));
        if (kk <= 0) continue;
        ctx.strokeStyle = `rgba(255,215,130,${0.8 * (1 - kk)})`;
        ctx.lineWidth = 8 * (1 - kk) + 2;
        ctx.beginPath(); ctx.ellipse(360, 620, 60 + kk * 420, 40 + kk * 260, 0, 0, Math.PI * 2); ctx.stroke();
      }
      if (!rm) scene.particles.spawn('leaf', 200 + Math.random() * 320, 500, 2, 60, -40);
      void t;
    },
  };
  scene.addObject(waveObj);

  scene.start();
  if (resumed) {
    say('back', 'رجعت عالغابة! كمّل من وين وقفت!');
  } else if (doneBefore) {
    say('again', 'الغابة ناطرتك! كل مرة شكل جديد!');
  } else {
    say('arrive', 'ششش… الغابة نايمة. المي محبوسة!');
  }
}
