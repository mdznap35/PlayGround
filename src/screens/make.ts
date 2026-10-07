/* Workshop 🎨: build with numbers — bridge (counting), tower (comparison),
   free drawing (creativity). Math lives inside making. */

/* Workshop: a room you enter. A real gap in the floor, a pile of planks,
   a tester kid who walks your bridge. Touch the world: drag → build → test. */

import type { App } from '../core/app';
import { decide } from '../core/adaptive';
import { bus } from '../core/events';
import { drawNova, drawWalker, lookFromAvatar, type NovaMood } from '../engine/art';
import { Feedback } from '../engine/feedback';
import { WorldScene, type SceneObj } from '../engine/scene';
import { bigButton, choice, choiceRow, el, stage, title } from '../ui/helpers';
import { completeGuide } from '../world/guide';
import { mountScreen } from './shell';
import { roomChrome } from './lab';

export function make(app: App, root: HTMLElement, param?: string): void {
  if (param === 'tower' || param === 'draw') {
    const s = mountScreen(root);
    s.append(roomChrome(app, () => app.go('make')));
    if (param === 'tower') return tower(app, s);
    return draw(app, s);
  }
  return workshopRoom(app, root);
}

const AR_NUMBERS = ['واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية'];

function workshopRoom(app: App, root: HTMLElement): void {
  const s = mountScreen(root);
  const dec = decide(app.save.data.attempts, 'bridge-count');
  const need = dec.difficulty === 0 ? 4 : dec.difficulty === 1 ? 6 : 8;
  const withLogs = dec.difficulty === 2;

  let hints = 0;
  let placedCount = 0;
  let tries = 0;
  const t0 = Date.now();
  const built = { done: false };
  const alreadyOwned = app.save.data.world.buildings.includes('bridge');

  const say = (text: string) => {
    bus.emit('nova:say', { text });
    app.voice.speak(text);
  };

  s.append(roomChrome(app, () => app.go('world'), () => {
    hints++;
    setMood('point', 2200, pileX, pileY);
    say('اسحب الخشبات إلى الفجوة! واحدة واحدة!');
  }));

  const canvas = document.createElement('canvas');
  canvas.className = 'world-canvas scene-canvas';
  canvas.setAttribute('aria-label', 'غرفة الورشة');
  s.append(canvas);

  const scene = new WorldScene(canvas, { worldW: 1000, worldH: 620, reduceMotion: app.save.data.settings.reduceMotion });
  const fx = new Feedback(scene.particles, app.audio);
  const rm = scene.reduceMotion;

  const novaMood: { mood: NovaMood; until: number; gx?: number; gy?: number } = { mood: 'idle', until: 0 };
  const setMood = (mood: NovaMood, ms = 1600, gx?: number, gy?: number) => {
    novaMood.mood = mood;
    novaMood.until = performance.now() + ms;
    if (gx !== undefined) { novaMood.gx = gx; novaMood.gy = gy; }
  };

  // gap + slots
  const GAP = { x0: 340, x1: 660, y: 440 };
  const slotX = (i: number) => GAP.x0 + 20 + i * ((GAP.x1 - GAP.x0 - 40) / Math.max(1, need - 1));
  const slots: ({ x: number; filled: boolean } | null)[] = [];
  const pileX = 140, pileY = 300;

  // ---------- backdrop ----------
  scene.addLayer({
    parallax: 1,
    paint: (ctx, t) => {
      // wall + floor
      const g = ctx.createLinearGradient(0, 0, 0, 620);
      g.addColorStop(0, '#ffe9c4');
      g.addColorStop(0.6, '#f5cf9a');
      g.addColorStop(0.61, '#c08a52');
      g.addColorStop(1, '#9a6a3d');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 1000, 620);
      // pegboard with tools
      ctx.fillStyle = '#d9a86c';
      ctx.fillRect(640, 90, 300, 150);
      ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 4;
      ctx.strokeRect(640, 90, 300, 150);
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      for (let yy = 105; yy < 230; yy += 18) for (let xx = 655; xx < 930; xx += 18) {
        ctx.fillRect(xx, yy, 3, 3);
      }
      drawTool(ctx, 700, 165, 'hammer', t, rm);
      drawTool(ctx, 780, 165, 'saw', t, rm);
      drawTool(ctx, 860, 165, 'wrench', t, rm);
      // window
      ctx.fillStyle = '#bfe3ff';
      ctx.fillRect(60, 90, 150, 130);
      ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 5;
      ctx.strokeRect(60, 90, 150, 130);
      ctx.fillStyle = '#5fae6b';
      ctx.beginPath(); ctx.ellipse(135, 205, 40, 14, 0, 0, Math.PI * 2); ctx.fill();
      // cliffs + crack
      ctx.fillStyle = '#8d7d99';
      ctx.beginPath();
      ctx.moveTo(0, 620); ctx.lineTo(0, GAP.y - 40);
      ctx.quadraticCurveTo(180, GAP.y - 52, GAP.x0 - 30, GAP.y - 20);
      ctx.lineTo(GAP.x0 - 30, 620); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 4; ctx.stroke();
      ctx.fillStyle = '#8d7d99';
      ctx.beginPath();
      ctx.moveTo(1000, 620); ctx.lineTo(1000, GAP.y - 40);
      ctx.quadraticCurveTo(820, GAP.y - 52, GAP.x1 + 30, GAP.y - 20);
      ctx.lineTo(GAP.x1 + 30, 620); ctx.closePath(); ctx.fill();
      ctx.stroke();
      // water in the crack
      ctx.fillStyle = '#4aa3df';
      ctx.beginPath();
      ctx.moveTo(GAP.x0 - 30, GAP.y - 20);
      ctx.quadraticCurveTo(500, GAP.y - 34, GAP.x1 + 30, GAP.y - 20);
      ctx.lineTo(GAP.x1 + 30, 620); ctx.lineTo(GAP.x0 - 30, 620);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3;
      for (let i = 0; i < 4; i++) {
        const yy = GAP.y + 60 + i * 50;
        const off = rm ? 0 : Math.sin(t / 700 + i) * 10;
        ctx.beginPath(); ctx.moveTo(GAP.x0 + 20 + off, yy); ctx.quadraticCurveTo(500, yy - 6, GAP.x1 - 20 + off, yy); ctx.stroke();
      }
      // empty slot outlines
      ctx.setLineDash([8, 8]);
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = 3;
      for (let i = 0; i < need; i++) {
        if (slots[i]?.filled) continue;
        ctx.strokeRect(slotX(i) - 13, GAP.y - 34, 26, 68);
      }
      ctx.setLineDash([]);
      // easel station (right) + blocks shelf (right wall, below pegboard)
      drawEasel(ctx, 880, 480, t, rm);
      ctx.fillStyle = '#8a5a30';
      ctx.fillRect(790, 318, 180, 14);
      ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 3;
      ctx.strokeRect(790, 318, 180, 14);
      drawBlocks(ctx, 880, 318, t, rm);
    },
  });

  // ---------- stations ----------
  scene.addObject({
    id: 'st-draw', x: 880, y: 470, r: 60, depth: 471,
    draw: () => { /* painted */ },
    onTap: () => { fx.tap(); app.go('make', 'draw'); },
  });
  scene.addObject({
    id: 'st-tower', x: 880, y: 296, r: 62, depth: 289,
    draw: () => { /* painted */ },
    onTap: () => { fx.tap(); app.go('make', 'tower'); },
  });

  // ---------- Nova ----------
  const novaObj: SceneObj = {
    id: 'nova', x: 830, y: 560, r: 44, depth: 900,
    draw: (ctx, t) => {
      let mood = novaMood.mood;
      if (t > novaMood.until && (mood === 'point' || mood === 'think' || mood === 'look')) mood = 'idle';
      if (mood === 'idle' && placedCount === 0 && !built.done && !rm) mood = 'point';
      drawNova(ctx, 830, 560, 30, { mood, gazeX: mood === 'point' ? (novaMood.gx ?? pileX) : undefined, gazeY: mood === 'point' ? (novaMood.gy ?? pileY) : undefined }, t, rm,
        lookFromAvatar(app.save.data.avatar), app.save.data.avatar.charm);
    },
    onTap: () => {
      fx.discover(830, 530);
      setMood('celebrate', 900);
      say('ابنِ جسراً يعبر! عد الخشبات!');
    },
  };
  scene.addObject(novaObj);

  // ---------- planks ----------
  interface Plank extends SceneObj {
    homeX: number; homeY: number;
    kind: 'plank' | 'log';
    slotted: boolean;
  }
  const pieces: ('plank' | 'log')[] = [
    ...Array<('plank' | 'log')>(need).fill('plank'),
    ...(withLogs ? ['log' as const, 'log' as const] : []),
  ].sort(() => Math.random() - 0.5);
  pieces.forEach((kind, i) => {
    const hx = pileX + (i % 2) * 46 - 20;
    const hy = pileY - Math.floor(i / 2) * 26;
    const p: Plank = {
      id: `piece-${i}`, kind, homeX: hx, homeY: hy,
      x: hx, y: hy, r: 30, depth: 300 + i,
      slotted: false,
      draggable: true,
      draw: (ctx) => {
        if (p.slotted) return; // drawn snapped in gap below
        if (kind === 'log') {
          ctx.fillStyle = '#a4713e';
          ctx.beginPath(); ctx.ellipse(p.x, p.y, 24, 13, 0.15, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 3; ctx.stroke();
          ctx.fillStyle = '#e8c88f';
          ctx.beginPath(); ctx.ellipse(p.x + 20, p.y + 3, 7, 6, 0.15, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.fillStyle = '#c08a52';
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(-0.06);
          ctx.fillRect(-34, -11, 68, 22);
          ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 3;
          ctx.strokeRect(-34, -11, 68, 22);
          ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(30, 0); ctx.stroke();
          ctx.restore();
        }
      },
      onDrop: () => {
        if (p.slotted || built.done) { p.x = p.homeX; p.y = p.homeY; return; }
        tries++;
        // find nearest empty slot
        let best = -1, bestD = 46;
        for (let si = 0; si < need; si++) {
          if (slots[si]?.filled) continue;
          const dd = Math.hypot(p.x - slotX(si), p.y - GAP.y);
          if (dd < bestD) { bestD = dd; best = si; }
        }
        if (best < 0) { p.x = p.homeX; p.y = p.homeY; return; }
        if (kind === 'log') {
          // round logs roll off — visual error, never text
          p.x = p.homeX; p.y = p.homeY;
          fx.oops(slotX(best), GAP.y);
          setMood('react', 1400);
          say('تدحرجت! نحتاج خشبة مسطحة!');
          return;
        }
        p.slotted = true;
        p.x = slotX(best); p.y = GAP.y;
        p.depth = 100;
        slots[best] = { x: p.x, filled: true };
        placedCount++;
        fx.build(p.x, p.y);
        setMood('celebrate', 900);
        say(`${AR_NUMBERS[Math.min(placedCount - 1, 7)]}!`);
        if (placedCount >= need) finishBridge();
      },
    };
    scene.addObject(p);
  });

  // snapped planks layer (drawn in gap, above water)
  scene.addObject({
    id: 'deck', x: 500, y: GAP.y, r: 0.0001, depth: 120,
    draw: (ctx) => {
      for (let i = 0; i < need; i++) {
        if (!slots[i]?.filled) continue;
        ctx.fillStyle = '#c08a52';
        ctx.fillRect(slotX(i) - 13, GAP.y - 34, 26, 68);
        ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 3;
        ctx.strokeRect(slotX(i) - 13, GAP.y - 34, 26, 68);
      }
    },
  });

  // ---------- tester kid ----------
  const tester = { active: false, x: 0, celebrating: false };
  const testerObj: SceneObj = {
    id: 'tester', x: -100, y: -100, r: 24, depth: 130,
    draw: (ctx, t) => {
      if (!tester.active) return;
      if (!rm) tester.x += 1.6;
      if (tester.x >= GAP.x1 + 60) {
        tester.active = false;
        tester.celebrating = true;
        return;
      }
      drawWalker(ctx, tester.x, GAP.y - 44, 30, '#5db9f5', t, rm);
    },
    onTap: () => { /* kid is busy */ },
  };
  testerObj.r = 0.0001;
  scene.addObject(testerObj);

  function finishBridge(): void {
    built.done = true;
    tester.active = true;
    tester.x = GAP.x0 - 70;
    setMood('discover', 4000);
    say('الآن نختبر! هل يعبر؟');
    window.setTimeout(() => {
      if (!document.body.contains(canvas)) return;
      fx.win(500, GAP.y - 60);
      setMood('celebrate', 3000);
      const first = !alreadyOwned;
      app.ctx().report({
        activityId: 'bridge-count',
        skillIds: ['counting', 'quantity', 'construction', 'planning', 'spatial'],
        success: true, durationMs: Date.now() - t0, tries, hintsUsed: hints,
      });
      if (first) {
        app.save.update((d) => {
          if (!d.world.buildings.includes('bridge')) d.world.buildings.push('bridge');
          d.museum.push({ id: `m-${Date.now()}`, kind: 'bridge', title: 'جسري', emoji: '🌉', description: `بنيته من ${need} خشبات!`, createdAt: Date.now() });
        });
        app.save.saveNow();
        app.ctx().earnCoins(8, 'بنيت الجسر!');
        say(`عبر! الجسر صار في عالمك! عدَدت حتى ${need}!`);
      } else {
        app.ctx().earnCoins(3, 'جسر آخر!');
        say('عبر مجدداً! بناء رائع!');
      }
      import('../ui/helpers').then(({ confetti }) => confetti());
    }, 2600);
  }

  scene.start();
  say(`الفجوة تحتاج ${need} خشبات! اسحبها واحدة واحدة!`);
}

function drawTool(ctx: CanvasRenderingContext2D, x: number, y: number, kind: 'hammer' | 'saw' | 'wrench', t: number, rm: boolean): void {
  ctx.save();
  ctx.translate(x, y);
  if (kind === 'hammer') {
    ctx.rotate(-0.4);
    ctx.fillStyle = '#8a5a30'; ctx.fillRect(-3, -4, 6, 34);
    ctx.fillStyle = '#8d99ae';
    ctx.fillRect(-13, -16, 26, 13);
    ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 2.5;
    ctx.strokeRect(-13, -16, 26, 13);
  } else if (kind === 'saw') {
    ctx.fillStyle = '#c9d4e8';
    ctx.beginPath();
    ctx.moveTo(-20, 8); ctx.lineTo(14, 8); ctx.lineTo(20, -6); ctx.lineTo(-14, -6);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = '#8a5a30'; ctx.fillRect(-28, -8, 10, 18);
  } else {
    ctx.strokeStyle = '#8d99ae'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, -8, 9, 0.6, Math.PI * 2 - 0.6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 1); ctx.lineTo(0, 22); ctx.stroke();
  }
  ctx.restore();
  void t; void rm;
}

