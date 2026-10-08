/* LAMPLIGHT — "مدينة الضوء" (City of Light).
   A night hill town with ONE sun-battery and sleeping lamps. No panels, no quiz.
   Verbs: TAP a mirror → it turns 45° · WATCH the living beam · PLAN the chain.
   Beam raycasts live; lamps drink light; streets wake lamp by lamp.
   Full circuit = the city wakes in a wave (WOW) → a tower stays on the island. */

import type { App } from '../core/app';
import { decide } from '../core/adaptive';
import { bus } from '../core/events';
import type { Difficulty } from '../core/types';
import { Feedback, spotlight } from '../engine/feedback';import { WorldScene, type SceneObj } from '../engine/scene';
import { el } from '../ui/helpers';
import { mountScreen } from './shell';
import { drawNova, drawWalker, lookFromAvatar, type NovaMood } from '../engine/art';
import {
  hintMirror, lampLayout, traceBeam, type LampLayout,
} from '../world/lampnet';

const W = 720;
const H = 1080;

/* ---------- tiny night-city synth (Prototype backend; respects settings) ---------- */
class LampSynth {
  private ctx: AudioContext | null = null;
  private padTimer: ReturnType<typeof setInterval> | null = null;
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
      g.gain.exponentialRampToValueAtTime(vol, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(this.ctx.destination);
      o.start(t); o.stop(t + dur + 0.05);
    } catch { /* never break play */ }
  }
  click(): void { this.tone(500, 0.08, 'square', 0.05); }
  chime(i: number): void {
    const scale = [659, 784, 880, 1047, 1175];
    this.tone(scale[i % scale.length], 0.5, 'triangle', 0.1);
    this.tone(scale[i % scale.length] * 2, 0.4, 'sine', 0.04, 0.05);
  }
  oops(): void { this.tone(280, 0.25, 'triangle', 0.07); }
  padStart(): void {
    if (this.padTimer || !this.app.save.data.settings.music) return;
    this.padTimer = setInterval(() => {
      if (document.hidden) return;
      this.tone(220, 2.2, 'sine', 0.025);
      this.tone(277, 2.2, 'sine', 0.02, 0.4);
      this.tone(330, 2.2, 'sine', 0.02, 0.8);
    }, 3200);
  }
  padStop(): void {
    if (this.padTimer) { clearInterval(this.padTimer); this.padTimer = null; }
  }
  wake(): void {
    [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.6, 'triangle', 0.1, i * 0.14));
  }
  dispose(): void { this.padStop(); try { void this.ctx?.close(); } catch { /* noop */ } this.ctx = null; }
}

