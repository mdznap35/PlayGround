/* NOVA Island: the main world. One living vista, not a menu.
   Places are buildings you touch; Nova walks with you; the camera flies you in.
   Depth layers: sky → sun/clouds → sea → far hills → island → river/road →
   places (sorted) → Nova → ambient → particles. */

import type { App, ScreenName } from '../core/app';
import { QUESTS } from '../core/content';
import { bus } from '../core/events';
import type { ZoneId } from '../core/types';
import { Feedback, breathe, spotlight } from '../engine/feedback';
import { WorldScene, type SceneObj } from '../engine/scene';
import { el } from '../ui/helpers';
import { guideStep } from '../world/guide';
import { openAvatarPicker } from './avatar';
import { mountScreen } from './shell';
import {
  drawBush, drawCave, drawCityHall, drawGarage, drawGate, drawHospital, drawHouse,
  drawLab, drawLibrary, drawMosque, drawMuseum, drawNova, drawPad, drawPine,
  drawStage, drawTreehouse, drawWalker, drawWorkshop, labelPill,
  lookFromAvatar,
  type NovaMood,
} from '../engine/art';

/** Visual layout in 1000×620 design space. */
const LAYOUT: Record<ZoneId, { x: number; y: number; s: number }> = {
  home: { x: 500, y: 470, s: 112 },
  lab: { x: 228, y: 362, s: 100 },
  make: { x: 772, y: 362, s: 104 },
  robot: { x: 882, y: 472, s: 94 },
  body: { x: 350, y: 272, s: 92 },
  mind: { x: 650, y: 272, s: 96 },
  explorer: { x: 118, y: 472, s: 100 },
  space: { x: 882, y: 176, s: 94 },
  city: { x: 500, y: 178, s: 122 },
  stories: { x: 298, y: 508, s: 100 },
  music: { x: 702, y: 508, s: 94 },
  impossible: { x: 108, y: 300, s: 90 },
  values: { x: 500, y: 550, s: 94 },
  museum: { x: 864, y: 548, s: 90 },
  parents: { x: -100, y: -100, s: 0 },
};

const DECOR_LINES: Record<string, string> = {
  bridge: 'جسرك! بنيته بيدك ويعبر النهر!',
  'comp-robot': 'روبوتك يعيش هنا! صنعته أنت!',
  cinema: 'فيلمك يُعرض هنا!',
  garden: 'حديقتك تكبر! اسقها دائماً!',
  city: 'مدينتك تكبر! أحسنت البناء!',
};