function drawEasel(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, rm: boolean): void {
  ctx.strokeStyle = '#8a5a30'; ctx.lineWidth = 7; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - 24, y + 40); ctx.lineTo(x, y - 40); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 24, y + 40); ctx.lineTo(x, y - 40); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y + 40); ctx.lineTo(x, y - 40); ctx.stroke();
  ctx.fillStyle = '#fff8ea';
  ctx.fillRect(x - 34, y - 78, 68, 52);
  ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 3;
  ctx.strokeRect(x - 34, y - 78, 68, 52);
  // little sun painting
  ctx.fillStyle = '#ffd76e';
  ctx.beginPath(); ctx.arc(x - 14, y - 62, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#5fae6b';
  ctx.beginPath(); ctx.ellipse(x + 8, y - 40, 20, 7, 0, 0, Math.PI * 2); ctx.fill();
  if (!rm) {
    ctx.fillStyle = '#ff8fb0';
    ctx.beginPath(); ctx.arc(x + 20 + Math.sin(t / 500) * 2, y - 66, 5, 0, Math.PI * 2); ctx.fill();
  }
}

function drawBlocks(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, rm: boolean): void {
  const bob = rm ? 0 : Math.sin(t / 700) * 2;
  ctx.fillStyle = '#ff8f6b';
  ctx.fillRect(x - 26, y - 20, 24, 20);
  ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 2.5;
  ctx.strokeRect(x - 26, y - 20, 24, 20);
  ctx.fillStyle = '#ffd76e';
  ctx.fillRect(x, y - 20, 24, 20);
  ctx.strokeRect(x, y - 20, 24, 20);
  ctx.fillStyle = '#7cc7f5';
  ctx.fillRect(x - 13, y - 42 + bob, 26, 22);
  ctx.strokeRect(x - 13, y - 42 + bob, 26, 22);
}

