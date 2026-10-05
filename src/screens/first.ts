/* Opening: a scene, not a slideshow. Dawn over the sea, the island wakes,
   Nova sleeps on the hill — wakes, looks at YOU, waves, discovers the lab
   glowing, toddles toward it — then the world is yours. Tap anytime to skip.
   No paragraphs, no menus, no reading. */

import type { App } from '../core/app';
import { drawHouse, drawLab, drawNova, type NovaMood } from '../engine/art';
import { WorldScene } from '../engine/scene';
import { el } from '../ui/helpers';

export function firstLaunch(app: App, root: HTMLElement): void {
  root.innerHTML = '';
  const host = document.createElement('div');
  host.className = 'screen';
  const canvas = document.createElement('canvas');
  canvas.className = 'world-canvas';
  canvas.style.height = 'min(78dvh, 620px)';
  canvas.setAttribute('aria-label', 'استيقاظ عالم نوفا');
  host.append(canvas);
  const skip = el('button', 'orb skip-orb', '⏭️') as HTMLButtonElement;
  skip.setAttribute('aria-label', 'تخطي');
  host.append(skip);
  root.append(host);

  const scene = new WorldScene(canvas, { worldW: 1000, worldH: 620, reduceMotion: false });
  const rm = false;
  const t0 = performance.now();
  let done = false;
  let spoken = '';

  const finish = () => {
    if (done) return;
    done = true;
    try { scene.destroy(); } catch { /* noop */ }
    app.save.update((d) => { d.childName = 'صديق نوفا'; });
    app.save.saveNow();
    app.analytics.track('session:start', {});
    app.go('world');
  };
  skip.onclick = () => { app.audio.unlock(); app.audio.sfx('tap'); finish(); };
  canvas.onpointerdown = () => { app.audio.unlock(); };

  // Nova's little journey
  const nova = { x: 500, y: 300, mood: 'sleep' as NovaMood, walkFrom: 0, walkTo: 0, walking: false };

  const say = (key: string, text: string) => {
    if (spoken.includes(key)) return;
    spoken += key;
    app.audio.unlock();
    app.voice.speak(text, 'ar', true);
  };

  // dawn sky + sea + island silhouette
  scene.addLayer({
    parallax: 0.05,
    paint: (ctx, t) => {
      const dawn = Math.min(1, (t - t0) / 6000);
      const top = `rgb(${95 + dawn * 30 | 0},${143 + dawn * 40 | 0},${242 - dawn * 20 | 0})`;
      const g = ctx.createLinearGradient(0, -100, 0, 620);
      g.addColorStop(0, top);
      g.addColorStop(0.55, '#ffd9a8');
      g.addColorStop(0.75, '#63b8ec');
      g.addColorStop(1, '#2f7fc9');
      ctx.fillStyle = g;
      ctx.fillRect(-200, -120, 1400, 780);
      // rising sun
      const sy = 240 - dawn * 130;
      ctx.fillStyle = 'rgba(255,214,110,0.35)';
      ctx.beginPath(); ctx.arc(500, sy, 70, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd76e';
      ctx.beginPath(); ctx.arc(500, sy, 44, 0, Math.PI * 2); ctx.fill();
      // stars fading out
      if (dawn < 0.7) {
        ctx.fillStyle = `rgba(255,255,255,${0.8 * (1 - dawn)})`;
        for (let i = 0; i < 24; i++) {
          const sx = (i * 173) % 1000;
          const syy = (i * 97) % 220;
          ctx.fillRect(sx, syy - 60, 2.5, 2.5);
        }
      }
    },
  });

  scene.addLayer({
    parallax: 1,
    paint: (ctx, t) => {
      const el2 = (t - t0) / 1000;
      // island rises from the sea
      const rise = Math.max(0, Math.min(1, el2 / 2.5));
      const iy = 470 + (1 - rise) * 120;
      ctx.globalAlpha = 0.3 + 0.7 * rise;
      ctx.fillStyle = '#f2dfa8';
      ctx.beginPath(); ctx.ellipse(500, iy + 6, 400, 130, 0, 0, Math.PI * 2); ctx.fill();
      const g = ctx.createLinearGradient(0, iy - 130, 0, iy + 130);
      g.addColorStop(0, '#9bdc9b');
      g.addColorStop(1, '#6fb877');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(500, iy, 380, 118, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      if (rise < 1) return;
      // home + lab appear with a pop
      const pop = (delay: number) => {
        const k = Math.max(0, Math.min(1, (el2 - delay) / 0.6));
        return k < 1 ? 0.3 + 0.7 * k : 1;
      };
      const s1 = pop(2.6), s2 = pop(3.1);
      ctx.save(); ctx.translate(430, iy - 20); ctx.scale(s1, s1); ctx.translate(-430, -(iy - 20));
      drawHouse(ctx, 430, iy - 20, 100, t, rm, 0);
      ctx.restore();
      ctx.save(); ctx.translate(620, iy - 30); ctx.scale(s2, s2); ctx.translate(-620, -(iy - 30));
      drawLab(ctx, 620, iy - 30, 92, t, rm);
      ctx.restore();
      // Nova timeline
      if (el2 < 3.4) {
        nova.mood = 'sleep';
        nova.x = 500; nova.y = iy - 130;
      } else if (el2 < 5) {
        nova.mood = 'react';
        say('wake', 'صباح الخير! ... أهلاً!');
        nova.x = 500; nova.y = iy - 130;
      } else if (el2 < 7.5) {
        nova.mood = 'celebrate';
        say('hi', 'أنا نوفا! هذا عالمك!');
      } else if (el2 < 11) {
        nova.mood = 'discover';
        say('lab', 'شوف! المختبر! تعال نجرب!');
        // toddle toward the lab
        const k = Math.min(1, (el2 - 7.5) / 3);
        nova.mood = 'walk';
        nova.x = 500 + (610 - 500) * k;
        nova.y = iy - 130 + 40 * k;
      } else {
        say('go', 'المس أي مكان! العالم لك!');
        finish();
      }
    },
  });

  // Nova character layer
  scene.addLayer({
    parallax: 1,
    paint: (ctx, t) => {
      const el2 = (t - t0) / 1000;
      if (el2 < 2.2) return;
      const appear = Math.min(1, (el2 - 2.2) / 0.8);
      ctx.globalAlpha = appear;
      const gaze = nova.mood === 'discover' || nova.mood === 'walk' ? { x: 620, y: 340 } : { x: 500, y: 620 };
      drawNova(ctx, nova.x, nova.y, 30, { mood: nova.mood, gazeX: gaze.x, gazeY: gaze.y }, t, rm);
      ctx.globalAlpha = 1;
    },
  });

  scene.start();
  // slow cinematic push-in, then hold
  const vw = scene.vw, vh = scene.vh;
  const fitZoom = Math.min(vw / 1000, vh / 620);
  scene.cam.zoom = fitZoom * 0.75;
  scene.cam.x = (1000 - vw / scene.cam.zoom) / 2;
  scene.cam.y = (620 - vh / scene.cam.zoom) / 2 + 60;
  const fx = (1000 - vw / fitZoom) / 2;
  const fy = (620 - vh / fitZoom) / 2;
  scene.cam.focus(fx, fy, fitZoom, 5200);

  // safety: never trap the child — any tap skips to the world
  canvas.addEventListener('pointerup', () => finish());
}
