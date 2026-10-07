/* City: a living place, not a shelf. Road loop with cars, strolling people,
   plots that fill as you build, construction animation, coin-icon prices
   (no reading: 🪙🪙🪙 = costs three). Museum: a real hall with pedestals —
   walk in and see what you made. */

import type { App } from '../core/app';
import { BUILDINGS } from '../core/content';
import { bus } from '../core/events';
import { drawNova, drawPlotHouse, drawWalker, lookFromAvatar, type NovaMood } from '../engine/art';
import { Feedback, breathe } from '../engine/feedback';
import { WorldScene, type SceneObj } from '../engine/scene';
import { guideNotifyVisit } from '../world/guide';
import { mountScreen } from './shell';
import { roomChrome } from './lab';

const PLOTS = [
  { x: 170, y: 392 }, { x: 330, y: 392 }, { x: 500, y: 392 }, { x: 670, y: 392 }, { x: 830, y: 392 },
  { x: 250, y: 462 }, { x: 420, y: 462 }, { x: 580, y: 462 }, { x: 750, y: 462 }, { x: 90, y: 462 },
];
const OWNABLE = BUILDINGS.filter((b) => b.id !== 'home' && b.id !== 'bridge');

export function city(app: App, root: HTMLElement): void {
  const s = mountScreen(root);
  const d = app.save.data;

  if (guideNotifyVisit(d, 'city')) {
    app.save.saveNow();
  }

  s.append(roomChrome(app, () => app.go('world')));
  const canvas = document.createElement('canvas');
  canvas.className = 'world-canvas scene-canvas';
  canvas.setAttribute('aria-label', 'مدينتي الحية');
  s.append(canvas);

  const say = (text: string) => {
    bus.emit('nova:say', { text });
    app.voice.speak(text);
  };

  const scene = new WorldScene(canvas, { worldW: 1000, worldH: 620, reduceMotion: d.settings.reduceMotion });
  const fx = new Feedback(scene.particles, app.audio);
  const rm = scene.reduceMotion;
  const coins = { n: d.world.coins };
  const purseSync = () => { coins.n = app.save.data.world.coins; };

  const novaMood: { mood: NovaMood; until: number } = { mood: 'idle', until: 0 };

  // ---------- backdrop: sky, skyline silhouette, ground, road loop ----------
  scene.addLayer({
    parallax: 0.25,
    paint: (ctx, t) => {
      const g = ctx.createLinearGradient(0, 0, 0, 620);
      g.addColorStop(0, '#7fb8f2');
      g.addColorStop(0.6, '#cfe8ff');
      g.addColorStop(0.61, '#9bdc9b');
      g.addColorStop(1, '#7cc47f');
      ctx.fillStyle = g;
      ctx.fillRect(-500, -100, 2000, 900); // full-bleed on any aspect
      // far skyline silhouette
      ctx.fillStyle = 'rgba(120,140,190,0.5)';
      for (let i = 0; i < 12; i++) {
        const bw = 50 + ((i * 37) % 40);
        const bh = 60 + ((i * 53) % 90);
        ctx.fillRect(i * 86, 330 - bh, bw, bh);
      }
      // sun + cloud
      ctx.fillStyle = '#ffd76e';
      ctx.beginPath(); ctx.arc(880, 80, 30, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      const cx = rm ? 200 : ((t * 6) % 1200) - 100;
      ctx.beginPath();
      ctx.ellipse(cx, 90, 46, 15, 0, 0, Math.PI * 2);
      ctx.ellipse(cx - 30, 96, 26, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      void t;
    },
  });

  scene.addLayer({
    parallax: 1,
    paint: (ctx, t) => {
      void t;
      // road loop
      ctx.strokeStyle = '#6b6f7e';
      ctx.lineWidth = 46;
      ctx.beginPath();
      ctx.roundRect(60, 300, 880, 240, 60);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 3;
      ctx.setLineDash([16, 18]);
      ctx.beginPath();
      ctx.roundRect(60, 300, 880, 240, 60);
      ctx.stroke();
      ctx.setLineDash([]);
      // crosswalk
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      for (let i = 0; i < 5; i++) ctx.fillRect(478 + i * 12, 516, 6, 24);
      // lamps
      for (const lx of [140, 480, 820]) {
        ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(lx, 330); ctx.lineTo(lx, 250); ctx.stroke();
        ctx.fillStyle = '#ffd76e';
        ctx.beginPath(); ctx.arc(lx, 244, 10, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 2.5; ctx.stroke();
      }
    },
  });

  // ---------- plots ----------
  const owned = new Set(d.world.buildings);
  const constructing = new Map<number, number>(); // plot idx → start time

  OWNABLE.slice(0, PLOTS.length).forEach((b, i) => {
    const P = PLOTS[i];
    const obj: SceneObj = {
      id: `plot-${b.id}`, x: P.x, y: P.y, r: 62, depth: P.y,
      draw: (ctx, t) => {
        if (owned.has(b.id)) {
          const pulse = breathe(t, P.x);
          ctx.save();
          ctx.translate(P.x, P.y); ctx.scale(pulse, pulse); ctx.translate(-P.x, -P.y);
          drawPlotHouse(ctx, P.x, P.y, 104, i);
          ctx.restore();
        } else if (constructing.has(i)) {
          const k = Math.min(1, (t - constructing.get(i)!) / 1600);
          // rising house + crane
          ctx.save();
          ctx.globalAlpha = 0.4 + 0.6 * k;
          ctx.translate(P.x, P.y + (1 - k) * 60);
          drawPlotHouse(ctx, 0, 0, 104, i);
          ctx.restore();
          ctx.strokeStyle = '#e26d5a'; ctx.lineWidth = 5;
          ctx.beginPath(); ctx.moveTo(P.x - 60, P.y); ctx.lineTo(P.x - 60, P.y - 150); ctx.lineTo(P.x - 10, P.y - 150); ctx.stroke();
          if (k >= 1) {
            constructing.delete(i);
            owned.add(b.id);
            fx.build(P.x, P.y);
            purseSync();
            say(`${b.name}! صارت جزءاً من مدينتك!`);
          }
        } else {
          // ghost plot + coin-icon price (reads without reading)
          ctx.strokeStyle = 'rgba(42,35,80,0.4)';
          ctx.setLineDash([7, 7]);
          ctx.lineWidth = 3;
          ctx.strokeRect(P.x - 46, P.y - 70, 92, 96);
          ctx.setLineDash([]);
          const pulse = breathe(t, P.x);
          ctx.save();
          ctx.translate(P.x, P.y - 20); ctx.scale(pulse, pulse); ctx.translate(-P.x, -(P.y - 20));
          ctx.font = '30px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(b.emoji, P.x, P.y - 20);
          ctx.restore();
          // price as coin icons (max 5 shown + dots)
          ctx.font = '15px serif';
          const show = Math.min(5, Math.ceil(b.cost / 10));
          let price = '';
          for (let c = 0; c < show; c++) price += '🪙';
          if (Math.ceil(b.cost / 10) > 5) price += '…';
          ctx.fillText(b.cost === 0 ? '🎁' : price, P.x, P.y + 44);
        }
      },
      onTap: () => {
        if (owned.has(b.id)) {
          fx.discover(P.x, P.y - 40);
          say(`${b.name}!`);
          return;
        }
        if (constructing.has(i)) return;
        purseSync();
        if (b.cost > 0 && coins.n < b.cost) {
          fx.oops(P.x, P.y);
          say('تحتاج عملات أكثر! العب واكسب!');
          return;
        }
        fx.tap();
        app.save.update((dd) => {
          if (b.cost > 0) dd.world.coins -= b.cost;
          if (!dd.world.buildings.includes(b.id)) dd.world.buildings.push(b.id);
        });
        app.save.saveNow();
        constructing.set(i, performance.now());
        fx.build(P.x, P.y);
        say('بناء رائع! شاهد مدينتك تكبر!');
      },
    };
    scene.addObject(obj);
  });

  // ---------- cars on the loop ----------
  const cars = [
    { c: '#e26d5a', off: 0, speed: 0.00011, dir: 1 },
    { c: '#5db9f5', off: 0.5, speed: 0.00009, dir: -1 },
  ];
  const carObj: SceneObj = {
    id: 'cars', x: 500, y: 420, r: 0.0001, depth: 419,
    draw: (ctx, t) => {
      for (const car of cars) {
        const p = roadPoint(rm ? car.off : (car.off + (t * car.speed * car.dir + 1) % 1 + 1) % 1);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.ang);
        if (car.dir < 0) ctx.rotate(Math.PI);
        ctx.fillStyle = car.c;
        ctx.beginPath();
        ctx.roundRect(-24, -11, 48, 22, 7);
        ctx.fill();
        ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.fillStyle = '#bfe3ff';
        ctx.fillRect(-10, -8, 20, 9);
        ctx.fillStyle = '#2a2350';
        ctx.beginPath(); ctx.arc(-13, 11, 6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(13, 11, 6, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    },
  };
  scene.addObject(carObj);

  // ---------- strollers (on the grass verge, clear of traffic) ----------
  const walkers = [
    { x0: 200, y: 588, c: '#ff8fb0', ph: 0 },
    { x0: 800, y: 588, c: '#7cc7f5', ph: 2 },
  ];
  walkers.forEach((w, i) => {
    const o: SceneObj = {
      id: `walker-${i}`, x: w.x0, y: w.y, r: 22, depth: w.y + 1,
      draw: (ctx, t) => {
        const x = rm ? w.x0 : w.x0 + Math.sin(t / 2600 + w.ph) * 70;
        o.x = x;
        drawWalker(ctx, x, w.y, 26, w.c, t, rm, Math.cos(t / 2600 + w.ph) < 0);
      },
      onTap: () => { fx.tap(); say('جارك يتمشى! المدينة حية!'); },
    };
    scene.addObject(o);
  });

  // ---------- Nova ----------
  scene.addObject({
    id: 'nova', x: 90, y: 250, r: 44, depth: 900,
    draw: (ctx, t) => {
      const mood = t > novaMood.until ? 'idle' : novaMood.mood;
      drawNova(ctx, 90, 250, 28, { mood }, t, rm,
        lookFromAvatar(app.save.data.avatar), app.save.data.avatar.charm);
    },
    onTap: () => {
      fx.discover(90, 220);
      novaMood.mood = 'celebrate'; novaMood.until = performance.now() + 900;
      say('هذه مدينتك! أنت تبنيها!');
    },
  });

  scene.start();
  say(d.world.buildings.length <= 1 ? 'مدينتك فارغة! المس أرضاً لبناء أول بيت!' : 'مدينتك حية! السيارات تتحرك والناس تتمشى!');
}

function roadPoint(p: number): { x: number; y: number; ang: number } {
  // rounded-rect loop approximator: perimeter walk
  const x0 = 60, y0 = 300, w = 880, h = 240;
  const per = 2 * (w + h);
  let d = ((p % 1) + 1) % 1 * per;
  if (d < w) return { x: x0 + d, y: y0, ang: 0 };
  d -= w;
  if (d < h) return { x: x0 + w, y: y0 + d, ang: Math.PI / 2 };
  d -= h;
  if (d < w) return { x: x0 + w - d, y: y0 + h, ang: Math.PI };
  d -= w;
  return { x: x0, y: y0 + h - d, ang: -Math.PI / 2 };
}

/* ================= museum hall ================= */
export function museum(app: App, root: HTMLElement): void {
  const s = mountScreen(root);
  const d = app.save.data;
  s.append(roomChrome(app, () => app.go('world')));
  const canvas = document.createElement('canvas');
  canvas.className = 'world-canvas scene-canvas';
  canvas.setAttribute('aria-label', 'قاعة المتحف');
  s.append(canvas);

  const say = (text: string) => {
    bus.emit('nova:say', { text });
    app.voice.speak(text);
  };

  const scene = new WorldScene(canvas, { worldW: 1000, worldH: 620, reduceMotion: d.settings.reduceMotion });
  const fx = new Feedback(scene.particles, app.audio);
  const rm = scene.reduceMotion;

  const items = [...d.museum].reverse().slice(0, 7);
  const films = d.world.films.slice(-2);

  scene.addLayer({
    parallax: 1,
    paint: (ctx, t) => {
      // grand hall
      const g = ctx.createLinearGradient(0, 0, 0, 620);
      g.addColorStop(0, '#6a5a8e');
      g.addColorStop(0.55, '#8e7bb5');
      g.addColorStop(0.56, '#5e4f7e');
      g.addColorStop(1, '#463c60');
      ctx.fillStyle = g;
      ctx.fillRect(-500, -100, 2000, 900); // full-bleed on any aspect
      // skylight beam
      ctx.fillStyle = 'rgba(255,240,190,0.14)';
      ctx.beginPath();
      ctx.moveTo(420, 0); ctx.lineTo(580, 0); ctx.lineTo(700, 620); ctx.lineTo(300, 620);
      ctx.closePath(); ctx.fill();
      // arched windows
      for (const wx of [120, 880]) {
        ctx.fillStyle = '#cfe4ff';
        ctx.beginPath();
        ctx.moveTo(wx - 40, 220); ctx.lineTo(wx - 40, 120);
        ctx.quadraticCurveTo(wx, 70, wx + 40, 120);
        ctx.lineTo(wx + 40, 220); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 4; ctx.stroke();
      }
      // carpet
      ctx.fillStyle = '#a34a5e';
      ctx.fillRect(0, 470, 1000, 90);
      ctx.fillStyle = '#c9758a';
      ctx.fillRect(0, 470, 1000, 12);
      ctx.fillRect(0, 548, 1000, 12);
      void t;
    },
  });

  if (items.length === 0 && films.length === 0) {
    scene.addLayer({
      parallax: 1,
      paint: (ctx, t) => {
        // empty hall: one bare pedestal waiting (hope, not dead space)
        drawPedestal(ctx, 500, 430, null, t, rm);
        ctx.font = '44px serif'; ctx.textAlign = 'center';
        ctx.fillText('✨', 500, 300 + (rm ? 0 : Math.sin(t / 700) * 8));
      },
    });
  }

  const all: { emoji: string; title: string; desc: string; kind: string }[] = [
    ...items.map((m) => ({ emoji: m.emoji, title: m.title, desc: m.description, kind: m.kind })),
    ...films.map((f) => ({ emoji: '🎬', title: f.title, desc: f.scenes.join(' '), kind: 'film' })),
  ];

  all.forEach((a, i) => {
    const px = 150 + i * 118;
    const o: SceneObj = {
      id: `ped-${i}`, x: px, y: 430, r: 52, depth: 431,
      draw: (ctx, t) => drawPedestal(ctx, px, 430, a.emoji, t, rm),
      onTap: () => {
        fx.celebrate(px, 330);
        say(`${a.title}! ${a.desc}`);
      },
    };
    scene.addObject(o);
  });

  scene.addObject({
    id: 'nova', x: 880, y: 500, r: 44, depth: 900,
    draw: (ctx, t) => drawNova(ctx, 880, 500, 28, { mood: 'idle' }, t, rm,
      lookFromAvatar(app.save.data.avatar), app.save.data.avatar.charm),
    onTap: () => {
      fx.discover(880, 470);
      say(items.length ? 'هذا متحفك! كل ما صنعته!' : 'متحفك ينتظر أول إبداع!');
    },
  });

  scene.start();
  say(items.length || films.length ? 'هذا متحفك! المس أي شيء لتتذكره!' : 'متحفك فارغ… العب واصنع وستظهر إبداعاتك هنا!');
}

function drawPedestal(ctx: CanvasRenderingContext2D, x: number, y: number, emoji: string | null, t: number, rm: boolean): void {
  // column
  ctx.fillStyle = '#efe9da';
  ctx.fillRect(x - 30, y - 110, 60, 110);
  ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 3.5;
  ctx.strokeRect(x - 30, y - 110, 60, 110);
  ctx.fillStyle = '#d9d0b8';
  ctx.fillRect(x - 38, y - 122, 76, 14);
  ctx.strokeRect(x - 38, y - 122, 76, 14);
  ctx.fillRect(x - 36, y - 8, 72, 10);
  // light cone
  ctx.fillStyle = 'rgba(255,240,190,0.12)';
  ctx.beginPath();
  ctx.moveTo(x - 20, 60); ctx.lineTo(x + 20, 60);
  ctx.lineTo(x + 44, y - 120); ctx.lineTo(x - 44, y - 120);
  ctx.closePath(); ctx.fill();
  if (emoji) {
    const bob = rm ? 0 : Math.sin(t / 800 + x) * 3;
    ctx.font = '46px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(emoji, x, y - 160 + bob);
    ctx.fillStyle = 'rgba(255,215,110,0.85)';
    ctx.beginPath(); ctx.arc(x + 30, y - 190, 4, 0, Math.PI * 2); ctx.fill();
  }
}