const SIZES = [
  { e: '🟥', s: 70 }, { e: '🟧', s: 58 }, { e: '🟨', s: 46 }, { e: '🟩', s: 34 }, { e: '🟦', s: 24 },
];

function tower(app: App, s: HTMLElement): void {
  const dec = decide(app.save.data.attempts, 'shapes-tower');
  const n = dec.difficulty === 0 ? 3 : dec.difficulty === 1 ? 4 : 5;
  s.append(title('🗼 برج الأشكال', 'ابنِ من الكبير للصغير!'));
  app.voice.speak('ابنِ البرج من الأكبر للأصغر! أي قطعة أكبر؟');
  const want = [...SIZES].slice(0, n).sort((a, b) => b.s - a.s);
  const st = stage(true);
  const column = el('div');
  column.style.cssText = 'display:flex;flex-direction:column-reverse;align-items:center;gap:4px;min-height:200px;justify-content:flex-start;';
  st.append(column);
  s.append(st);
  const row = choiceRow();
  s.append(row);
  let next = 0; let tries = 0; let hints = 0; const t0 = Date.now();
  for (const pc of [...want].sort(() => Math.random() - 0.5)) {
    const b = choice(pc.e, '', () => {
      tries++;
      if ((b as HTMLButtonElement).disabled) return;
      if (pc.e === want[next].e) {
        (b as HTMLButtonElement).disabled = true;
        b.classList.add('good');
        const block = el('div', '', pc.e);
        block.style.fontSize = `${pc.s + 30}px`;
        column.append(block);
        app.audio.sfx('build');
        next++;
        if (next === want.length) {
          app.ctx().report({ activityId: 'shapes-tower', skillIds: ['shapes', 'comparison', 'spatial', 'construction'], success: true, durationMs: Date.now() - t0, tries, hintsUsed: hints });
          app.ctx().earnCoins(7, 'برج عالٍ!');
          app.ctx().say('برج رائع! قارنت الأحجام ورتّبتها صح!');
          import('../ui/helpers').then(({ confetti }) => confetti());
        }
      } else {
        b.classList.add('bad'); app.audio.sfx('bad');
        app.voice.speak('البرج سيقع! نحتاج القطعة الأكبر الآن!');
        window.setTimeout(() => b.classList.remove('bad'), 700);
      }
    });
    row.append(b);
  }
  s.append(bigButton('💡 تلميح', 'ghost', () => {
    hints++;
    const remaining = [...row.children].filter((x) => !(x as HTMLButtonElement).disabled);
    app.ctx().hint(hints, 'قارن بعينيك: أي قطعة أكبر؟ ضع الأكبر أولاً!');
    void remaining;
  }));
}

