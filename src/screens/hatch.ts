/* HATCH — "نوفا تفقس" (NOVA Hatches). The Creative Reset slice (Prototype).
   One night beach. One shivering pod. No menus, no quiz, no labels.
   Verbs: rub (warm) · hold/cup (shelter) · tap-sing (rhythm echo).
   Warmth is visible (cold blue ↔ keeper gold). Over-care teaches "just enough".
   Hatch memory decides Nova's look — ownership via history, not picker. */

import type { App } from '../core/app';
import { bus } from '../core/events';
import { Feedback, spotlight } from '../engine/feedback';
import { WorldScene } from '../engine/scene';
import { el } from '../ui/helpers';
import { mountScreen } from './shell';
import {
  canBloom, coolPod, createPod, finishHatch, holdPod, nextTemperament,
  rubPod, singPod, startBloom,
  type NovaIdentity, type PodState, type PodTemperament,
} from '../world/hatchling';

const W = 720;
const H = 1080;
const POD = { x: 360, y: 660, r: 150 };
const NOVA_HOME = { x: 360, y: 520 };

/* ---------- tiny hum/chirp synth (Prototype backend; respects settings.sfx) ---------- */
class Hum {
  private ctx: AudioContext | null = null;
  private lastHum = 0;
  constructor(private app: App) {}
  unlock(): void {
    try {
      if (!this.ctx) this.ctx = new AudioContext();
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch { /* silent is fine */ }
  }
  dispose(): void {
    try { void this.ctx?.close(); } catch { /* noop */ }
    this.ctx = null;
  }
  private tone(freq: number, dur: number, type: OscillatorType, vol: number, when = 0): void {
    if (!this.app.save.data.settings.sfx) return;
    try {
      this.unlock();
      if (!this.ctx) return;
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
  /** continuous-care hum, pitch follows warmth. Throttled by caller. */
  hum(warmth: number): void {
    const now = performance.now();
    if (now - this.lastHum < 130) return;
    this.lastHum = now;
    this.tone(280 + warmth * 4.2, 0.16, 'sine', 0.1);
  }
  pulse(): void { this.tone(660, 0.18, 'sine', 0.08); }
  echoGood(): void { this.tone(660, 0.14, 'sine', 0.12); this.tone(880, 0.2, 'sine', 0.1, 0.1); }
  oops(): void { this.tone(300, 0.25, 'triangle', 0.09); }
  bloom(): void {
    // rising fifth + shimmer (the WOW chord)
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.6, 'sine', 0.12, i * 0.13));
    [1568, 2093].forEach((f, i) => this.tone(f, 0.9, 'sine', 0.05, 0.5 + i * 0.2));
  }
  chirp(base: number): void {
    this.tone(base, 0.12, 'sine', 0.12);
    this.tone(base * 1.25, 0.14, 'sine', 0.1, 0.1);
  }
}

function lerp(a: number, b: number, k: number): number { return a + (b - a) * k; }
function mix(c1: [number, number, number], c2: [number, number, number], k: number): string {
  return `rgb(${Math.round(lerp(c1[0], c2[0], k))},${Math.round(lerp(c1[1], c2[1], k))},${Math.round(lerp(c1[2], c2[2], k))})`;
}
// cold glow blue → keeper gold
const COLD: [number, number, number] = [159, 216, 255];
const WARM: [number, number, number] = [255, 190, 90];

export function hatch(app: App, root: HTMLElement): void {
  const s = mountScreen(root);
  s.classList.add('hatch-screen');
  const d = app.save.data;
  const rm = d.settings.reduceMotion;

  // ---- slim chrome: home orb + replay-sound orb only (canon: 2 orbs max)
  const chrome = el('div', 'world-chrome');
  const home = el('button', 'orb', '🏠') as HTMLButtonElement;
  home.setAttribute('aria-label', 'رجوع');
  home.onclick = () => { app.audio.sfx('tap'); try { scene.destroy(); } catch { /* noop */ } app.go('world'); };
  const replay = el('button', 'orb', '🔊') as HTMLButtonElement;
  replay.setAttribute('aria-label', 'إعادة الصوت');
  chrome.append(home, replay);
  s.append(chrome);

  const canvas = document.createElement('canvas');
  canvas.className = 'world-canvas hatch-canvas';
  canvas.setAttribute('aria-label', 'شاطئ الليل');
  s.append(canvas);

  const scene = new WorldScene(canvas, { worldW: W, worldH: H, reduceMotion: rm, background: '#0e1440' });
  const fx = new Feedback(scene.particles, app.audio);
  const hum = new Hum(app);

  // ---- state
  const returning = !!d.hatch?.hatchedAt;
  let pod: PodState = createPod(returning ? nextTemperament((d.hatch?.temperament ?? 'sleepy') as PodTemperament) : 'sleepy');
  let dawn = returning ? 1 : 0; // returning keepers come back to morning
  let nova: { born: boolean; id: NovaIdentity; x: number; y: number; tx: number; ty: number; hopT: number; moodUntil: number } = {
    born: returning,
    id: returning ? { tint: (d.hatch?.tint ?? 'sunny') as NovaIdentity['tint'], pattern: (d.hatch?.pattern ?? 'freckles') as NovaIdentity['pattern'], chirpBase: d.hatch?.chirpBase ?? 700 } : { tint: 'sunny', pattern: 'freckles', chirpBase: 700 },
    x: NOVA_HOME.x, y: NOVA_HOME.y, tx: NOVA_HOME.x, ty: NOVA_HOME.y, hopT: 1, moodUntil: 0,
  };
  let said: Record<string, boolean> = {};
  let lastLine = '';
  let lastTick = performance.now();
  let pulseNext = performance.now() + 2200;
  let pulseT0 = 0;
  const pulsePeriod = () => (pod.phase === 'cozy' || pod.phase === 'ready' ? 1250 : 1750);
  let squash = 0; // spring: >0 squashed, <0 stretched
  let squashV = 0;
  let bloomT0 = 0;
  let readyEchoes = 0;
  let holdBloomStart = 0;
  let named = returning;
  let touched = returning; // first touch dismisses the spotlight cue forever
  let farewellShown = false;
  let cozyCelebrated = returning; // one-time mid-journey reward
  let songCelebrated = returning;

  const say = (key: string, text: string) => {
    if (said[key]) return;
    said[key] = true; lastLine = text;
    bus.emit('nova:say', { text });
    app.voice.speak(text, 'ar', true);
  };
  replay.onclick = () => { app.audio.sfx('tap'); if (lastLine) app.voice.speak(lastLine, 'ar', true); };

  // ================= SKY (night → dawn driven by hatch) =================
  let skyCache: { k: number; g: CanvasGradient | null } = { k: -1, g: null };
  scene.addLayer({
    parallax: 0.04,
    paint: (ctx, t) => {
      const k = dawn;
      const top = mix([14, 20, 64], [150, 190, 245], k);
      const mid = mix([27, 35, 100], [255, 214, 160], k);
      ctx.fillStyle = top;
      ctx.fillRect(-100, -100, W + 200, 560);
      if (!skyCache.g || Math.abs(skyCache.k - k) > 0.02) {
        const g = ctx.createLinearGradient(0, 0, 0, 560);
        g.addColorStop(0, top); g.addColorStop(1, mid);
        skyCache = { k, g };
      }
      ctx.fillStyle = skyCache.g!;
      ctx.fillRect(-100, -100, W + 200, 560);
      // stars (fade with dawn) — chunky enough to survive portrait downscale
      if (k < 0.75) {
        ctx.fillStyle = `rgba(255,255,255,${0.85 * (1 - k)})`;
        for (let i = 0; i < 40; i++) {
          const sx = (i * 173 + 40) % W;
          const sy = (i * 97 + 30) % 430;
          const tw = rm ? 1 : 0.6 + 0.4 * Math.sin(t / 500 + i * 1.7);
          ctx.globalAlpha = Math.max(0.15, tw) * (1 - k);
          const sz = i % 5 === 0 ? 5.5 : 3.5;
          ctx.fillRect(sx, sy, sz, sz);
        }
        ctx.globalAlpha = 1;
      }
      // moon → sun
      const sunY = lerp(170, 330, k);
      ctx.fillStyle = k < 0.5 ? 'rgba(235,240,255,0.9)' : 'rgba(255,205,100,0.95)';
      ctx.beginPath(); ctx.arc(560, sunY, k < 0.5 ? 30 : 44, 0, Math.PI * 2); ctx.fill();
      if (k >= 0.5) {
        ctx.fillStyle = 'rgba(255,200,100,0.25)';
        ctx.beginPath(); ctx.arc(560, sunY, 70, 0, Math.PI * 2); ctx.fill();
      }
    },
  });

  // ================= SEA =================
  scene.addLayer({
    parallax: 0.3,
    paint: (ctx, t) => {
      const k = dawn;
      ctx.fillStyle = mix([38, 90, 160], [110, 190, 235], k);
      ctx.fillRect(-100, 470, W + 200, 220);
      ctx.strokeStyle = `rgba(255,255,255,${0.25 + k * 0.3})`;
      ctx.lineWidth = 3.5;
      for (let i = 0; i < 12; i++) {
        const x = 40 + ((i * 137) % 640);
        const y = 500 + ((i * 89) % 150);
        const len = rm ? 18 : 16 + 14 * Math.sin(t / 1300 + i * 0.7);
        ctx.globalAlpha = 0.3 + 0.3 * (rm ? 0.5 : Math.sin((t / 1300 + i * 0.7) * Math.PI));
        ctx.beginPath();
        ctx.moveTo(x - len, y); ctx.quadraticCurveTo(x, y - 4, x + len, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    },
  });

  // ================= BEACH + NEST =================
  scene.addLayer({
    parallax: 1,
    paint: (ctx, t) => {
      const k = dawn;
      // sand warms with dawn
      ctx.fillStyle = mix([42, 48, 110], [242, 223, 168], k);
      ctx.beginPath(); ctx.ellipse(W / 2, 880, 460, 230, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = k < 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.2)';
      ctx.beginPath(); ctx.ellipse(300, 800, 220, 80, -0.08, 0, Math.PI * 2); ctx.fill();
      // nest: woven ring under the pod (moonlit straw at night)
      ctx.strokeStyle = k < 0.5 ? '#8a76a8' : '#a08050';
      ctx.lineWidth = 10;
      for (let i = 0; i < 3; i++) {
        ctx.globalAlpha = 0.85 - i * 0.2;
        ctx.beginPath(); ctx.ellipse(POD.x, POD.y + 78, 118 - i * 14, 30 - i * 6, 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // tide pools (left + right) — ripple handled by objects
      for (const px of [120, 600]) {
        ctx.fillStyle = mix([60, 120, 190], [120, 200, 240], k);
        ctx.beginPath(); ctx.ellipse(px, 930, 74, 30, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.ellipse(px, 930, 74, 30, 0, 0, Math.PI * 2); ctx.stroke();
      }
      void t;
    },
  });

  // ---- tide pool ripples (tappable, kind, tiny)
  for (const px of [120, 600]) {
    const o = {
      id: `pool-${px}`, x: px, y: 930, r: 78, depth: 931,
      draw: (ctx: CanvasRenderingContext2D, t: number) => {
        const rip = o as unknown as { ring: number };
        const ring = (rip.ring ?? 0);
        if (ring > 0) {
          ctx.strokeStyle = `rgba(255,255,255,${Math.max(0, 0.7 - ring / 60)})`;
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.ellipse(px, 930, 20 + ring, 8 + ring * 0.4, 0, 0, Math.PI * 2); ctx.stroke();
          (rip.ring as number) = ring + (rm ? 3 : 1.6);
          if ((rip.ring as number) > 60) (rip.ring as number) = 0;
        }
        void t;
      },
      onTap: () => {
        (o as unknown as { ring: number }).ring = 1;
        fx.splash(px, 920);
      },
    };
    scene.addObject(o);
  }

  // ---- ambient crabs (life, never blocking)
  const crabs = [
    { x: 180, base: 180, amp: 60, speed: 1 / 9000, c: '#ff8f7a' },
    { x: 540, base: 540, amp: 70, speed: 1 / 11000, c: '#ffab7a' },
  ];
  crabs.forEach((cb, i) => {
    scene.addObject({
      id: `crab-${i}`, x: cb.x, y: 985, r: 40, depth: 986,
      draw: (ctx, t) => {
        if (!rm) cb.x = cb.base + Math.sin(t * cb.speed * Math.PI * 2) * cb.amp;
        const wob = rm ? 0 : Math.sin(t / 200 + i * 3) * 2;
        ctx.fillStyle = cb.c;
        ctx.beginPath(); ctx.ellipse(cb.x, 985 + wob, 20, 13, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 2.5; ctx.stroke();
        // claws
        ctx.fillStyle = cb.c;
        ctx.beginPath(); ctx.arc(cb.x - 22, 978 + wob, 7, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cb.x + 22, 978 + wob, 7, 0, Math.PI * 2); ctx.fill();
        // eyes
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(cb.x - 6, 974 + wob, 4.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cb.x + 6, 974 + wob, 4.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2a2350';
        ctx.beginPath(); ctx.arc(cb.x - 6, 975 + wob, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cb.x + 6, 975 + wob, 2, 0, Math.PI * 2); ctx.fill();
      },
      onTap: () => { fx.discover(cb.x, 970); hum.chirp(880); },
    });
  });

  // ================= POD (the heart) =================
  let ripple = 0; // touch ripple 0..1
  let gazeX = POD.x; let gazeY = POD.y - 200; // pod "looks" at last touch (seam glow leans)
  const podObj = {
    id: 'pod', x: POD.x, y: POD.y, r: POD.r, depth: 700,
    draw: (ctx: CanvasRenderingContext2D, t: number) => {
      const now = performance.now();
      const dt = Math.min(100, now - lastTick); lastTick = now;
      if (!rm) {
        coolPod(pod, dt / 1000, now);
        // spring squash
        const acc = -squash * 0.02 * dt - squashV * 0.002 * dt;
        squashV += acc * dt * 0.06; squash += squashV * dt * 0.06;
        squashV *= 0.94;
      }
      if (ripple > 0) ripple = Math.max(0, ripple - dt / 450);

      // pulse rhythm: pod "breathes out" light + soft chirp on a beat
      if (!rm && pod.phase !== 'blooming' && pod.phase !== 'hatched' && now >= pulseNext) {
        pulseT0 = now; pulseNext = now + pulsePeriod();
        hum.pulse();
      }
      // hold-to-bloom: staying cupped while ready finishes the hatch
      if (pod.phase === 'ready' && holding) {
        if (!holdBloomStart) holdBloomStart = now;
        if (now - holdBloomStart > 2400 && startBloom(pod)) { bloomT0 = now; hum.bloom(); }
      } else if (!holding) { holdBloomStart = 0; }

      // mid-journey gifts: the long middle must surprise, not just fill
      if (!cozyCelebrated && (pod.phase === 'cozy' || pod.phase === 'ready')) {
        cozyCelebrated = true;
        squashV -= 3; // happy wiggle
        fx.celebrate(POD.x, POD.y - 60);
        hum.echoGood();
      }
      if (!songCelebrated && pod.memory.song >= 2) {
        songCelebrated = true;
        hum.chirp(760); // she sings back early — a promise of the WOW
        fx.discover(POD.x, POD.y - 80);
      }

      // bloom timeline → hatch
      if (pod.phase === 'blooming') {
        const k = Math.min(1, (now - bloomT0) / 2300);
        dawn = k;
        if (k >= 1) {
          const id = finishHatch(pod);
          nova = { ...nova, born: true, id, x: POD.x, y: POD.y - 130, tx: POD.x, ty: POD.y - 150, hopT: 0, moodUntil: now + 3000 };
          hum.chirp(id.chirpBase);
          fx.win(POD.x, POD.y - 120);
          say('hatched', 'هي نوفا! إنت يلي دفيتها!');
          persistHatch(id);
          reportKeep();
          setTimeout(() => {
            if (!document.body.contains(canvas)) return;
            if (named) showFarewell(); else showNaming();
          }, 4500);
        }
      }

      drawPod(ctx, t, now);
      drawPulseRings(ctx, now);
      drawNovaActor(ctx, t, now);
      drawFireflies(ctx, t);
      // single first-touch cue (pre-reader): gone forever once the child touches
      if (!touched && !nova.born && pod.phase !== 'blooming') spotlight(ctx, POD.x, POD.y, 118, t, rm);
      if (pod.phase === 'blooming') drawBloomFlash(ctx, now);
    },
  };
  scene.addObject(podObj);

  function drawPod(ctx: CanvasRenderingContext2D, t: number, now: number): void {
    if (pod.phase === 'hatched') { drawShell(ctx); return; }
    const w = pod.warmth / 100; // 0..1
    const cx = POD.x, cy = POD.y;
    const blooming = pod.phase === 'blooming';
    const bk = blooming ? Math.min(1, (now - bloomT0) / 2300) : 0;
    // glow halo — THE progress bar (no bars, no numbers)
    const haloR = 110 + w * 95 + (blooming ? bk * 160 : 0);
    const halo = ctx.createRadialGradient(cx, cy, 10, cx, cy, haloR);
    const glowC = mix(COLD, WARM, Math.max(w, bk));
    halo.addColorStop(0, glowC + '');
    ctx.save();
    ctx.globalAlpha = 0.5 + w * 0.4 + bk * 0.25;
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(cx, cy, haloR, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // shiver when cold, pant when too hot, still-hiding when too loud
    let ox = 0, oy = 0;
    if (pod.phase === 'cold' && !rm) ox = Math.sin(t / 70) * 3;
    if (pod.over === 'tooHot' && !rm) { ox = Math.sin(t / 60) * 5; oy = -Math.abs(Math.sin(t / 120)) * 4; }
    const hide = pod.over === 'tooLoud' ? 0.82 : 1; // shrinks back

    // squash & stretch with directional lean toward touch
    const sq = rm ? 0 : squash;
    const lean = Math.max(-14, Math.min(14, (gazeX - cx) * 0.04));
    ctx.save();
    ctx.translate(cx + ox + lean, cy + oy);
    ctx.scale((1 + sq * 0.28) * hide, (1 - sq * 0.22) * hide);
    // teardrop body
    const bodyC = mix([70, 90, 170], [255, 214, 130], w);
    ctx.fillStyle = bodyC;
    ctx.beginPath();
    ctx.moveTo(0, -86);
    ctx.bezierCurveTo(58, -50, 66, 20, 40, 58);
    ctx.bezierCurveTo(20, 84, -20, 84, -40, 58);
    ctx.bezierCurveTo(-66, 20, -58, -50, 0, -86);
    ctx.fill();
    ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 4; ctx.stroke();
    // wet-gloss highlight
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath(); ctx.ellipse(-22, -30, 12, 22, -0.4, 0, Math.PI * 2); ctx.fill();
    // breathing seam (opens with warmth)
    const seamOpen = 4 + w * 26 + (blooming ? bk * 30 : 0);
    ctx.strokeStyle = mix([120, 170, 255], [255, 150, 90], w);
    ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-seamOpen, 10);
    ctx.quadraticCurveTo(0, 10 + seamOpen * 0.9 + (rm ? 0 : Math.sin(t / 300) * 3), seamOpen, 10);
    ctx.stroke();
    // inner light peeking through seam
    ctx.fillStyle = `rgba(255,240,190,${0.35 + w * 0.6})`;
    ctx.beginPath(); ctx.ellipse(0, 12, seamOpen * 0.8, 7 + w * 8, 0, 0, Math.PI * 2); ctx.fill();
    // ready: rising sparks
    if (pod.phase === 'ready' && !rm && Math.sin(t / 240) > 0.4) {
      ctx.fillStyle = 'rgba(255,220,140,0.9)';
      for (let i = 0; i < 3; i++) {
        const sx2 = Math.sin(t / 500 + i * 2.1) * 40;
        const sy2 = -40 - ((t / 9 + i * 47) % 110);
        ctx.beginPath(); ctx.arc(sx2, sy2, 3.5, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();

    // touch ripple
    if (ripple > 0) {
      ctx.strokeStyle = `rgba(255,255,255,${0.6 * (1 - ripple)})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, cy, 70 + ripple * 70, 0, Math.PI * 2); ctx.stroke();
    }
    // ready glow ring (fills with hold — the only "meter", and it is light)
    if (pod.phase === 'ready') {
      const hk = holding && holdBloomStart ? Math.min(1, (now - holdBloomStart) / 2400) : 0;
      ctx.strokeStyle = 'rgba(255,215,110,0.9)';
      ctx.lineWidth = 7; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(cx, cy, 108, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(hk, 0.15 + readyEchoes * 0.25)); ctx.stroke();
    }
  }

  function drawShell(ctx: CanvasRenderingContext2D): void {
    // the hatched shell stays — the island remembers
    ctx.save();
    ctx.translate(POD.x - 70, POD.y + 62);
    ctx.rotate(-0.5);
    ctx.fillStyle = '#e8d9b8';
    ctx.beginPath(); ctx.ellipse(0, 0, 42, 26, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 3.5; ctx.stroke();
    ctx.strokeStyle = '#8a6a45'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-30, -8); ctx.quadraticCurveTo(0, 6, 30, -10); ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.translate(POD.x + 72, POD.y + 66);
    ctx.rotate(0.45);
    ctx.fillStyle = '#dfcfa8';
    ctx.beginPath(); ctx.ellipse(0, 0, 36, 22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 3.5; ctx.stroke();
    ctx.restore();
  }

  function drawPulseRings(ctx: CanvasRenderingContext2D, now: number): void {
    if (rm || pod.phase === 'blooming' || pod.phase === 'hatched') return;
    // approaching ring: tap when it meets the pod (rhythm readable with zero text)
    const period = pulsePeriod();
    const until = pulseNext - now;
    if (until > 0 && until < period) {
      const k = 1 - until / period; // 0→1
      const r = 230 - k * (230 - 105);
      ctx.strokeStyle = `rgba(255,220,150,${0.25 + k * 0.65})`;
      ctx.lineWidth = 3 + k * 4;
      ctx.beginPath(); ctx.arc(POD.x, POD.y, r, 0, Math.PI * 2); ctx.stroke();
    }
    // just-emitted pulse
    const age = now - pulseT0;
    if (pulseT0 > 0 && age < 700) {
      ctx.strokeStyle = `rgba(255,255,255,${0.5 * (1 - age / 700)})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(POD.x, POD.y, 80 + age * 0.16, 0, Math.PI * 2); ctx.stroke();
    }
  }

  const TINT_BODY: Record<NovaIdentity['tint'], [number, number, number]> = {
    sunny: [255, 200, 110], teal: [140, 230, 200], violet: [190, 170, 255],
  };

  function drawNovaActor(ctx: CanvasRenderingContext2D, t: number, now: number): void {
    if (!nova.born) return;
    // hop toward target with overshoot
    if (nova.hopT < 1 && !rm) {
      nova.hopT = Math.min(1, nova.hopT + 0.035);
      const k = 1 - Math.pow(1 - nova.hopT, 3);
      const over = Math.sin(Math.min(1, nova.hopT) * Math.PI) * 18;
      nova.x = lerp(nova.x, nova.tx, 0.12) ;
      nova.y = lerp(nova.y, nova.ty, 0.12) - over * 0.06;
      void k;
    }
    const celebrating = now < nova.moodUntil;
    const bounce = rm ? 0 : celebrating ? Math.abs(Math.sin(t / 150)) * 14 : Math.sin(t / 600) * 4;
    const x = nova.x, y = nova.y - bounce;
    const body = TINT_BODY[nova.id.tint];
    const s = 46;
    // glow
    const g = ctx.createRadialGradient(x, y, 6, x, y, s * 2.2);
    g.addColorStop(0, `rgba(${body[0]},${body[1]},${body[2]},0.55)`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, s * 2.2, 0, Math.PI * 2); ctx.fill();
    // feet dangle
    ctx.fillStyle = '#2a2350';
    const dangle = rm ? 0 : Math.sin(t / 300) * 3;
    ctx.beginPath(); ctx.ellipse(x - 16, y + s * 0.95 + dangle, 9, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + 16, y + s * 0.95 - dangle, 9, 7, 0, 0, Math.PI * 2); ctx.fill();
    // body
    ctx.fillStyle = `rgb(${body[0]},${body[1]},${body[2]})`;
    ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 4; ctx.stroke();
    // pattern = history made visible
    ctx.fillStyle = 'rgba(42,35,80,0.35)';
    if (nova.id.pattern === 'freckles') {
      for (const [fx2, fy2] of [[-14, 8], [0, 14], [14, 8]] as const) {
        ctx.beginPath(); ctx.arc(x + fx2, y + fy2, 4, 0, Math.PI * 2); ctx.fill();
      }
    } else if (nova.id.pattern === 'stripes') {
      ctx.strokeStyle = 'rgba(42,35,80,0.35)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      for (const yy of [-12, 0]) {
        ctx.beginPath(); ctx.arc(x, y + yy, s * 0.55, 0.3, Math.PI - 0.3); ctx.stroke();
      }
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      const sx3 = x + 20, sy3 = y - 22;
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + i * (Math.PI * 2 / 5);
        const px2 = sx3 + Math.cos(a) * 7, py2 = sy3 + Math.sin(a) * 7;
        ctx.lineTo(px2, py2);
      }
      ctx.closePath(); ctx.fill();
    }
    // sprout-leaf ears (asymmetric on purpose: left flops, right perks)
    ctx.fillStyle = '#5fd68a';
    ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 3.5;
    ctx.save(); ctx.translate(x - s * 0.75, y - s * 0.85); ctx.rotate(-0.7 + (rm ? 0 : Math.sin(t / 700) * 0.08));
    ctx.beginPath(); ctx.ellipse(0, -16, 13, 22, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.translate(x + s * 0.75, y - s * 0.9); ctx.rotate(0.45 + (rm ? 0 : Math.sin(t / 650 + 1) * 0.1));
    ctx.beginPath(); ctx.ellipse(0, -18, 12, 24, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
    // eyes look at the child (gaze = last touch) — the WOW eye-contact
    const gx = Math.max(-8, Math.min(8, (gazeX - x) * 0.03));
    const gy = Math.max(-6, Math.min(8, (gazeY - y) * 0.03));
    const blink = !rm && (t % 3400) < 140 ? 0.15 : 1;
    for (const ex of [-16, 16]) {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(x + ex, y - 8, 12, 14 * blink, 0, 0, Math.PI * 2); ctx.fill();
      if (blink > 0.5) {
        ctx.fillStyle = '#2a2350';
        ctx.beginPath(); ctx.arc(x + ex + gx, y - 8 + gy, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(x + ex + gx - 2, y - 10 + gy, 2, 0, Math.PI * 2); ctx.fill();
      }
    }
    // happy mouth when celebrating
    if (celebrating) {
      ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(x, y + 8, 12, 0.3, Math.PI - 0.3); ctx.stroke();
    }
    // keeper's mark (chosen at naming — secondary, history stays primary)
    const mark = app.save.data.hatch?.mark;
    if (mark && mark !== 'none') {
      ctx.font = '20px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(mark === 'star' ? '⭐' : mark === 'leaf' ? '🍃' : '🐚', x + s * 0.62, y + s * 0.55);
    }
  }

  function drawFireflies(ctx: CanvasRenderingContext2D, t: number): void {
    // gather where Nova sleeps (world remembers)
    const home = nova.born ? { x: nova.x, y: nova.y } : { x: POD.x, y: POD.y - 120 };
    ctx.fillStyle = `rgba(255,230,150,${0.35 + dawn * 0.45})`;
    for (let i = 0; i < 14; i++) {
      const a = i * 2.4 + (rm ? 0 : t / 2400);
      const r = 60 + (i % 4) * 34;
      const fx2 = home.x + Math.cos(a + i) * r;
      const fy2 = home.y + Math.sin(a * 1.3 + i * 2) * r * 0.5 - 20;
      const s2 = 2 + (i % 3);
      ctx.beginPath(); ctx.arc(fx2, fy2, s2, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawBloomFlash(ctx: CanvasRenderingContext2D, now: number): void {
    const k = Math.min(1, (now - bloomT0) / 2300);
    // expanding dawn ring
    ctx.strokeStyle = `rgba(255,240,200,${0.8 * (1 - k * 0.5)})`;
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(POD.x, POD.y, 90 + k * 320, 0, Math.PI * 2); ctx.stroke();
    if (k < 0.35) {
      ctx.fillStyle = `rgba(255,250,230,${0.75 * (1 - k / 0.35)})`;
      ctx.fillRect(-100, -100, W + 200, H + 200);
    }
  }

  // ================= CARE INPUT (continuous, tactile) =================
  let caring = false;
  let holding = false;
  let downT = 0; let lastX = 0; let lastY = 0; let lastMoveT = 0;
  let travel = 0;
  let holdTimer: number | null = null;
  // rub pacing: accumulate pointer energy, apply ~9x/sec so keeping takes minutes
  let rubAcc = 0; let rubPeak = 0; let lastRubApply = 0;

  const toWorld = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    const sx = ((e.clientX - r.left) / r.width) * scene.vw;
    const sy = ((e.clientY - r.top) / r.height) * scene.vh;
    return scene.cam.toWorld(sx, sy);
  };
  const nearPod = (p: { x: number; y: number }) => Math.hypot(p.x - POD.x, p.y - POD.y) <= POD.r + 40;

  canvas.addEventListener('pointerdown', (e) => {
    hum.unlock(); app.audio.unlock();
    const p = toWorld(e);
    gazeX = p.x; gazeY = p.y;
    // born Nova: tap anywhere → she hops to you (agency + follow)
    if (nova.born && pod.phase === 'hatched') {
      nova.tx = Math.max(80, Math.min(W - 80, p.x));
      nova.ty = Math.max(320, Math.min(900, p.y - 60));
      nova.hopT = 0;
      app.audio.sfx('tap');
      return;
    }
    if (pod.phase === 'blooming') return;
    if (!nearPod(p)) return;
    caring = true; holding = false;
    touched = true; // the cue has done its job
    downT = performance.now(); lastX = p.x; lastY = p.y;
    lastMoveT = downT; travel = 0; ripple = 0.01;
    rubAcc = 0; rubPeak = 0; lastRubApply = downT;
    squashV += 1.6; // instant squish = <100ms response
    hum.hum(pod.warmth);
    fx.splash(POD.x, POD.y + 40);
    holdTimer = window.setTimeout(() => {
      if (caring && travel < 26) {
        holding = true;
        say('shelter', '…دافية… خليك حاضنها…');
      }
    }, 450);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!caring || pod.phase === 'blooming' || pod.phase === 'hatched') return;
    const p = toWorld(e);
    gazeX = p.x; gazeY = p.y;
    const now = performance.now();
    const dist = Math.hypot(p.x - lastX, p.y - lastY);
    const dtm = Math.max(8, now - lastMoveT);
    travel += dist;
    if (travel > 26) { holding = false; if (holdTimer) { window.clearTimeout(holdTimer); holdTimer = null; } }
    if (dist > 2) {
      const speed = (dist / dtm) * 1000; // px/sec
      const intensity = Math.max(0, Math.min(1, speed / 1100));
      rubAcc += intensity * (dtm / 1000);
      rubPeak = Math.max(rubPeak, intensity);
      // paced application: ~9 care-ticks/sec, peak preserved for overheat feel
      if (now - lastRubApply >= 110) {
        lastRubApply = now;
        const tickIntensity = Math.min(1, rubAcc * 9);
        const frantic = rubPeak > 0.92;
        const gain = rubPod(pod, frantic ? 0.99 : tickIntensity, now);
        rubAcc = 0; rubPeak = 0;
        if (gain > 0) {
          squashV += Math.min(2.2, tickIntensity * 2 + 0.4);
          hum.hum(pod.warmth);
          ripple = Math.min(1, ripple + 0.25);
          if (!said.warm && pod.warmth > 30) say('warm', 'عم تدفى! كمّل…');
          if (pod.over === 'tooHot') { hum.oops(); say('hot', 'ششش… سخنت كتير! خلّيها ترتاح شوي.'); }
        }
      }
      lastX = p.x; lastY = p.y; lastMoveT = now;
    }
  });

  const endCare = (e: PointerEvent) => {
    if (holdTimer) { window.clearTimeout(holdTimer); holdTimer = null; }
    const wasCaring = caring;
    const wasHolding = holding;
    caring = false; holding = false;
    if (!wasCaring || pod.phase === 'blooming' || pod.phase === 'hatched') return;
    const now = performance.now();
    const dur = now - downT;
    // tap = rhythm attempt (sing), but not right after a rub
    if (dur < 300 && travel < 24 && !wasHolding) {
      const p = toWorld(e);
      // quality = closeness to the pod's pulse beat
      const beatErr = Math.min(Math.abs(now - pulseNext), Math.abs(now - (pulseNext - pulsePeriod())));
      const quality = Math.max(0, 1 - beatErr / 700);
      const gain = singPod(pod, quality, now);
      if (gain > 0) {
        hum.echoGood();
        squashV -= 1.4;
        if (canBloom(pod)) {
          readyEchoes += 1;
          if (readyEchoes >= 3 && startBloom(pod)) { bloomT0 = now; hum.bloom(); }
        }
      } else if (pod.over === 'tooLoud') {
        hum.oops();
        say('loud', '…انخافت! دفّيها بشويش…');
      } else if (quality < 0.3) {
        app.audio.sfx('tap'); // neutral blip — information, not judgment
      }
      void p;
    }
  };
  canvas.addEventListener('pointerup', endCare);
  canvas.addEventListener('pointercancel', endCare);

  // shelter accumulates while cupped (interval-driven, gentle)
  const shelterTick = window.setInterval(() => {
    if (!document.body.contains(canvas)) {
      window.clearInterval(shelterTick);
      hum.dispose();
      return;
    }
    if (holding && caring && pod.phase !== 'blooming' && pod.phase !== 'hatched') {
      holdPod(pod, 0.25);
      hum.hum(pod.warmth);
      if (canBloom(pod)) say('ready', 'صارت جاهزة! احضنها…');
    }
  }, 250);

  // ================= SAVE + SKILLS =================
  function persistHatch(id: NovaIdentity): void {
    app.save.update((data) => {
      data.hatch = {
        hatchedAt: Date.now(),
        tint: id.tint,
        pattern: id.pattern,
        chirpBase: id.chirpBase,
        podCount: (data.hatch?.podCount ?? 0) + 1,
        temperament: pod.temperament,
        mark: data.hatch?.mark ?? 'none',
        memory: { ...pod.memory },
      };
      // the island remembers: shell artifact in the museum (persistence contract)
      data.museum.push({
        id: `hatch-shell-${Date.now()}`,
        kind: 'shell',
        title: 'صدفة نوفا',
        emoji: '🐚',
        description: 'الصدفة التي فقست منها نوفا — دفأتها بيدي.',
        createdAt: Date.now(),
      });
    });
    app.save.saveNow();
  }

  function reportKeep(): void {
    try {
      app.ctx().report({
        activityId: 'hatch-keep',
        skillIds: ['observation', 'prediction', 'nature', 'emotions', 'selfcare'],
        success: true,
        durationMs: Math.max(1000, performance.now() - (pod.bornAt || Date.now())),
        tries: pod.memory.overEvents + 1,
        hintsUsed: 0,
        strategyChanged: pod.memory.overEvents > 0,
      });
    } catch { /* skills must never break play */ }
  }

  // ================= NAMING (secondary identity — history stays primary) =================
  function showNaming(): void {
    if (named || !document.body.contains(canvas)) return;
    named = true;
    const row = el('div', 'hatch-marks');
    const marks: { id: string; emoji: string }[] = [
      { id: 'star', emoji: '⭐' }, { id: 'leaf', emoji: '🍃' }, { id: 'shell', emoji: '🐚' },
    ];
    for (const m of marks) {
      const b = el('button', 'hatch-mark', m.emoji) as HTMLButtonElement;
      b.setAttribute('aria-label', m.id);
      b.onclick = () => {
        app.audio.sfx('win');
        app.save.update((data) => { if (data.hatch) data.hatch.mark = m.id; });
        app.save.saveNow();
        hum.chirp(nova.id.chirpBase * 1.2);
        row.remove();
        showFarewell();
      };
      row.append(b);
    }
    s.append(row);
    say('name', 'اختار علامة لنوفا!');
  }

  function showFarewell(): void {
    if (farewellShown) return;
    farewellShown = true;
    const old = s.querySelector('.hatch-farewell');
    if (old) old.remove();
    const wrap = el('div', 'hatch-farewell');
    const again = el('button', 'big-btn', '🥚 بيضة ثانية؟') as HTMLButtonElement;
    again.onclick = () => {
      app.audio.sfx('tap');
      wrap.remove();
      farewellShown = false;
      // second pod, new temperament — Nova watches from the side
      pod = createPod(nextTemperament(pod.temperament));
      dawn = 0.35; // morning after — never full night again
      readyEchoes = 0;
      said = {};
      say('arrive2', 'اسمع… في بيضة ثانية! كل وحدة مختلفة…');
      nova.tx = 560; nova.ty = 480; nova.hopT = 0;
      touched = true; // the keeper already knows how to touch
      pulseNext = performance.now() + 1500;
    };
    const toWorldBtn = el('button', 'big-btn ghost', '🏝️ شوف جزيرتي') as HTMLButtonElement;
    toWorldBtn.onclick = () => {
      app.audio.sfx('step');
      try { scene.destroy(); } catch { /* noop */ }
      app.go('world');
    };
    wrap.append(again, toWorldBtn);
    s.append(wrap);
  }

  // ---- entry: frame the whole beach, then glide close to the pod (intimacy).
  // No zoom games under reduced motion; returning keepers get the free morning view.
  scene.start();
  scene.cam.fit(scene.vw || W, scene.vh || H);
  if (!rm && !returning) {
    const vw = scene.vw || W, vh = scene.vh || H;
    const fitZoom = Math.min(vw / W, vh / H);
    const tz = fitZoom * 1.4;
    scene.cam.zoom = fitZoom;
    const fx0 = (W - vw / fitZoom) / 2;
    const fy0 = (H - vh / fitZoom) / 2;
    scene.cam.x = fx0; scene.cam.y = fy0;
    scene.cam.focus(
      POD.x - vw / tz / 2,
      POD.y - 60 - vh / tz / 2,
      tz, 1600,
    );
  }
  setTimeout(() => {
    if (!document.body.contains(canvas)) return;
    if (!returning) say('arrive', 'ششش… في حدا صغير نايم هون. دفّيه بإيدك.');
    else hum.chirp(nova.id.chirpBase);
  }, 1200);
}
