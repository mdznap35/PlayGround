/* Lab: a room you enter, not a menu. Shelf of things, a real water tank,
   a magnet wall, a lamp corner. Touch the world: guess (tap) → drag → drop →
   watch → Nova reacts. No quiz, no reading. */

import type { App } from '../core/app';
import { decide } from '../core/adaptive';
import { bus } from '../core/events';
import { drawNova, lookFromAvatar, type NovaMood } from '../engine/art';
import { Feedback, spotlight } from '../engine/feedback';
import { WorldScene, type SceneObj } from '../engine/scene';
import { bigButton, choice, choiceRow, el, title } from '../ui/helpers';
import { BLOOM_ART, applyBloom, mysteryPhase, plantSeed, type BloomGift } from '../world/mystery';
import { mountScreen } from './shell';

export function lab(app: App, root: HTMLElement, param?: string): void {
  if (param === 'light' || param === 'magnet') {
    const s = mountScreen(root);
    s.append(roomChrome(app, () => app.go('lab')));
    if (param === 'light') lightShadow(app, s);
    else magnet(app, s);
    return;
  }
  return labRoom(app, root);
}

/** slim room chrome: home orb + hint orb (icons only, no text UI) */
export function roomChrome(app: App, onHome: () => void, onHint?: () => void): HTMLElement {
  const chrome = el('div', 'world-chrome');
  const home = el('button', 'orb', '🏠') as HTMLButtonElement;
  home.setAttribute('aria-label', 'رجوع');
  home.onclick = () => { app.audio.sfx('tap'); onHome(); };
  chrome.append(home);
  if (onHint) {
    const hint = el('button', 'orb', '💡') as HTMLButtonElement;
    hint.setAttribute('aria-label', 'تلميح');
    hint.onclick = () => { app.audio.sfx('tap'); onHint(); };
    chrome.append(hint);
  }
  return chrome;
}

/* ================= the water room ================= */
interface FloatSpec { emoji: string; name: string; floats: boolean; voice: string }

const FLOAT_POOL: FloatSpec[] = [
  { emoji: '🪵', name: 'خشبة', floats: true, voice: 'تطفو! الخشب خفيف ومليء بالهواء!' },
  { emoji: '🪨', name: 'حجر', floats: false, voice: 'غاص! الحجر ثقيل!' },
  { emoji: '🍎', name: 'تفاحة', floats: true, voice: 'تطفو! التفاحة خفيفة!' },
  { emoji: '🔩', name: 'مسمار', floats: false, voice: 'غاص! الحديد ثقيل!' },
  { emoji: '🧸', name: 'لعبة', floats: true, voice: 'تطفو! اللعبة خفيفة!' },
  { emoji: '🥄', name: 'ملعقة', floats: false, voice: 'غاصت! المعدن ثقيل!' },
  { emoji: '🍂', name: 'ورقة شجر', floats: true, voice: 'تطفو! خفيفة مثل الريشة!' },
  { emoji: '🪙', name: 'عملة', floats: false, voice: 'غاصت! ثقيلة وصغيرة!' },
];

const TANK = { x0: 370, x1: 630, top: 300, bottom: 520, surface: 330 };