function draw(app: App, s: HTMLElement): void {
  s.append(title('✏️ مرسمي', 'ارسم بإصبعك!'));
  app.voice.speak('ارسم ما تحب! اختر اللون وارسم بإصبعك!');
  const c = document.createElement('canvas');
  c.className = 'sim'; c.width = 640; c.height = 380;
  c.style.background = '#fff8ec';
  s.append(c);
  const ctx = c.getContext('2d')!;
  ctx.lineWidth = 10; ctx.lineCap = 'round';
  let color = '#7c6cf0';
  ctx.strokeStyle = color;
  const colors = choiceRow();
  for (const col of ['#7c6cf0', '#ff7a7a', '#5fd68a', '#7fd4ff', '#ffc94d', '#23224d']) {
    const b = choice('●', '', () => { color = col; ctx.strokeStyle = col; app.audio.sfx('tap'); });
    (b as HTMLElement).style.color = col;
    colors.append(b);
  }
  s.append(colors);
  let drawing = false;
  const pos = (e: PointerEvent) => {
    const r = c.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * 640, ((e.clientY - r.top) / r.height) * 380];
  };
  c.onpointerdown = (e) => { drawing = true; try { c.setPointerCapture(e.pointerId); } catch { /* noop */ } const [x, y] = pos(e); ctx.beginPath(); ctx.moveTo(x, y); };
  c.onpointermove = (e) => { if (!drawing) return; const [x, y] = pos(e); ctx.lineTo(x, y); ctx.stroke(); };
  c.onpointerup = () => { drawing = false; };
  const bar = el('div', 'toolbar');
  bar.append(bigButton('🧹 امسح', 'ghost', () => { ctx.clearRect(0, 0, 640, 380); }));
  bar.append(bigButton('🏛️ احفظ في متحفي', '', () => {
    const url = c.toDataURL('image/png');
    try { localStorage.setItem('nova.lastDrawing', url); } catch { /* ignore */ }
    app.save.update((d) => {
      d.museum.push({ id: `m-${Date.now()}`, kind: 'drawing', title: 'لوحتي', emoji: '🎨', description: 'رسمتها بيدي!', createdAt: Date.now() });
      completeGuide(d, 'make'); // a real creation counts as the make step
    });
    app.save.saveNow();
    app.audio.sfx('win');
    app.ctx().say('لوحتك في المتحف! أنت فنان!');
    app.go('museum');
  }));
  s.append(bar);
}