export function lamplight(app: App, root: HTMLElement): void {
  const s = mountScreen(root);
  s.classList.add('lamp-screen');
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
  canvas.className = 'world-canvas lamp-canvas';
  canvas.setAttribute('aria-label', 'مدينة الضوء');
  s.append(canvas);

  const scene = new WorldScene(canvas, { worldW: W, worldH: H, reduceMotion: rm, background: '#0b1030' });
  scene.panEnabled = false; // fixed hill: taps turn mirrors, never the camera
  const fx = new Feedback(scene.particles, app.audio);
  const synth = new LampSynth(app);

  const dec = decide(d.attempts, 'lamp-plan');
  const diff: Difficulty = dec.difficulty;
  const doneBefore = (d.lamplight?.completedAt ?? 0) > 0;
  // re-scramble starts every visit (seeded by completions — a new night, same city)
  const visits = (d.lamplight?.towers ?? 0) + 1;
  const base: LampLayout = lampLayout(diff);
  const layout: LampLayout = {
    ...base,
    mirrors: base.mirrors.map((m, i) => {
      const off = (2 + visits * 3 + i * 2) % 7 + 1; // never 0 → never pre-solved
      return { ...m, ang: (m.solAng + off) % 8 };
    }),
  };

  let rotations = 0;
  let decoyHits = 0;
  let adjustments = 0; // rotations after the first lamp lit (debugging evidence)
  let hints = 0;
  let hintShown = false;
  let hintUntil = 0;
  let rotatedOnce = false;
  let finished = false;
  let raceT0 = 0;
  const t0 = Date.now();
  const litEver = new Set<string>();

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

  const liveMirrors = () => layout.mirrors.map((m) => ({ id: m.id, x: m.x, y: m.y, ang: m.ang }));
  const liveTrace = () => traceBeam(layout.src, layout.dir, liveMirrors(), layout.lamps);

  home.onclick = () => { app.audio.sfx('tap'); synth.dispose(); try { scene.destroy(); } catch { /* noop */ } app.go('world'); };

  // ================= NIGHT HILL (one sleeping town) =================
  scene.addLayer({
    parallax: 0.05,
    paint: (ctx, t) => {
      const g = ctx.createLinearGradient(0, 0, 0, 700);
      g.addColorStop(0, '#0b1030');
      g.addColorStop(0.7, '#1c2450');
      g.addColorStop(1, '#2c2a55');
      ctx.fillStyle = g;
      ctx.fillRect(-100, -100, W + 200, 800);
      // stars
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (let i = 0; i < 44; i++) {
        const sx = (i * 167 + 50) % W;
        const sy = (i * 101 + 30) % 480;
        const tw = rm ? 0.7 : 0.35 + 0.4 * Math.sin(t / 700 + i * 1.9);
        ctx.globalAlpha = Math.max(0.12, tw);
        ctx.fillRect(sx, sy, i % 7 === 0 ? 4 : 2.5, i % 7 === 0 ? 4 : 2.5);
      }
      ctx.globalAlpha = 1;
      // moon
      ctx.fillStyle = 'rgba(235,240,255,0.9)';
      ctx.beginPath(); ctx.arc(600, 120, 30, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(200,210,240,0.5)';
      ctx.beginPath(); ctx.arc(590, 112, 8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(608, 128, 5, 0, Math.PI * 2); ctx.fill();
    },
  });
  scene.addLayer({
    parallax: 1,
    paint: (ctx, t) => {
      void t;
      // hill silhouette
      ctx.fillStyle = '#17203c';
      ctx.beginPath(); ctx.ellipse(360, 1180, 520, 260, 0, Math.PI, Math.PI * 2); ctx.fill();
      // far sleeping rooftops
      ctx.fillStyle = '#101830';
      for (let i = 0; i < 8; i++) {
        const hx = 60 + i * 80;
        const hh = 60 + ((i * 53) % 70);
        ctx.fillRect(hx, 640 - hh, 56, hh);
        ctx.beginPath();
        ctx.moveTo(hx - 6, 640 - hh); ctx.lineTo(hx + 28, 640 - hh - 26); ctx.lineTo(hx + 62, 640 - hh);
        ctx.closePath(); ctx.fill();
      }
      // cobble plaza around the source
      ctx.fillStyle = '#1e2745';
      ctx.beginPath(); ctx.ellipse(360, 950, 200, 70, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath(); ctx.ellipse(360, 950, 60 + i * 32, 22 + i * 11, 0, 0, Math.PI * 2); ctx.stroke();
      }
    },
  });

  // ================= SUN-BATTERY (the one source — tap to feel it hum) =================
  const srcObj: SceneObj = {
    id: 'source', x: layout.src.x, y: layout.src.y, r: 56, depth: 500,
    draw: (ctx, t) => {
      const pulse = rm ? 1 : 1 + 0.04 * Math.sin(t / 400);
      ctx.save();
      ctx.translate(layout.src.x, layout.src.y); ctx.scale(pulse, pulse); ctx.translate(-layout.src.x, -layout.src.y);
      // tower
      ctx.fillStyle = '#3a4666';
      ctx.fillRect(layout.src.x - 22, layout.src.y - 70, 44, 70);
      ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 3;
      ctx.strokeRect(layout.src.x - 22, layout.src.y - 70, 44, 70);
      // sun-cell dome (always glowing: the promise)
      const g = ctx.createRadialGradient(layout.src.x, layout.src.y - 82, 2, layout.src.x, layout.src.y - 82, 34);
      g.addColorStop(0, '#fff3cf');
      g.addColorStop(0.5, '#ffd76e');
      g.addColorStop(1, 'rgba(255,180,80,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(layout.src.x, layout.src.y - 82, 34, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd76e';
      ctx.beginPath(); ctx.arc(layout.src.x, layout.src.y - 82, 15, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.restore();
    },
    onTap: () => { fx.discover(layout.src.x, layout.src.y - 80); app.audio.sfx('pop'); },
  };
  scene.addObject(srcObj);

  // ================= MIRRORS (tap = turn 45°) =================
  for (const m of layout.mirrors) {
    const isDecoy = layout.decoy === m.id;
    const mObj: SceneObj = {
      id: m.id, x: m.x, y: m.y, r: 52, depth: 510,
      draw: (ctx, t) => {
        // round stone base
        ctx.fillStyle = '#2c3552';
        ctx.beginPath(); ctx.ellipse(m.x, m.y + 26, 34, 12, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 2.5; ctx.stroke();
        // pedestal
        ctx.fillStyle = '#46527a';
        ctx.fillRect(m.x - 10, m.y - 6, 20, 32);
        ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 2.5;
        ctx.strokeRect(m.x - 10, m.y - 6, 20, 32);
        // the mirror face (angle readable at a glance)
        const a = (m.ang * Math.PI) / 4;
        const ux = Math.cos(a), uy = Math.sin(a);
        const wob = rm ? 0 : Math.sin(t / 900 + m.x) * 1.5;
        ctx.save();
        ctx.translate(0, wob);
        const grad = ctx.createLinearGradient(m.x - ux * 26, m.y - 12 - uy * 26, m.x + ux * 26, m.y - 12 + uy * 26);
        grad.addColorStop(0, '#8fa3c8');
        grad.addColorStop(0.5, '#e8f2ff');
        grad.addColorStop(1, '#8fa3c8');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 10; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(m.x - ux * 26, m.y - 12 - uy * 26);
        ctx.lineTo(m.x + ux * 26, m.y - 12 + uy * 26);
        ctx.stroke();
        ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(m.x - ux * 30, m.y - 12 - uy * 30);
        ctx.lineTo(m.x - ux * 22, m.y - 12 - uy * 22);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(m.x + ux * 30, m.y - 12 + uy * 30);
        ctx.lineTo(m.x + ux * 22, m.y - 12 + uy * 22);
        ctx.stroke();
        ctx.restore();
        if (isDecoy) {
          ctx.font = '18px serif'; ctx.textAlign = 'center';
          ctx.fillText('🍂', m.x + 30, m.y + 24);
        }
        // first-touch cue (pre-reader): the first mirror breathes until turned
        if (!rotatedOnce && m.id === layout.mirrors[0].id) {
          spotlight(ctx, m.x, m.y - 12, 44, t, rm);
        }
      },
      onTap: () => {
        m.ang = (m.ang + 1) % 8;
        rotations++;
        rotatedOnce = true;
        if (litEver.size > 0) adjustments++;
        app.audio.sfx('tap');
        synth.click();
        setMood('look', 900);
        lastProgressAt = performance.now();
      },
    };
    scene.addObject(mObj);
  }

  // ================= BEAM (living light, raycast every frame) =================
  const beamObj: SceneObj = {
    id: 'beam', x: 360, y: 500, r: 0.0001, depth: 505,
    draw: (ctx, t) => {
      const tr = liveTrace();
      // register newly lit lamps (the city waking, one chime at a time)
      for (const id of tr.lit) {
        if (!litEver.has(id)) {
          litEver.add(id);
          const lamp = layout.lamps.find((l) => l.id === id)!;
          fx.celebrate(lamp.x, lamp.y - 30);
          synth.chime(layout.lamps.indexOf(lamp));
          setMood('celebrate', 1500);
          lastProgressAt = performance.now();
          if (litEver.size === 1) say('firstlamp', 'ضوء! الشارع صحي!');
        }
      }
      // decoy steal detection (kind, funny, informative)
      const nearDecoy = layout.decoy && Math.hypot(tr.end.x - mirrorById(layout.decoy).x, tr.end.y - mirrorById(layout.decoy).y) < 70
        && !tr.lit.length;
      if (nearDecoy && !decoySaid) {
        decoySaid = true;
        decoyHits++;
        fx.oops(tr.end.x, tr.end.y);
        synth.oops();
        setMood('react', 1600);
        say('decoy', 'هيهي! المراية سرقت الضو!');
      }
      ctx.lineCap = 'round';
      const racing = finished && !rm ? Math.min(1, (performance.now() - raceT0) / 2200) : -1;
      tr.segs.forEach((sg, si) => {
        // core beam
        ctx.strokeStyle = 'rgba(255,240,190,0.95)';
        ctx.lineWidth = 7;
        ctx.beginPath(); ctx.moveTo(sg.x1, sg.y1); ctx.lineTo(sg.x2, sg.y2); ctx.stroke();
        // hot center
        ctx.strokeStyle = '#fffdf4';
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(sg.x1, sg.y1); ctx.lineTo(sg.x2, sg.y2); ctx.stroke();
        // racing pulse during the WOW
        if (racing >= 0 && racing < 1) {
          const pk = racing * tr.segs.length;
          if (si <= pk && pk < si + 1) {
            const fr = pk - si;
            const px = sg.x1 + (sg.x2 - sg.x1) * fr;
            const py = sg.y1 + (sg.y2 - sg.y1) * fr;
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(px, py, 12, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(255,215,130,0.5)';
            ctx.beginPath(); ctx.arc(px, py, 24, 0, Math.PI * 2); ctx.fill();
          }
        }
      });
      // travelling photons (direction readable without arrows)
      if (!rm && tr.segs.length) {
        ctx.fillStyle = 'rgba(255,250,220,0.9)';
        const total = tr.segs.length;
        for (let i = 0; i < total * 2; i++) {
          const gp = (t / 1400 + i / (total * 2)) % 1;
          const si = Math.min(total - 1, Math.floor(gp * total));
          const fr = gp * total - si;
          const sg = tr.segs[si];
          ctx.beginPath();
          ctx.arc(sg.x1 + (sg.x2 - sg.x1) * fr, sg.y1 + (sg.y2 - sg.y1) * fr, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // firefly hint: traces ONLY the first solution bounce (a nudge, never the answer)
      if (!rm && performance.now() < hintUntil && hintSeg) {
        const hk = (t / 500) % 1;
        const hx = hintSeg.x1 + (hintSeg.x2 - hintSeg.x1) * hk;
        const hy = hintSeg.y1 + (hintSeg.y2 - hintSeg.y1) * hk;
        ctx.fillStyle = '#ffe98a';
        ctx.beginPath(); ctx.arc(hx, hy, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,230,150,0.4)';
        ctx.beginPath(); ctx.arc(hx, hy, 13, 0, Math.PI * 2); ctx.fill();
        ctx.setLineDash([6, 10]);
        ctx.strokeStyle = 'rgba(255,230,150,0.6)'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(hintSeg.x1, hintSeg.y1); ctx.lineTo(hintSeg.x2, hintSeg.y2); ctx.stroke();
        ctx.setLineDash([]);
      }
    },
  };
  scene.addObject(beamObj);
  let decoySaid = false;
  let hintSeg: { x1: number; y1: number; x2: number; y2: number } | null = null;

  function mirrorById(id: string) {
    return layout.mirrors.find((m) => m.id === id)!;
  }

  // ================= LAMPS (sleeping streets that wake) =================
  const walkers: { lamp: string; off: number }[] = [];
  for (const lamp of layout.lamps) {
    const lampObj: SceneObj = {
      id: lamp.id, x: lamp.x, y: lamp.y, r: 46, depth: 520,
      draw: (ctx, t) => {
        const lit = liveTrace().lit.includes(lamp.id);
        // post
        ctx.fillStyle = lit ? '#3a4666' : '#232a44';
        ctx.fillRect(lamp.x - 7, lamp.y - 64, 14, 64);
        ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 2.5;
        ctx.strokeRect(lamp.x - 7, lamp.y - 64, 14, 64);
        // head
        if (lit) {
          const flick = rm ? 1 : 0.9 + 0.1 * Math.sin(t / 300 + lamp.x);
          const g = ctx.createRadialGradient(lamp.x, lamp.y - 74, 2, lamp.x, lamp.y - 74, 44 * flick);
          g.addColorStop(0, '#fff6d8');
          g.addColorStop(0.4, '#ffd76e');
          g.addColorStop(1, 'rgba(255,180,80,0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(lamp.x, lamp.y - 74, 44 * flick, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#ffe9a8';
          ctx.beginPath(); ctx.arc(lamp.x, lamp.y - 74, 12, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 2.5; ctx.stroke();
          // lit windows beneath wake in sequence
          ctx.fillStyle = '#ffd76e';
          const wcount = 2 + (layout.lamps.indexOf(lamp) % 2);
          for (let i = 0; i < wcount; i++) {
            const wy = lamp.y + 8 + i * 16;
            const on = rm ? true : Math.sin(t / 500 + i * 1.7 + lamp.x) > -0.6;
            if (on) ctx.fillRect(lamp.x - 26 + i * 14, wy, 10, 12);
          }
        } else {
          // sleeping lamp: dim blue cap + tiny "z"
          ctx.fillStyle = '#5a6a94';
          ctx.beginPath(); ctx.arc(lamp.x, lamp.y - 74, 11, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 2.5; ctx.stroke();
          if (!rm) {
            ctx.font = '16px serif'; ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(180,200,240,0.8)';
            const ph = (t / 1600 + lamp.x) % 1;
            ctx.globalAlpha = 1 - ph;
            ctx.fillText('z', lamp.x + 16, lamp.y - 92 - ph * 18);
            ctx.globalAlpha = 1;
          }
        }
      },
      onTap: () => {
        const lit = liveTrace().lit.includes(lamp.id);
        fx.discover(lamp.x, lamp.y - 74);
        if (!lit) setMood('look', 900);
      },
    };
    scene.addObject(lampObj);
    walkers.push({ lamp: lamp.id, off: layout.lamps.indexOf(lamp) * 2.1 });
  }

  // walkers wake with their lamp and stroll (life, never blocking)
  const walkObj: SceneObj = {
    id: 'walkers', x: 360, y: 800, r: 0.0001, depth: 515,
    draw: (ctx, t) => {
      const lit = liveTrace().lit;
      walkers.forEach((w, i) => {
        if (!lit.includes(w.lamp)) return;
        const lamp = layout.lamps.find((l) => l.id === w.lamp)!;
        const wx = rm ? lamp.x + 40 : lamp.x + 40 + Math.sin(t / 1600 + w.off) * 46;
        drawWalker(ctx, wx, lamp.y + 6, 26, i % 2 ? '#ff8fb0' : '#7fd4ff', t, rm, Math.cos(t / 1600 + w.off) < 0);
      });
    },
  };
  scene.addObject(walkObj);

  // ================= GATE (opens only for a fully awake city) =================
  const gateObj: SceneObj = {
    id: 'gate', x: 540, y: 300, r: 60, depth: 530,
    draw: (ctx, t) => {
      const open = layout.lamps.every((l) => liveTrace().lit.includes(l.id));
      // pillars
      ctx.fillStyle = '#3a4666';
      ctx.fillRect(540 - 52, 250, 22, 110);
      ctx.fillRect(540 + 30, 250, 22, 110);
      ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 3;
      ctx.strokeRect(540 - 52, 250, 22, 110);
      ctx.strokeRect(540 + 30, 250, 22, 110);
      // arch
      ctx.strokeStyle = open ? '#ffd76e' : '#46527a';
      ctx.lineWidth = 10; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(540, 330, 42, Math.PI, 0); ctx.stroke();
      if (open) {
        const shimmer = rm ? 0.7 : 0.5 + 0.3 * Math.sin(t / 400);
        ctx.fillStyle = `rgba(255,220,150,${shimmer * 0.35})`;
        ctx.fillRect(540 - 34, 272, 68, 62);
        ctx.fillStyle = `rgba(255,240,200,${shimmer})`;
        for (let i = 0; i < 5; i++) {
          const sx = 512 + i * 14;
          const sy = 280 + (rm ? 0 : Math.sin(t / 500 + i * 1.4) * 8);
          ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI * 2); ctx.fill();
        }
      } else {
        // sleeping arch: faint outline, honest about being closed
        ctx.fillStyle = 'rgba(120,140,190,0.25)';
        ctx.fillRect(540 - 30, 276, 60, 56);
      }
    },
    onTap: () => {
      if (layout.lamps.every((l) => liveTrace().lit.includes(l.id))) {
        fx.celebrate(540, 300, true);
        app.audio.sfx('win');
      } else {
        fx.tap();
      }
    },
  };
  scene.addObject(gateObj);

  // ================= NOVA (gazes at the darkest lamp — or the hinted mirror) =================
  let novaMood: NovaMood = 'idle';
  let novaUntil = 0;
  let gazeMirror: { x: number; y: number } | null = null;
  const setMood = (m: NovaMood, ms = 1600) => { novaMood = m; novaUntil = performance.now() + ms; };
  const darkest = () => layout.lamps.find((l) => !liveTrace().lit.includes(l.id)) ?? null;
  const novaObj: SceneObj = {
    id: 'nova', x: 150, y: 950, r: 44, depth: 900,
    draw: (ctx, t) => {
      const m = performance.now() > novaUntil ? 'idle' : novaMood;
      const dk = darkest();
      const gx = gazeMirror ? gazeMirror.x : dk?.x;
      const gy = gazeMirror ? gazeMirror.y : dk?.y;
      drawNova(ctx, 150, 950, 30,
        { mood: m === 'idle' && (gazeMirror || dk) && !rm ? 'look' : m, gazeX: gx, gazeY: gy }, t, rm,
        lookFromAvatar(app.save.data.avatar), app.save.data.avatar.charm);
    },
    onTap: () => {
      fx.discover(150, 920);
      setMood('celebrate', 900);
      app.audio.sfx('pop');
    },
  };
  scene.addObject(novaObj);

  // ================= stall watch: firefly traces the first bounce (never the answer) =================
  let lastProgressAt = performance.now();
  let prevLitCount = 0;
  const steward: SceneObj = {
    id: 'steward', x: -1000, y: -1000, r: 0.0001, depth: -1000,
    draw: () => {
      const now = performance.now();
      const lit = liveTrace().lit;
      if (lit.length > prevLitCount) {
        prevLitCount = lit.length;
        lastProgressAt = now;
      }
      if (!finished && lit.length === layout.lamps.length) {
        finished = true;
        finishWake();
        return;
      }
      // 60s with no new lamp: one firefly nudge (visual-first, then one line).
      // Nova gazes at a mirror that alone fixes something new — never the decoy.
      if (!finished && now - lastProgressAt > 60000 && !hintShown) {
        hintShown = true;
        hints++;
        const full = traceBeam(layout.src, layout.dir,
          layout.mirrors.map((m) => ({ ...m, ang: m.solAng })), layout.lamps);
        if (full.segs.length) {
          hintSeg = full.segs[0];
          hintUntil = now + 6000;
          const fixId = hintMirror(
            { ...layout, mirrors: layout.mirrors.map((m) => ({ ...m })) }, lit);
          const fix = fixId ? layout.mirrors.find((m) => m.id === fixId) : null;
          setMood('point', 3000);
          gazeMirror = fix ?? null;
          say('stall', 'النور واقف… جرّب تحرّك مراية!');
        }
      }
    },
  };
  scene.addObject(steward);

  // ================= WOW: the city wakes in a wave =================
  function finishWake(): void {
    raceT0 = performance.now();
    setMood('celebrate', 5000);
    bus.emit('nova:mood', { mood: 'celebrate' as const });
    synth.wake();
    app.audio.sfx('win');
    const prev = d.lamplight;
    app.save.update((sv) => {
      sv.lamplight = {
        lit: layout.lamps.length,
        completedAt: Date.now(),
        towers: (prev?.towers ?? 0) + 1,
      };
      sv.museum.push({
        id: `lamp-tower-${Date.now()}`, kind: 'lamp-tower',
        title: 'منارة مدينتي', emoji: '🏮',
        description: 'وصل الضو لكل الشوارع!',
        createdAt: Date.now(),
      });
    });
    app.save.saveNow();
    app.ctx().report({
      activityId: 'lamp-plan',
      skillIds: ['spatial', 'logic', 'planning', 'sequencing', 'prediction', 'debugging'],
      success: true, durationMs: Date.now() - t0,
      tries: rotations + 1, hintsUsed: hints,
      errorKind: decoyHits > 0 ? 'decoy' : undefined,
      strategyChanged: adjustments > 0, difficulty: diff,
    });
    app.ctx().earnCoins(12, 'المدينة صحيت!');
    say('finale', 'المدينة كلها صحيت! انت اللي ضويتها!');
    const again = el('button', 'orb', '💡') as HTMLButtonElement;
    again.setAttribute('aria-label', 'ليلة جديدة');
    again.onclick = () => { app.audio.sfx('pop'); again.remove(); synth.dispose(); app.go('lamplight'); };
    const chrome = s.querySelector('.world-chrome');
    chrome?.append(again);
  }

  scene.start();
  synth.padStart();
  if (doneBefore) {
    say('again', 'المدينة نايمة من جديد… ضويها بطريقة تانية!');
  } else {
    say('arrive', 'ششش… المدينة نايمة والضو محبوس. حرّك المرايا!');
  }
}