function labRoom(app: App, root: HTMLElement): void {
  const s = mountScreen(root);
  const dec = decide(app.save.data.attempts, 'float-sink');
  const count = dec.difficulty === 0 ? 3 : dec.difficulty === 1 ? 4 : 6;
  const specs = [...FLOAT_POOL].sort(() => Math.random() - 0.5).slice(0, count);

  let hints = 0;
  let returns = 0;
  let placed = 0;
  let correct = 0;
  const t0 = Date.now();
  const finished = { done: false };

  // ---- Mystery Crate mission (the vertical slice): state derived from museum
  let phase = mysteryPhase(app.save.data.museum);
  let seedHere = phase !== 'find';
  let bloomGift: BloomGift | null = null;
  let bloomT0 = 0;
  let bloomGranted = false;
  let magnetNext = false;
  const SEED = { x: 500, y: 252 };
  const POT = { x: 712, y: 500 };
  const CRATE = { x: 285, y: 478 };

  const say = (text: string) => {
    bus.emit('nova:say', { text });
    app.voice.speak(text);
  };

  s.append(roomChrome(app, () => app.go('world'), () => {
    hints++;
    // Nova points at the next untouched thing
    const next = items.find((i) => i.state === 'shelf');
    if (next) {
      novaMood.mood = 'point';
      novaMood.gx = next.x; novaMood.gy = next.y;
      novaMood.until = performance.now() + 2200;
      say(hints === 1 ? 'المس شيئاً من الرف! خمن أولاً!' : 'جرّب شيئاً جديداً من الرف!');
    } else {
      say('انظر إلى الماء! ماذا اكتشفت؟');
    }
  }));

  const canvas = document.createElement('canvas');
  canvas.className = 'world-canvas scene-canvas';
  canvas.setAttribute('aria-label', 'غرفة الماء');
  s.append(canvas);

  const scene = new WorldScene(canvas, { worldW: 1000, worldH: 620, reduceMotion: app.save.data.settings.reduceMotion });
  const fx = new Feedback(scene.particles, app.audio);
  const rm = scene.reduceMotion;

  const novaMood: { mood: NovaMood; gx?: number; gy?: number; until: number } = { mood: 'idle', until: 0 };
  const setMood = (mood: NovaMood, ms = 1600, gx?: number, gy?: number) => {
    novaMood.mood = mood;
    novaMood.until = performance.now() + ms;
    if (gx !== undefined) { novaMood.gx = gx; novaMood.gy = gy; }
  };

  // ---------- room backdrop ----------
  scene.addLayer({
    parallax: 1,
    paint: (ctx, t) => {
      // wall + floor
      const g = ctx.createLinearGradient(0, 0, 0, 620);
      g.addColorStop(0, '#f9ecd2');
      g.addColorStop(0.62, '#f3ddb4');
      g.addColorStop(0.63, '#d9a86c');
      g.addColorStop(1, '#b9834f');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 1000, 620);
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.fillRect(0, 388, 1000, 8);
      // window with sky + plant
      ctx.fillStyle = '#bfe3ff';
      ctx.fillRect(60, 90, 170, 150);
      ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 5;
      ctx.strokeRect(60, 90, 170, 150);
      ctx.beginPath(); ctx.moveTo(145, 90); ctx.lineTo(145, 240); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(60, 165); ctx.lineTo(230, 165); ctx.stroke();
      ctx.fillStyle = '#ffd76e';
      ctx.beginPath(); ctx.arc(190, 125, 20, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5fae6b';
      ctx.beginPath(); ctx.ellipse(100, 225, 26, 12, 0, 0, Math.PI * 2); ctx.fill();
      // poster: water drop
      ctx.fillStyle = '#fff';
      ctx.fillRect(770, 90, 150, 120);
      ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 4;
      ctx.strokeRect(770, 90, 150, 120);
      ctx.fillStyle = '#5db9f5';
      ctx.beginPath();
      ctx.moveTo(845, 112);
      ctx.quadraticCurveTo(867, 148, 867, 162);
      ctx.arc(845, 162, 22, 0.35, Math.PI - 0.35);
      ctx.quadraticCurveTo(823, 148, 845, 112);
      ctx.fill();
      ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath(); ctx.arc(838, 158, 5, 0, Math.PI * 2); ctx.fill();
      // shelf
      ctx.fillStyle = '#8a5a30';
      ctx.fillRect(300, 150, 400, 16);
      ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 3;
      ctx.strokeRect(300, 150, 400, 16);
      // tank glass back
      ctx.fillStyle = 'rgba(190,227,255,0.35)';
      ctx.fillRect(TANK.x0 - 14, TANK.top - 30, TANK.x1 - TANK.x0 + 28, TANK.bottom - TANK.top + 44);
      ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 5;
      ctx.strokeRect(TANK.x0 - 14, TANK.top - 30, TANK.x1 - TANK.x0 + 28, TANK.bottom - TANK.top + 44);
      // water (animated surface)
      const wg = ctx.createLinearGradient(0, TANK.surface, 0, TANK.bottom);
      wg.addColorStop(0, 'rgba(90,185,245,0.85)');
      wg.addColorStop(1, 'rgba(35,120,200,0.9)');
      ctx.fillStyle = wg;
      ctx.beginPath();
      ctx.moveTo(TANK.x0 - 10, TANK.bottom);
      ctx.lineTo(TANK.x0 - 10, TANK.surface);
      for (let x = TANK.x0 - 10; x <= TANK.x1 + 10; x += 12) {
        ctx.lineTo(x, TANK.surface + (rm ? 0 : Math.sin(t / 500 + x / 22) * 4));
      }
      ctx.lineTo(TANK.x1 + 10, TANK.bottom);
      ctx.closePath();
      ctx.fill();
      // tank bottom sand
      ctx.fillStyle = '#e8cf9a';
      ctx.fillRect(TANK.x0 - 10, TANK.bottom - 12, TANK.x1 - TANK.x0 + 20, 12);
      // table under tank
      ctx.fillStyle = '#8a5a30';
      ctx.fillRect(TANK.x0 - 40, TANK.bottom + 14, TANK.x1 - TANK.x0 + 80, 18);
      ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 3;
      ctx.strokeRect(TANK.x0 - 40, TANK.bottom + 14, TANK.x1 - TANK.x0 + 80, 18);
      // magnet station (right): board with a big magnet
      ctx.fillStyle = '#4a4560';
      ctx.fillRect(800, 330, 130, 150);
      ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 4;
      ctx.strokeRect(800, 330, 130, 150);
      ctx.font = '64px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🧲', 865, 390 + (rm ? 0 : Math.sin(t / 800) * 4));
      ctx.font = '22px serif';
      ctx.fillText('✨', 865, 445 + (rm ? 0 : Math.sin(t / 600) * 3));
      // lamp station (left): lamp + plant shadow
      ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(90, 480); ctx.lineTo(90, 340); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(90, 340); ctx.lineTo(170, 340); ctx.stroke();
      ctx.fillStyle = '#ffd76e';
      ctx.beginPath(); ctx.arc(170, 358, 22, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = `rgba(255,215,110,${rm ? 0.12 : 0.1 + 0.05 * Math.sin(t / 900)})`;
      ctx.beginPath();
      ctx.moveTo(170, 380); ctx.lineTo(60, 560); ctx.lineTo(280, 560); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#5fae6b';
      ctx.beginPath(); ctx.ellipse(230, 540, 30, 40, 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(260, 556, 34, 10, 0.3, 0, Math.PI * 2); ctx.fill();
    },
  });

  // ---------- stations ----------
  const magnetSt: SceneObj = {
    id: 'st-magnet', x: 865, y: 405, r: 70, depth: 406,
    draw: () => { /* painted in backdrop */ },
    onTap: () => { fx.tap(); app.go('lab', 'magnet'); },
  };
  const lampSt: SceneObj = {
    id: 'st-lamp', x: 150, y: 430, r: 80, depth: 431,
    draw: () => { /* painted in backdrop */ },
    onTap: () => { fx.tap(); app.go('lab', 'light'); },
  };
  scene.addObject(magnetSt);
  scene.addObject(lampSt);

  // ---------- Mystery Crate (find phase) ----------
  if (phase === 'find') {
    const crate: SceneObj = {
      id: 'crate', x: CRATE.x, y: CRATE.y, r: 46, depth: 479,
      draw: (ctx, t) => {
        const wob = !rm && (t / 1) % 3000 < 400 ? Math.sin(t / 90) * 3 : 0;
        ctx.save();
        ctx.translate(CRATE.x + wob, CRATE.y);
        ctx.fillStyle = '#b07a45';
        ctx.fillRect(-34, -30, 68, 56);
        ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 3;
        ctx.strokeRect(-34, -30, 68, 56);
        ctx.beginPath(); ctx.moveTo(-34, -8); ctx.lineTo(34, -8); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(0, 26); ctx.stroke();
        ctx.font = '30px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('؟', 0, -38);
        // drips: something alive is inside
        if (!rm) {
          ctx.fillStyle = '#5db9f5';
          const dy = (t / 700) % 26;
          ctx.globalAlpha = 1 - dy / 26;
          ctx.beginPath(); ctx.arc(20, 28 + dy, 3, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1;
        }
        ctx.restore();
        spotlight(ctx, CRATE.x, CRATE.y, 44, t, rm);
      },
      onTap: () => {
        fx.win(CRATE.x, CRATE.y - 30);
        setMood('discover', 2200);
        app.save.update((d) => { plantSeed(d); });
        app.save.saveNow();
        phase = 'grow';
        seedHere = true;
        scene.removeObject('crate');
        say('انفتح! أشياء غريبة… وبذرة نائمة! جرّب الأشياء في الماء لتصحى البذرة!');
      },
    };
    scene.addObject(crate);
  }

  // ---------- sleepy seed (grow phase): drinks every correct prediction ----------
  const seedObj: SceneObj = {
    id: 'seed', x: SEED.x, y: SEED.y, r: 30, depth: 210,
    draw: (ctx, t) => {
      if (!seedHere || bloomGift) return;
      const glow = 10 + correct * 5;
      ctx.fillStyle = 'rgba(255,215,110,0.35)';
      ctx.beginPath(); ctx.arc(SEED.x, SEED.y, glow + (rm ? 0 : Math.sin(t / 500) * 3), 0, Math.PI * 2); ctx.fill();
      ctx.font = '30px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🌰', SEED.x, SEED.y + (rm ? 0 : Math.sin(t / 700) * 3));
      if (correct === 0) spotlight(ctx, SEED.x, SEED.y - 26, 22, t, rm);
    },
    onTap: () => {
      fx.discover(SEED.x, SEED.y);
      say(seedHere ? 'البذرة نائمة… كل توقع صحيح يسقيها!' : 'لا بذرة بعد… المس الصندوق العجيب!');
    },
  };
  scene.addObject(seedObj);

  // ---------- gift orbs + bloom (finale, live session state) ----------
  const ORBS: { gift: BloomGift; emoji: string; x: number }[] = [
    { gift: 'sun', emoji: '☀️', x: 440 },
    { gift: 'leaf', emoji: '🍃', x: 500 },
    { gift: 'star', emoji: '⭐', x: 560 },
  ];
  let orbsOut = false;
  for (const o of ORBS) {
    const orb: SceneObj = {
      id: `orb-${o.gift}`, x: o.x, y: 236, r: 34, depth: 211,
      draw: (ctx, t) => {
        if (!orbsOut || bloomGift) return;
        const bob = rm ? 0 : Math.sin(t / 600 + o.x) * 4;
        ctx.font = '38px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(o.emoji, o.x, 236 + bob);
        if (o.gift === 'sun') spotlight(ctx, o.x, 236 + bob, 30, t, rm);
      },
      onTap: () => {
        if (!orbsOut || bloomGift) return;
        bloomGift = o.gift;
        bloomT0 = rm ? 0 : performance.now();
        bloomGranted = false;
        fx.win(o.x, 236);
        setMood('discover', 3000);
        say(o.gift === 'sun' ? 'شمس دافئة!' : o.gift === 'leaf' ? 'ورقة خضراء!' : 'نجمة لامعة!');
      },
    };
    scene.addObject(orb);
  }
  const bloomObj: SceneObj = {
    id: 'bloom', x: POT.x, y: POT.y, r: 0.0001, depth: 480,
    draw: (ctx, t) => {
      if (!bloomGift) return;
      const art = BLOOM_ART[bloomGift];
      const p = rm ? 1 : Math.min(1, (t - bloomT0) / 2200);
      // pot
      ctx.fillStyle = '#c96f4a';
      ctx.fillRect(POT.x - 22, POT.y - 6, 44, 26);
      ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 3;
      ctx.strokeRect(POT.x - 22, POT.y - 6, 44, 26);
      // stem
      const h = 64 * p;
      ctx.strokeStyle = '#3f8a4f'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(POT.x, POT.y - 6); ctx.lineTo(POT.x, POT.y - 6 - h); ctx.stroke();
      // leaves
      if (p > 0.4) {
        ctx.fillStyle = '#5fd68a';
        ctx.beginPath(); ctx.ellipse(POT.x - 12 * p, POT.y - 6 - h * 0.5, 10 * p, 5 * p, -0.5, 0, Math.PI * 2); ctx.fill();
      }
      // bloom head
      if (p > 0.6) {
        const q = (p - 0.6) / 0.4;
        const cy = POT.y - 6 - h;
        ctx.fillStyle = art.petal;
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          ctx.beginPath();
          ctx.ellipse(POT.x + Math.cos(a) * 13 * q, cy + Math.sin(a) * 13 * q, 9 * q, 6 * q, a, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#fff3cf';
        ctx.beginPath(); ctx.arc(POT.x, cy, 8 * q, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 2; ctx.stroke();
      }
      if (p >= 1 && !bloomGranted) {
        bloomGranted = true;
        grantBloom();
      }
    },
  };
  scene.addObject(bloomObj);

  // ---------- magnet glow (continuation: the next mystery calls) ----------
  const magnetGlow: SceneObj = {
    id: 'magnet-glow', x: 865, y: 405, r: 0.0001, depth: 404,
    draw: (ctx, t) => {
      if (!magnetNext) return;
      ctx.strokeStyle = `rgba(255,205,90,${rm ? 0.65 : 0.45 + 0.3 * Math.sin(t / 300)})`;
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(865, 405, 62, 0, Math.PI * 2); ctx.stroke();
    },
  };
  scene.addObject(magnetGlow);

  // ---------- grown flower persists in the room (done phase) ----------
  if (phase === 'done') {
    const last = app.save.data.museum.filter((m) => m.kind === 'mystery-bloom').slice(-1)[0];
    const pot: SceneObj = {
      id: 'pot', x: POT.x, y: POT.y, r: 40, depth: 480,
      draw: (ctx) => {
        ctx.fillStyle = '#c96f4a';
        ctx.fillRect(POT.x - 22, POT.y - 6, 44, 26);
        ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 3;
        ctx.strokeRect(POT.x - 22, POT.y - 6, 44, 26);
        ctx.font = '44px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(last?.emoji ?? '🌻', POT.x, POT.y - 52);
      },
      onTap: () => {
        fx.discover(POT.x, POT.y - 40);
        say('زهرتك العجيبة! كبرت بسبب تجاربك!');
      },
    };
    scene.addObject(pot);
  }

  // ---------- Nova ----------
  const novaObj: SceneObj = {
    id: 'nova', x: 880, y: 560, r: 44, depth: 900,
    draw: (ctx, t) => {
      let mood = novaMood.mood;
      if (t > novaMood.until && (mood === 'point' || mood === 'think' || mood === 'look')) mood = 'idle';
      if (mood === 'idle' && placed === 0 && !finished.done && !rm) mood = 'point';
      const gx = novaMood.gx ?? (mood === 'point' ? 500 : undefined);
      drawNova(ctx, 880, 560, 30, { mood, gazeX: gx, gazeY: mood === 'point' ? 120 : undefined }, t, rm,
        lookFromAvatar(app.save.data.avatar), app.save.data.avatar.charm);
    },
    onTap: () => {
      fx.discover(880, 530);
      setMood('celebrate', 900);
      say('أنا معك! جرّب بنفسك!');
    },
  };
  scene.addObject(novaObj);

  // ---------- draggable things ----------
  interface Item extends SceneObj {
    spec: FloatSpec;
    homeX: number; homeY: number;
    state: 'shelf' | 'falling' | 'placed';
    guess: boolean | null;
    vy: number;
    splashed: boolean;
    lastT: number;
  }
  const items: Item[] = specs.map((spec, i) => {
    const hx = 350 + i * ((600 - 350) / Math.max(1, specs.length - 1)) + 50;
    const it: Item = {
      id: `thing-${i}`, spec, homeX: hx, homeY: 128,
      x: hx, y: 128, r: 34, depth: 200 + i,
      state: 'shelf', guess: null, vy: 0, splashed: false, lastT: 0,
      draggable: true,
      draw: (ctx, t) => {
        const dt = Math.min(80, t - (it.lastT || t));
        it.lastT = t;
        if (it.state === 'falling' && !rm) {
          it.vy += (dt / 1000) * 900;
          it.y += (it.vy * dt) / 1000;
          const target = it.spec.floats ? TANK.surface + 6 : TANK.bottom - 22;
          if (!it.splashed && it.y >= TANK.surface) {
            it.splashed = true;
            fx.splash(it.x, TANK.surface);
          }
          if (it.y >= target) {
            it.y = target;
            it.state = 'placed';
            settle(it);
          }
        } else if (it.state === 'falling' && rm) {
          it.y = it.spec.floats ? TANK.surface + 6 : TANK.bottom - 22;
          it.state = 'placed';
          settle(it);
        }
        // bob when floating
        const bobY = it.state === 'placed' && it.spec.floats && !rm ? Math.sin(t / 600 + it.homeX) * 3 : 0;
        // guess thought bubble
        if (it.state === 'shelf') {
          ctx.font = '20px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.globalAlpha = 0.95;
          ctx.fillText('💭', it.x + 22, it.y - 30);
          ctx.font = '17px serif';
          ctx.fillText(it.guess === null ? '❓' : it.guess ? '⬆️' : '⬇️', it.x + 22, it.y - 28);
          ctx.globalAlpha = 1;
          // the very first thing to touch breathes with light until tried
          if (placed === 0 && it.id === 'thing-0') spotlight(ctx, it.x, it.y, 30, t, rm);
        }
        ctx.font = '40px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(it.spec.emoji, it.x, it.y + bobY);
      },
      onTap: () => {
        if (it.state !== 'shelf' || finished.done) return;
        it.guess = it.guess === null ? true : !it.guess;
        fx.tap();
        setMood('look', 1200);
        say(it.guess ? 'فوق؟ سنرى!' : 'تحت؟ سنرى!');
      },
      onDrop: () => {
        if (it.state !== 'shelf' || finished.done) return;
        const inTank = it.x > TANK.x0 - 20 && it.x < TANK.x1 + 20 && it.y > TANK.top - 60 && it.y < TANK.bottom + 40;
        if (!inTank) {
          it.x = it.homeX; it.y = it.homeY;
          return;
        }
        if (it.guess === null) {
          // predict first! gentle redirect, never a "wrong" screen
          it.x = it.homeX; it.y = it.homeY;
          returns++;
          setMood('react', 1500);
          fx.oops(it.homeX, it.homeY);
          say('خمن أولاً! المس الشيء: فوق أم تحت؟');
          return;
        }
        it.state = 'falling';
        it.vy = 60;
        setMood('think', 2500);
      },
    };
    return it;
  });
  for (const it of items) scene.addObject(it);

  // glass shine (untappable overlay)
  const shine: SceneObj = {
    id: 'shine', x: 500, y: 410, r: 0.0001, depth: 800,
    draw: (ctx) => {
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.save();
      ctx.translate(430, 400);
      ctx.rotate(0.25);
      ctx.fillRect(0, -90, 26, 220);
      ctx.restore();
    },
  };
  scene.addObject(shine);

  function settle(it: Item): void {
    placed++;
    const match = it.guess === it.spec.floats;
    if (match) correct++;
    it.depth = 150; // rest behind the shine
    if (match) {
      fx.celebrate(it.x, it.y - 20);
      setMood('celebrate', 1800);
    } else {
      fx.oops(it.x, it.y);
      setMood('think', 2000);
    }
    const drink = seedHere && match && phase === 'grow';
    if (drink) fx.splash(SEED.x, SEED.y);
    say(`${it.spec.voice}${match ? ' توقعت صح!' : ''}${drink ? ' البذرة تشرب!' : ''}`);
    if (placed >= items.length && !finished.done) {
      finished.done = true;
      window.setTimeout(() => {
        if (!document.body.contains(canvas)) return;
        fx.win(500, 300);
        setMood('celebrate', 3000);
        app.ctx().report({
          activityId: 'float-sink',
          skillIds: ['prediction', 'observation', 'nature'],
          success: true, durationMs: Date.now() - t0,
          tries: items.length + returns, hintsUsed: hints,
        });
        app.ctx().earnCoins(7, 'عالِم صغير!');
        say(`مذهل! جرّبت كل شيء! توقعت ${correct} صح! الخفيف يطفو والثقيل يغوص!`);
        import('../ui/helpers').then(({ confetti }) => confetti());
        // WOW: the sleepy seed wakes — pick one gift and watch it bloom
        if (seedHere && phase === 'grow' && mysteryPhase(app.save.data.museum) === 'grow') {
          window.setTimeout(() => {
            if (!document.body.contains(canvas)) return;
            orbsOut = true;
            setMood('discover', 5000);
            say('صحيت البذرة! اختر لها هدية: شمس؟ ورقة؟ نجمة؟');
          }, 2500);
        }
      }, 1200);
    }
  }

  function grantBloom(): void {
    if (!bloomGift) return;
    let granted = false;
    const gift = bloomGift;
    app.save.update((d) => { granted = applyBloom(d, gift); });
    app.save.saveNow();
    if (!granted) return;
    phase = 'done';
    magnetNext = true;
    setMood('celebrate', 3000);
    bus.emit('nova:mood', { mood: 'celebrate' as const });
    app.ctx().earnCoins(5, 'زهرة عجيبة!');
    say('زهرتك! كبرت بسبب تجاربك! صارت في حديقتك! والمغناطيس يلمع… جرّبه!');
    import('../ui/helpers').then(({ confetti }) => confetti());
  }

  scene.start();
  if (phase === 'find') {
    setMood('point', 3500, CRATE.x, CRATE.y);
    say('ششش! صندوق عجيب في المختبر! المسه وشوف!');
  } else if (phase === 'grow') {
    say('البذرة نائمة! كل توقع صحيح يسقيها! المس شيئاً وخمن!');
  } else {
    say('مختبرك! زهرتك العجيبة هنا! جرّب مجدداً أو اكتشف المغناطيس!');
  }
}

/* ================= light & shadow (kept apparatus view) ================= */
function lightShadow(app: App, s: HTMLElement): void {
  s.append(title('💡 الضوء والظل', 'حرّك المصباح وشوف الظل!'));
  app.voice.speak('حرّك المصباح يمين ويسار! شوف الظل كيف بيكبر وبيصغر!');
  const c = document.createElement('canvas');
  c.className = 'sim'; c.width = 640; c.height = 320;
  s.append(c);
  const ctx = c.getContext('2d')!;
  let lampX = 320;
  const objX = 320, objTop = 150, groundY = 280;

  const draw = () => {
    ctx.clearRect(0, 0, 640, 320);
    const g = ctx.createLinearGradient(0, 0, 0, 320);
    g.addColorStop(0, '#2c3572'); g.addColorStop(1, '#191f4d');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 640, 320);
    ctx.fillStyle = '#0e1330'; ctx.fillRect(0, groundY, 640, 40);
    // rays
    ctx.strokeStyle = 'rgba(255,220,120,0.5)'; ctx.lineWidth = 2;
    for (const dx of [-40, -20, 0, 20, 40]) {
      ctx.beginPath(); ctx.moveTo(lampX, 40); ctx.lineTo(objX + dx, objTop + 60); ctx.stroke();
    }
    // object (tree)
    ctx.font = '64px serif'; ctx.fillText('🌳', objX - 32, objTop + 70);
    // shadow: length shrinks as the lamp moves away (real geometry approx)
    const dist = lampX - objX;
    const dir = dist >= 0 ? -1 : 1;
    const shadowLen = Math.max(24, 150 - Math.abs(dist) * 0.4);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(objX + dir * shadowLen / 2, groundY + 8, shadowLen / 2, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    // lamp
    ctx.font = '44px serif'; ctx.fillText('💡', lampX - 22, 70);
    ctx.fillStyle = '#ffe08a'; ctx.font = '18px sans-serif';
    ctx.fillText('حرّك المصباح 👆', lampX - 55, 95);
  };
  draw();

  const slider = document.createElement('input');
  slider.type = 'range'; slider.min = '60'; slider.max = '580'; slider.value = '320';
  slider.setAttribute('aria-label', 'حرّك المصباح');
  slider.oninput = () => { lampX = +slider.value; draw(); };
  s.append(slider);

  const q = el('p', 'lead', 'سؤال العالم: لما المصباح بعيد… الظل بيكبر ولا بيصغر؟');
  s.append(q);
  const row = choiceRow();
  const t0 = Date.now(); let tries = 0; let hints = 0;
  const answer = (big: boolean, b: HTMLButtonElement) => {
    tries++;
    // truth: farther lamp (small angle change...) — in our sim farther → shorter. Correct: بيصغر
    if (!big) {
      b.classList.add('good'); app.audio.sfx('good');
      app.ctx().report({ activityId: 'light-shadow', skillIds: ['observation', 'prediction', 'spatial'], success: true, durationMs: Date.now() - t0, tries, hintsUsed: hints });
      app.ctx().earnCoins(6, 'اكتشفت الظل!');
      app.ctx().say('صح! كل ما المصباح بعيد، الظل بيصغر! جرّب بنفسك وشوف!');
      import('../ui/helpers').then(({ confetti }) => confetti());
    } else {
      b.classList.add('bad'); app.audio.sfx('bad');
      app.voice.speak('جرّب حرّك المصباح بعيد وشوف بعينك!');
      window.setTimeout(() => b.classList.remove('bad'), 700);
    }
  };
  const b1 = choice('📏', 'بيكبر', () => answer(true, b1));
  const b2 = choice('📐', 'بيصغر', () => answer(false, b2));
  row.append(b1, b2);
  s.append(row);
  s.append(bigButton('💡 تلميح', 'ghost', () => { hints++; slider.value = '580'; lampX = 580; draw(); app.ctx().hint(hints, 'حرّكت لك المصباح بعيداً… قارن الظل الآن!'); }));
}

/* ================= magnet (kept apparatus view) ================= */
interface MagItem { emoji: string; name: string; metal: boolean; x: number; y: number; taken: boolean; }

function magnet(app: App, s: HTMLElement): void {
  const dec = decide(app.save.data.attempts, 'magnet');
  s.append(title('🧲 المغناطيس السحري', 'اسحب المغناطيس! شو بينجذب؟'));
  app.voice.speak('توقّع أولاً: شو بينجذب للمغناطيس؟ بعدين اسحب المغناطيس وجرّب!');
  const c = document.createElement('canvas');
  c.className = 'sim'; c.width = 640; c.height = 320;
  s.append(c);
  const ctx = c.getContext('2d')!;
  const pool: Omit<MagItem, 'x' | 'y' | 'taken'>[] = [
    { emoji: '🔩', name: 'مسمار', metal: true }, { emoji: '🥄', name: 'ملعقة', metal: true },
    { emoji: '🔑', name: 'مفتاح', metal: true }, { emoji: '🧸', name: 'دب', metal: false },
    { emoji: '🍎', name: 'تفاحة', metal: false }, { emoji: '📄', name: 'ورقة', metal: false },
    { emoji: '🪙', name: 'عملة', metal: true }, { emoji: '🧷', name: 'دبوس', metal: true },
  ];
  const n = dec.difficulty === 0 ? 4 : dec.difficulty === 1 ? 6 : 8;
  const items: MagItem[] = [...pool].sort(() => Math.random() - 0.5).slice(0, n)
    .map((o, i) => ({ ...o, x: 80 + (i % 4) * 160, y: 190 + Math.floor(i / 4) * 80, taken: false }));
  let mx = 320, my = 90;
  let caught = 0; const need = items.filter((i) => i.metal).length;
  const t0 = Date.now(); let hints = 0;

  const draw = () => {
    ctx.clearRect(0, 0, 640, 320);
    ctx.fillStyle = '#e8f4ff'; ctx.fillRect(0, 0, 640, 320);
    ctx.strokeStyle = 'rgba(124,108,240,0.4)'; ctx.setLineDash([8, 8]);
    ctx.beginPath(); ctx.arc(mx, my, 90, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.font = '30px serif';
    for (const it of items) {
      if (it.taken) continue;
      ctx.fillText(it.emoji, it.x - 15, it.y + 10);
    }
    ctx.font = '52px serif'; ctx.fillText('🧲', mx - 26, my + 18);
  };
  const tick = () => {
    for (const it of items) {
      if (it.taken) continue;
      const dx = mx - it.x, dy = my - it.y;
      const dist = Math.hypot(dx, dy);
      if (it.metal && dist < 110 && dist > 24) {
        it.x += dx * 0.12; it.y += dy * 0.12;
      }
      if (it.metal && dist <= 26) {
        it.taken = true; caught++; app.audio.sfx('pop');
        if (caught >= need) {
          app.ctx().report({ activityId: 'magnet', skillIds: ['prediction', 'classification', 'observation'], success: true, durationMs: Date.now() - t0, tries: caught, hintsUsed: hints });
          app.ctx().earnCoins(7, 'قوة المغناطيس!');
          app.ctx().say('اكتشفتها! المغناطيس يجذب الحديد فقط! البلاستيك والفواكه لا!');
          import('../ui/helpers').then(({ confetti }) => confetti());
        }
      }
    }
    draw();
    if (!document.body.contains(c)) return;
    if (caught < need) requestAnimationFrame(tick);
  };
  const pos = (e: PointerEvent) => {
    const r = c.getBoundingClientRect();
    mx = ((e.clientX - r.left) / r.width) * 640;
    my = ((e.clientY - r.top) / r.height) * 320;
    draw();
  };
  c.onpointerdown = (e) => { try { c.setPointerCapture(e.pointerId); } catch { /* noop */ } pos(e); };
  c.onpointermove = (e) => { if (e.buttons) pos(e); };
  draw(); tick();
  s.append(el('p', 'lead', '💡 اسحب بإصبعك! الدائرة تُظهر قوة المغناطيس.'));
  s.append(bigButton('💡 تلميح', 'ghost', () => { hints++; app.ctx().hint(hints, 'المعدن اللامع ينجذب… جرّب المسمار والمفتاح!'); }));
}