export function world(app: App, root: HTMLElement): void {
  const s = mountScreen(root);
  const d = app.save.data;

  // ---- slim chrome: coins orb + quest pill + beach orb + parents orb (no titles, no menus)
  const chrome = el('div', 'world-chrome');
  const purse = el('button', 'orb purse-orb', `🪙<b>${d.world.coins}</b>`) as HTMLButtonElement;
  purse.setAttribute('aria-label', 'عملاتي');
  purse.onclick = () => { app.audio.sfx('coin'); };
  const questPill = el('button', 'orb quest-orb', '🗺️') as HTMLButtonElement;
  const activeQuest = QUESTS.find((q) => {
    const qp = d.quests.find((x) => x.questId === q.id);
    return qp && !qp.done;
  });
  if (activeQuest) {
    const qp = d.quests.find((x) => x.questId === activeQuest.id)!;
    const dots = activeQuest.steps.map((st) => (qp.stepsDone.includes(st.id) ? '●' : '○')).join('');
    questPill.innerHTML = `${activeQuest.emoji}<small>${dots}</small>`;
    questPill.setAttribute('aria-label', activeQuest.title);
  } else {
    questPill.setAttribute('aria-label', 'مغامراتي');
  }
  questPill.onclick = () => { app.audio.sfx('tap'); app.go('quests'); };
  // doorway to the living beach (the Creative Reset slice) — always one tap away
  const beach = el('button', 'orb beach-orb', d.hatch?.hatchedAt ? '🌙' : '🥚') as HTMLButtonElement;
  beach.setAttribute('aria-label', 'شاطئ نوفا');
  beach.onclick = () => { app.audio.sfx('splash'); app.go('hatch'); };
  const parents = el('button', 'orb parents-orb', '👨‍👩‍👧') as HTMLButtonElement;
  parents.setAttribute('aria-label', 'منطقة الوالدين');
  parents.onclick = () => app.go('parents');
  chrome.append(purse, questPill, beach, parents);
  s.append(chrome);

  const canvas = document.createElement('canvas');
  canvas.className = 'world-canvas';
  canvas.setAttribute('aria-label', 'جزيرة نوفا');
  s.append(canvas);

  const step = guideStep(d);
  const say = (text: string) => {
    bus.emit('nova:say', { text });
    app.voice.speak(text);
  };

  const scene = new WorldScene(canvas, { worldW: 1000, worldH: 620, reduceMotion: d.settings.reduceMotion });
  const fx = new Feedback(scene.particles, app.audio);
  const rm = scene.reduceMotion;

  // ================= LAYER 1: sky =================
  let skyGrad: CanvasGradient | null = null;
  scene.addLayer({
    parallax: 0.04,
    paint: (ctx, t) => {
      if (!skyGrad) {
        skyGrad = ctx.createLinearGradient(0, -80, 0, 620);
        skyGrad.addColorStop(0, '#5f8ff2');
        skyGrad.addColorStop(0.5, '#a8d4ff');
        skyGrad.addColorStop(0.72, '#ffe9bd');
        skyGrad.addColorStop(1, '#ffd9a0');
      }
      ctx.fillStyle = skyGrad;
      ctx.fillRect(-200, -120, 1400, 760);
      // sun with halo
      ctx.fillStyle = 'rgba(255,214,110,0.3)';
      ctx.beginPath(); ctx.arc(830, 90, 56, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd76e';
      ctx.beginPath(); ctx.arc(830, 90, 36, 0, Math.PI * 2); ctx.fill();
      // drifting clouds
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      for (let i = 0; i < 5; i++) {
        const cx = rm ? 120 + i * 210 : ((t * (5 + i * 2) + i * 260) % 1500) - 250;
        const cy = 50 + i * 34;
        const sc = 0.8 + (i % 3) * 0.35;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 44 * sc, 15 * sc, 0, 0, Math.PI * 2);
        ctx.ellipse(cx - 28 * sc, cy + 6 * sc, 24 * sc, 11 * sc, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + 28 * sc, cy + 6 * sc, 24 * sc, 11 * sc, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // birds
      ctx.fillStyle = '#3a4666';
      for (let i = 0; i < 3; i++) {
        const bx = rm ? 200 + i * 90 : ((t * (14 + i * 5) + i * 400) % 1300) - 150;
        const by = 120 + i * 40 + (rm ? 0 : 9 * Math.sin(t / 600 + i * 2));
        const w = rm ? 0 : Math.sin(t / 180 + i) * 4;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(bx - 9, by - w);
        ctx.quadraticCurveTo(bx, by + 2, bx, by);
        ctx.quadraticCurveTo(bx, by + 2, bx + 9, by - w);
        ctx.stroke();
      }
    },
  });

  // ================= LAYER 2: sea =================
  let seaGrad: CanvasGradient | null = null;
  scene.addLayer({
    parallax: 0.3,
    paint: (ctx, t) => {
      if (!seaGrad) {
        seaGrad = ctx.createLinearGradient(0, 240, 0, 700);
        seaGrad.addColorStop(0, '#4aa3df');
        seaGrad.addColorStop(1, '#2f7fc9');
      }
      ctx.fillStyle = seaGrad;
      ctx.fillRect(-200, 260, 1400, 420);
      // shimmer
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 10; i++) {
        const ph = rm ? i : (t / 1300 + i * 0.7) % 1;
        const x = 60 + ((i * 137) % 900);
        const y = 300 + ((i * 89) % 260);
        const len = 12 + 14 * Math.sin(ph * Math.PI);
        ctx.globalAlpha = 0.25 + 0.35 * Math.sin(ph * Math.PI);
        ctx.beginPath();
        ctx.moveTo(x - len, y); ctx.quadraticCurveTo(x, y - 4, x + len, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // boat circling
      const a = rm ? 0.7 : t / 14000;
      const bx = 500 + Math.cos(a) * 430;
      const by = 470 + Math.sin(a) * 130;
      drawBoat(ctx, bx, by, rm ? 0 : t);
    },
  });

  // ================= LAYER 3: island =================
  let grassGrad: CanvasGradient | null = null;
  scene.addLayer({
    parallax: 1,
    paint: (ctx, t) => {
      // sand rim
      ctx.fillStyle = '#f2dfa8';
      ctx.beginPath(); ctx.ellipse(500, 432, 452, 178, 0, 0, Math.PI * 2); ctx.fill();
      // grass
      if (!grassGrad) {
        grassGrad = ctx.createLinearGradient(0, 260, 0, 610);
        grassGrad.addColorStop(0, '#9bdc9b');
        grassGrad.addColorStop(1, '#6fb877');
      }
      ctx.fillStyle = grassGrad;
      ctx.beginPath(); ctx.ellipse(500, 426, 432, 162, 0, 0, Math.PI * 2); ctx.fill();
      // light meadow patch
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.beginPath(); ctx.ellipse(420, 380, 220, 70, -0.1, 0, Math.PI * 2); ctx.fill();
      // hills under city + space
      ctx.fillStyle = '#7cc47f';
      ctx.beginPath(); ctx.ellipse(500, 210, 130, 62, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(882, 205, 105, 52, 0, 0, Math.PI * 2); ctx.fill();
      // river
      ctx.strokeStyle = '#4aa3df';
      ctx.lineWidth = 26;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(70, 408); ctx.quadraticCurveTo(500, 392, 930, 412); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.moveTo(70, 408); ctx.quadraticCurveTo(500, 392, 930, 412); ctx.stroke();
      // road home → city
      ctx.strokeStyle = '#eec88d';
      ctx.lineWidth = 15;
      ctx.beginPath(); ctx.moveTo(500, 470); ctx.quadraticCurveTo(460, 330, 500, 205); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 12]);
      ctx.beginPath(); ctx.moveTo(500, 470); ctx.quadraticCurveTo(460, 330, 500, 205); ctx.stroke();
      ctx.setLineDash([]);
      // trees + bushes
      drawPine(ctx, 200, 480, 64, t, rm);
      drawPine(ctx, 830, 400, 56, t, rm);
      drawPine(ctx, 620, 560, 60, t, rm);
      drawBush(ctx, 380, 520, 40, t, rm);
      drawBush(ctx, 640, 440, 34, t, rm);
      drawBush(ctx, 170, 380, 30, t, rm);
      void t;
    },
  });

  // ================= places =================
  const owned = d.world.buildings;
  const hasBridge = owned.includes('bridge');
  const hasRobot = d.world.companions.includes('🤖');

  interface PlaceState { door: number; }
  const states = new Map<string, PlaceState>();

  const drawPlace = (zone: ZoneId) => {
    const L = LAYOUT[zone];
    return (ctx: CanvasRenderingContext2D, t: number) => {
      const st = states.get(zone) ?? { door: 0 };
      states.set(zone, st);
      const pulse = breathe(t, L.x);
      ctx.save();
      ctx.translate(L.x, L.y);
      ctx.scale(pulse, pulse);
      ctx.translate(-L.x, -L.y);
      const c = { x: L.x, y: L.y, s: L.s, t, rm };
      switch (zone) {
        case 'home': drawHouse(ctx, c.x, c.y, c.s, t, rm, st.door); break;
        case 'lab': drawLab(ctx, c.x, c.y, c.s, t, rm); break;
        case 'make': drawWorkshop(ctx, c.x, c.y, c.s, t, rm); break;
        case 'robot': drawGarage(ctx, c.x, c.y, c.s, t, rm, hasRobot); break;
        case 'body': drawHospital(ctx, c.x, c.y, c.s, t, rm); break;
        case 'mind': drawLibrary(ctx, c.x, c.y, c.s, t, rm); break;
        case 'explorer': drawGate(ctx, c.x, c.y, c.s, t, rm); break;
        case 'space': drawPad(ctx, c.x, c.y, c.s, t, rm); break;
        case 'city': drawCityHall(ctx, c.x, c.y, c.s, t, rm, owned.length); break;
        case 'stories': drawTreehouse(ctx, c.x, c.y, c.s, t, rm); break;
        case 'music': drawStage(ctx, c.x, c.y, c.s, t, rm); break;
        case 'impossible': drawCave(ctx, c.x, c.y, c.s, t, rm); break;
        case 'values': drawMosque(ctx, c.x, c.y, c.s, t, rm); break;
        case 'museum': drawMuseum(ctx, c.x, c.y, c.s, t, rm, d.museum.length + d.world.films.length); break;
        default: break;
      }
      ctx.restore();
      // tiny name pill (secondary support for parents; the world reads without it)
      labelPill(ctx, L.x, L.y + 34, nameOf(zone));
      // guide spotlight: THE thing to touch
      if (step && step.target === zone) spotlight(ctx, L.x, L.y - 20, L.s * 0.62, t, rm);
    };
  };

  const traveling = { busy: false };

  const goPlace = (zone: ZoneId) => {
    if (traveling.busy) return;
    traveling.busy = true;
    const L = LAYOUT[zone];
    const st = states.get(zone) ?? { door: 0 };
    states.set(zone, st);
    st.door = 1; // door swings open as you arrive
    nova.target = { x: L.x, y: L.y + 52 };
    nova.onArrive = () => {
      nova.mood = 'celebrate';
      nova.moodUntil = performance.now() + 650;
      fx.discover(L.x, L.y);
      scene.cam.focus(L.x - 100 / 1.9, L.y - 80 / 1.9, 1.9, 750, () => {
        app.audio.sfx('step');
        app.go(zone as ScreenName);
      });
    };
  };

  const zones: ZoneId[] = ['city', 'space', 'body', 'mind', 'impossible', 'lab', 'make', 'home', 'robot', 'explorer', 'stories', 'music', 'values', 'museum'];
  for (const z of zones) {
    const L = LAYOUT[z];
    const paint = drawPlace(z);
    const obj: SceneObj = {
      id: `place-${z}`, x: L.x, y: L.y, r: L.s * 0.62, depth: L.y,
      draw: (ctx, t) => paint(ctx, t),
      onTap: () => { fx.tap(); goPlace(z); },
    };
    scene.addObject(obj);
  }

  // ---- bridge artifact (physical reward, tappable) — clear of the road
  if (hasBridge) {
    const b: SceneObj = {
      id: 'bridge', x: 640, y: 398, r: 60, depth: 399,
      draw: (ctx, t) => {
        ctx.save();
        ctx.translate(640, 392);
        if (!rm) ctx.translate(0, Math.sin(t / 900) * 1.5);
        // planks
        for (let i = 0; i < 7; i++) {
          const px = -60 + i * 20;
          ctx.fillStyle = i % 2 ? '#b07a45' : '#c08a52';
          ctx.fillRect(px, -8, 17, 46);
          ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 2.5;
          ctx.strokeRect(px, -8, 17, 46);
        }
        // rails
        ctx.strokeStyle = '#8a5a30'; ctx.lineWidth = 6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-66, -12); ctx.lineTo(66, -12); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-66, 42); ctx.lineTo(66, 42); ctx.stroke();
        ctx.restore();
        labelPill(ctx, 640, 446, 'جسري!');
      },
      onTap: () => { fx.discover(640, 392); say(DECOR_LINES.bridge); },
    };
    scene.addObject(b);
  }

  // ---- robot companion strolling by the workshop
  if (hasRobot) {
    const r: SceneObj = {
      id: 'comp-robot', x: 700, y: 430, r: 34, depth: 431,
      draw: (ctx, t) => {
        if (!rm) r.x = 690 + Math.sin(t / 2400) * 26;
        drawWalker(ctx, r.x, r.y, 30, '#9fb0cc', t, rm, Math.cos(t / 2400) < 0);
        // robot head overlay
        ctx.fillStyle = '#c9d4e8';
        ctx.beginPath(); ctx.arc(r.x, r.y - 22, 10, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#59e3a8';
        ctx.beginPath(); ctx.arc(r.x - 3.5, r.y - 23, 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(r.x + 3.5, r.y - 23, 2.2, 0, Math.PI * 2); ctx.fill();
      },
      onTap: () => {
        fx.discover(r.x, r.y - 20);
        say(DECOR_LINES['comp-robot']);
        scene.cam.focus(r.x - 100 / 1.9, r.y - 80 / 1.9, 1.9, 700, () => app.go('robot'));
      },
    };
    scene.addObject(r);
  }

  // ---- garden patch (grows with plants)
  const plants = Math.min(6, d.world.garden.plants);
  if (plants > 0) {
    const g: SceneObj = {
      id: 'garden', x: 205, y: 545, r: 60, depth: 546,
      draw: (ctx, t) => {
        ctx.fillStyle = 'rgba(63,138,79,0.35)';
        ctx.beginPath(); ctx.ellipse(205, 548, 62, 18, 0, 0, Math.PI * 2); ctx.fill();
        for (let i = 0; i < plants; i++) {
          const px = 165 + (i % 3) * 38;
          const py = 540 + Math.floor(i / 3) * 16;
          drawBush(ctx, px, py, 22, t + i * 300, rm);
          if (i % 2) {
            ctx.font = '15px serif'; ctx.textAlign = 'center';
            ctx.fillText('🌻', px + 12, py - 12);
          }
        }
        for (const a of d.world.garden.animals.slice(0, 2)) {
          ctx.font = '20px serif'; ctx.textAlign = 'center';
          ctx.fillText(a, 205, 522 + (rm ? 0 : Math.sin(t / 500) * 3));
        }
      },
      onTap: () => { fx.discover(205, 530); say(DECOR_LINES.garden); },
    };
    scene.addObject(g);
  }

  // ---- cinema marquee (film reward)
  if (d.world.films.length > 0) {
    const film = d.world.films[d.world.films.length - 1];
    const c: SceneObj = {
      id: 'cinema', x: 780, y: 560, r: 44, depth: 561,
      draw: (ctx, t) => {
        ctx.fillStyle = '#3a3450';
        ctx.beginPath();
        const wpx = ctx.measureText(film.title).width;
        void wpx;
        ctx.fillRect(780 - 46, 548, 92, 26);
        ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 2.5;
        ctx.strokeRect(780 - 46, 548, 92, 26);
        // chasing bulbs
        for (let i = 0; i < 8; i++) {
          const on = rm ? true : Math.sin(t / 220 + i * 1.4) > 0;
          ctx.fillStyle = on ? '#ffd76e' : '#7a6a4a';
          ctx.beginPath(); ctx.arc(780 - 40 + i * 11.5, 548, 3, 0, Math.PI * 2); ctx.fill();
        }
        ctx.font = '22px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('🎬', 780, 534 + (rm ? 0 : Math.sin(t / 700) * 2));
        labelPill(ctx, 780, 574, film.title);
      },
      onTap: () => { fx.discover(780, 540); say(`فيلمك يُعرض هنا: ${film.title}!`); },
    };
    scene.addObject(c);
  }

  // ---- passport flags at the gate
  d.passport.slice(0, 6).forEach((_, i) => {
    const f: SceneObj = {
      id: `flag-${i}`, x: 58 + i * 20, y: 512, r: 16, depth: 513,
      draw: (ctx, t) => {
        ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(58 + i * 20, 512); ctx.lineTo(58 + i * 20, 486); ctx.stroke();
        ctx.fillStyle = '#ff6b7e';
        const wave = rm ? 0 : Math.sin(t / 400 + i) * 2;
        ctx.beginPath();
        ctx.moveTo(58 + i * 20, 486);
        ctx.lineTo(58 + i * 20 + 15 + wave, 490);
        ctx.lineTo(58 + i * 20, 494);
        ctx.closePath(); ctx.fill();
      },
      onTap: () => { fx.discover(58 + i * 20, 490); say('أعلام رحلاتك حول العالم!'); },
    };
    scene.addObject(f);
  });

  // ---- city strollers (life on the road, only when city grows)
  if (ownedExtra(d) >= 2) {
    const w1: SceneObj = {
      id: 'walker-1', x: 480, y: 380, r: 20, depth: 381,
      draw: (ctx, t) => {
        if (!rm) w1.y = 470 - ((t / 40) % 265);
        drawWalker(ctx, w1.x, w1.y, 26, '#ff8fb0', t, rm);
      },
      onTap: () => { fx.tap(); say('جارك يتمشى في المدينة!'); },
    };
    scene.addObject(w1);
  }

  // ================= NOVA =================
  interface NovaState {
    x: number; y: number;
    target: { x: number; y: number } | null;
    onArrive: (() => void) | null;
    mood: NovaMood;
    moodUntil: number;
    lastT: number;
  }
  const nova: NovaState = { x: 428, y: 505, target: null, onArrive: null, mood: 'idle', moodUntil: 0, lastT: performance.now() };

  const novaObj: SceneObj = {
    id: 'nova', x: 428, y: 505, r: 40, depth: 10000,
    draw: (ctx, t) => {
      const dt = Math.min(100, t - nova.lastT);
      nova.lastT = t;
      if (nova.target && !rm) {
        const dx = nova.target.x - nova.x;
        const dy = nova.target.y - nova.y;
        const dist = Math.hypot(dx, dy);
        const stepPx = (dt / 1000) * 300;
        nova.mood = 'walk';
        if (dist <= stepPx + 1) {
          nova.x = nova.target.x; nova.y = nova.target.y;
          nova.target = null;
          const cb = nova.onArrive;
          nova.onArrive = null;
          cb?.();
        } else {
          nova.x += (dx / dist) * stepPx;
          nova.y += (dy / dist) * stepPx;
        }
      } else if (t > nova.moodUntil && nova.mood !== 'idle') {
        // revert one-shot moods
        if (!nova.target) nova.mood = step && !rm ? 'point' : 'idle';
      }
      // point at the guide objective when idle
      let mood = nova.mood;
      let gx: number | undefined;
      let gy: number | undefined;
      if (step && !nova.target && mood === 'idle' && !rm) {
        mood = 'point';
        const L = LAYOUT[step.target];
        gx = L.x; gy = L.y;
      }
      novaObj.x = nova.x; novaObj.y = nova.y;
      drawNova(ctx, nova.x, nova.y, 30, { mood, gazeX: gx, gazeY: gy }, t, rm,
        lookFromAvatar(app.save.data.avatar), app.save.data.avatar.charm);
    },
    onTap: () => {
      fx.discover(nova.x, nova.y - 30);
      nova.mood = 'celebrate';
      nova.moodUntil = performance.now() + 900;
      openAvatarPicker(app);
    },
  };
  scene.addObject(novaObj);

  // ================= THREE EXPEDITIONS (diegetic portals, never a menu) =================
  // Each portal is a place you touch; after completion it KEEPS the reward
  // visible and stays replayable. Nova walks you there; the camera flies in.
  const goExp = (x: number, y: number, screen: ScreenName) => {
    if (traveling.busy) return;
    traveling.busy = true;
    nova.target = { x, y: y + 52 };
    nova.onArrive = () => {
      nova.mood = 'celebrate';
      nova.moodUntil = performance.now() + 650;
      fx.discover(x, y);
      scene.cam.focus(x - 100 / 1.9, y - 80 / 1.9, 1.9, 750, () => {
        app.audio.sfx('step');
        app.go(screen);
      });
    };
  };

  // ---- grove portal: mushroom ring by the west gate (blooms after completion)
  const groveDone = (d.grove?.completedAt ?? 0) > 0;
  const grovePortal: SceneObj = {
    id: 'portal-grove', x: 62, y: 588, r: 40, depth: 589,
    draw: (ctx, t) => {
      ctx.fillStyle = 'rgba(63,138,79,0.4)';
      ctx.beginPath(); ctx.ellipse(62, 592, 44, 14, 0, 0, Math.PI * 2); ctx.fill();
      // mushrooms
      const shrooms: [number, string][] = groveDone
        ? [[-26, '#ff8fb0'], [0, '#ffd76e'], [26, '#b3a8ff']]
        : [[-20, '#b9c4d6'], [18, '#a8b4c8']];
      for (const [dx, cap] of shrooms) {
        ctx.fillStyle = '#f3ead8';
        ctx.fillRect(62 + dx - 4, 576, 8, 14);
        ctx.fillStyle = cap;
        ctx.beginPath(); ctx.arc(62 + dx, 576, 11, Math.PI, 0); ctx.fill();
        ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(62 + dx - 4, 572, 2, 0, Math.PI * 2); ctx.fill();
      }
      if (groveDone && !rm) {
        // firefly friend kept its promise — it lives here now
        const fx2 = 62 + Math.sin(t / 700) * 30;
        const fy2 = 560 + Math.cos(t / 900) * 12;
        ctx.fillStyle = '#ffe98a';
        ctx.beginPath(); ctx.arc(fx2, fy2, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,230,150,0.35)';
        ctx.beginPath(); ctx.arc(fx2, fy2, 9, 0, Math.PI * 2); ctx.fill();
      } else if (!groveDone) {
        // shimmer of thirst: something here needs water
        ctx.fillStyle = `rgba(120,200,245,${rm ? 0.4 : 0.25 + 0.2 * Math.sin(t / 600)})`;
        ctx.beginPath(); ctx.ellipse(62, 592, 30, 7, 0, 0, Math.PI * 2); ctx.fill();
        spotlight(ctx, 62, 570, 34, t, rm);
      }
      labelPill(ctx, 62, 606, groveDone ? 'غابتي!' : 'الغابة!');
    },
    onTap: () => { fx.tap(); goExp(62, 588, 'grove'); },
  };
  scene.addObject(grovePortal);

  // ---- lighthouse portal: dark tower on the city hill (beams after completion)
  const lampDone = (d.lamplight?.completedAt ?? 0) > 0;
  const lampPortal: SceneObj = {
    id: 'portal-lamp', x: 628, y: 138, r: 38, depth: 139,
    draw: (ctx, t) => {
      ctx.fillStyle = lampDone ? '#8fa3c8' : '#3a4666';
      ctx.fillRect(628 - 13, 108, 26, 52);
      ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 2.5;
      ctx.strokeRect(628 - 13, 108, 26, 52);
      // lamp room
      ctx.fillStyle = lampDone ? '#ffd76e' : '#232a44';
      ctx.beginPath(); ctx.arc(628, 100, 11, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 2.5; ctx.stroke();
      if (lampDone) {
        // rotating beacon — the city stayed awake
        const a = rm ? 0.6 : t / 1200;
        const g = ctx.createLinearGradient(628, 100, 628 + Math.cos(a) * 90, 100 + Math.sin(a) * 30);
        g.addColorStop(0, 'rgba(255,220,150,0.55)');
        g.addColorStop(1, 'rgba(255,220,150,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(628, 100);
        ctx.lineTo(628 + Math.cos(a - 0.14) * 90, 100 + Math.sin(a - 0.14) * 30);
        ctx.lineTo(628 + Math.cos(a + 0.14) * 90, 100 + Math.sin(a + 0.14) * 30);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,215,130,0.5)';
        ctx.beginPath(); ctx.arc(628, 100, 20, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.font = '15px serif'; ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(180,200,240,0.8)';
        ctx.fillText('z', 644 + (rm ? 0 : Math.sin(t / 800) * 2), 92);
        spotlight(ctx, 628, 118, 32, t, rm);
      }
      labelPill(ctx, 628, 152, lampDone ? 'منارتي!' : 'المنارة!');
    },
    onTap: () => { fx.tap(); goExp(628, 138, 'lamplight'); },
  };
  scene.addObject(lampPortal);

  // ---- star-meadow portal: fallen spark by the launch pad (monument after)
  const starDone = (d.starmail?.completedAt ?? 0) > 0;
  const starPortal: SceneObj = {
    id: 'portal-star', x: 792, y: 108, r: 38, depth: 109,
    draw: (ctx, t) => {
      // crater
      ctx.fillStyle = 'rgba(20,26,60,0.35)';
      ctx.beginPath(); ctx.ellipse(792, 116, 34, 10, 0, 0, Math.PI * 2); ctx.fill();
      if (starDone) {
        // the monument: crystal star on stone, gently breathing
        const p = rm ? 1 : 1 + 0.06 * Math.sin(t / 600);
        ctx.save();
        ctx.translate(792, 92); ctx.scale(p, p); ctx.translate(-792, -92);
        ctx.fillStyle = '#8d99ae';
        ctx.fillRect(784, 100, 16, 14);
        ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 2; ctx.strokeRect(784, 100, 16, 14);
        ctx.fillStyle = '#fff8dc';
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const rr2 = i % 2 ? 6 : 14;
          const a = -Math.PI / 2 + (i * Math.PI) / 5;
          ctx.lineTo(792 + Math.cos(a) * rr2, 84 + Math.sin(a) * rr2);
        }
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 2; ctx.stroke();
        ctx.restore();
        ctx.fillStyle = 'rgba(255,240,200,0.4)';
        ctx.beginPath(); ctx.arc(792, 84, 22, 0, Math.PI * 2); ctx.fill();
      } else {
        // a fallen spark, pulsing for help — tap to go hear it
        const p = rm ? 0.7 : 0.4 + 0.35 * Math.sin(t / 450);
        ctx.fillStyle = `rgba(255,220,150,${p})`;
        ctx.beginPath(); ctx.arc(792, 96, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(255,220,150,${p * 0.4})`;
        ctx.beginPath(); ctx.arc(792, 96, 20, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(792, 96, 4, 0, Math.PI * 2); ctx.fill();
        spotlight(ctx, 792, 96, 28, t, rm);
      }
      labelPill(ctx, 792, 122, starDone ? 'نجمتي!' : 'النجمة!');
    },
    onTap: () => { fx.tap(); goExp(792, 108, 'starmail'); },
  };
  scene.addObject(starPortal);

  // ---- cinematic entry: start close on home, pull back to reveal the world
  scene.start();
  if (!rm) {
    const vw = scene.vw, vh = scene.vh;
    const fitZoom = Math.min(vw / 1000, vh / 620);
    scene.cam.zoom = fitZoom * 1.9;
    scene.cam.x = 500 - vw / scene.cam.zoom / 2;
    scene.cam.y = 470 - vh / scene.cam.zoom / 2;
    const fx0 = (1000 - vw / fitZoom) / 2;
    const fy0 = (620 - vh / fitZoom) / 2;
    scene.cam.focus(fx0, fy0, fitZoom, 1600);
  }

  // welcome: guide objective first, else the world greets you
  if (step) {
    say(step.line);
  } else {
    const text = d.quests.length === 0
      ? 'أهلاً بك في عالمك! المس أي مكان لتبدأ الاستكشاف!'
      : 'عالمك يكبر! شو حابب تلعب اليوم؟';
    bus.emit('nova:say', { text });
    app.voice.speak(d.quests.length === 0 ? 'أهلاً بك في عالمك! المس أي مكان لتبدأ!' : 'عالمك يكبر! شو حابب تلعب اليوم؟');
  }
}

function ownedExtra(d: { world: { buildings: string[] } }): number {
  return d.world.buildings.filter((b) => b !== 'home').length;
}

function nameOf(z: ZoneId): string {
  const m: Record<ZoneId, string> = {
    home: 'بيتي', lab: 'المختبر', body: 'جسمي', mind: 'العقل', make: 'الورشة',
    robot: 'الروبوت', explorer: 'بوابة العالم', space: 'الفضاء', impossible: 'المستحيل',
    stories: 'القصص', music: 'الموسيقى', values: 'نور', city: 'مدينتي',
    museum: 'متحفي', parents: '',
  };
  return m[z];
}

function drawBoat(ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
  const bobY = Math.sin(t / 800) * 3;
  ctx.fillStyle = '#8a5a30';
  ctx.beginPath();
  ctx.moveTo(x - 22, y + bobY);
  ctx.lineTo(x + 22, y + bobY);
  ctx.lineTo(x + 12, y + 12 + bobY);
  ctx.lineTo(x - 12, y + 12 + bobY);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.fillStyle = '#fff3dd';
  ctx.beginPath();
  ctx.moveTo(x, y + bobY);
  ctx.lineTo(x, y - 26 + bobY);
  ctx.lineTo(x + 16, y - 4 + bobY);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 2; ctx.stroke();
}

/** shared quest-progress helper: mark step done, complete quest with reward */
export function stepDone(app: App, questId: string, stepId: string): void {
  const q = QUESTS.find((x) => x.id === questId);
  if (!q) return;
  app.visitActivity(questId, stepId);
  const qp = app.save.data.quests.find((x) => x.questId === questId)!;
  if (!qp.done && qp.stepsDone.length >= q.steps.length) {
    app.save.update((d) => {
      d.quests.find((x) => x.questId === questId)!.done = true;
      d.world.coins += q.rewardCoins;
    });
    import('../ui/helpers').then(({ confetti }) => confetti());
    app.audio.sfx('win');
    bus.emit('toast', { text: `🏆 أنهيت مغامرة ${q.title}! +${q.rewardCoins} 🪙` });
    app.voice.speak(`رائع! أنهيت مغامرة ${q.title}!`);
  }
}

/** Wrap an activity run with quest linkage: call when its zone step is visited. */
export function questLink(app: App, questId: string, stepId: string): void {
  app.visitActivity(questId, stepId);
  const q = QUESTS.find((x) => x.id === questId)!;
  const qp = app.save.data.quests.find((x) => x.questId === questId)!;
  if (!qp.done && qp.stepsDone.length >= q.steps.length) stepDone(app, questId, stepId);
}
