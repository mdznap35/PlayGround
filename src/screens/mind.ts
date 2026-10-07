/* Mind 🧠: pure play — memory, patterns, sorting, odd-one. Skills stay hidden. */

/* Mind: a cozy room you enter. Memory table, pattern beads, sorting bins,
   odd-one corner. Touch the stations. Sorting is real drag-and-drop. */

import type { App } from '../core/app';
import { decide } from '../core/adaptive';
import { bus } from '../core/events';
import { drawNova, lookFromAvatar } from '../engine/art';
import { Feedback, breathe } from '../engine/feedback';
import { WorldScene } from '../engine/scene';
import { bigButton, choice, choiceRow, el, title } from '../ui/helpers';
import { mountScreen } from './shell';
import { roomChrome } from './lab';

export function mind(app: App, root: HTMLElement, param?: string): void {
  if (param === 'memory' || param === 'pattern' || param === 'sort' || param === 'odd') {
    const s = mountScreen(root);
    s.append(roomChrome(app, () => app.go('mind')));
    if (param === 'memory') return memory(app, s);
    if (param === 'pattern') return pattern(app, s);
    if (param === 'sort') return sort(app, s);
    return odd(app, s);
  }
  return mindRoom(app, root);
}

function mindRoom(app: App, root: HTMLElement): void {
  const s = mountScreen(root);
  s.append(roomChrome(app, () => app.go('world')));
  const canvas = document.createElement('canvas');
  canvas.className = 'world-canvas scene-canvas';
  canvas.setAttribute('aria-label', 'غرفة التفكير');
  s.append(canvas);

  const say = (text: string) => {
    bus.emit('nova:say', { text });
    app.voice.speak(text);
  };

  const scene = new WorldScene(canvas, { worldW: 1000, worldH: 620, reduceMotion: app.save.data.settings.reduceMotion });
  const fx = new Feedback(scene.particles, app.audio);
  const rm = scene.reduceMotion;

  scene.addLayer({
    parallax: 1,
    paint: (ctx, t) => {
      // wooden library
      const g = ctx.createLinearGradient(0, 0, 0, 620);
      g.addColorStop(0, '#caa06a');
      g.addColorStop(0.62, '#b98a52');
      g.addColorStop(0.63, '#8a5a30');
      g.addColorStop(1, '#6e4525');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 1000, 620);
      // bookshelves
      for (const sx of [40, 700]) {
        ctx.fillStyle = '#7a4f28';
        ctx.fillRect(sx, 70, 220, 220);
        ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 4;
        ctx.strokeRect(sx, 70, 220, 220);
        const cols = ['#e26d5a', '#5db9f5', '#5fae6b', '#ffc94d', '#b3a8ff', '#ff8fb0'];
        for (let shelf = 0; shelf < 3; shelf++) {
          for (let b = 0; b < 8; b++) {
            ctx.fillStyle = cols[(b + shelf * 3) % cols.length];
            const bh = 40 + ((b * 13 + shelf * 7) % 22);
            ctx.fillRect(sx + 12 + b * 25, 130 + shelf * 62 - bh + 22, 20, bh);
          }
          ctx.fillStyle = '#5e3c1e';
          ctx.fillRect(sx + 4, 150 + shelf * 62, 212, 8);
        }
      }
      // round rug
      ctx.fillStyle = '#e8b4b8';
      ctx.beginPath(); ctx.ellipse(500, 480, 260, 80, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 3; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(500, 480, 210, 62, 0, 0, Math.PI * 2); ctx.stroke();
      // memory table with fanned cards
      ctx.fillStyle = '#8a5a30';
      ctx.beginPath(); ctx.ellipse(300, 430, 130, 34, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 4; ctx.stroke();
      ctx.fillStyle = '#6e4525';
      ctx.fillRect(280, 440, 14, 90); ctx.fillRect(306, 440, 14, 90);
      for (let i = 0; i < 4; i++) {
        const cx = 240 + i * 40;
        const cy = 400 + (rm ? 0 : Math.sin(t / 800 + i) * 2);
        ctx.fillStyle = i % 2 ? '#b3a8ff' : '#ffd9a8';
        ctx.save();
        ctx.translate(cx, cy); ctx.rotate(-0.15 + i * 0.1);
        ctx.fillRect(-16, -22, 32, 44);
        ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 3;
        ctx.strokeRect(-16, -22, 32, 44);
        ctx.fillStyle = '#2a2350';
        ctx.font = '20px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('؟', 0, 2);
        ctx.restore();
      }
      // pattern bead string across the top
      ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(330, 120); ctx.quadraticCurveTo(500, 160, 670, 120); ctx.stroke();
      const beads = ['🔴', '🔵', '🔴', '🔵', '❔'];
      ctx.font = '34px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      beads.forEach((bb, i) => {
        const bx = 360 + i * 72;
        const by = 128 + Math.sin((bx - 330) / 340 * Math.PI) * 22 + (rm ? 0 : Math.sin(t / 700 + i) * 2);
        ctx.fillText(bb, bx, by);
      });
      // sorting bins (three open boxes)
      const bins: [number, string][] = [[400, '#ffd9a8'], [500, '#c9e7ff'], [600, '#d6f2d6']];
      for (const [bx, col] of bins) {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(bx - 42, 520); ctx.lineTo(bx + 42, 520);
        ctx.lineTo(bx + 32, 580); ctx.lineTo(bx - 32, 580);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 3.5; ctx.stroke();
      }
      ctx.font = '34px serif'; ctx.textAlign = 'center';
      ctx.fillText('🍽️', 400, 552);
      ctx.fillText('🧸', 500, 552);
      ctx.fillText('📚', 600, 552);
      // odd-one cushion corner: four blobs, one different
      ctx.fillStyle = '#d9c8ff';
      ctx.beginPath(); ctx.ellipse(830, 480, 110, 46, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 3; ctx.stroke();
      const blobs: [number, string][] = [[780, '🟣'], [810, '🟣'], [840, '🟡'], [870, '🟣']];
      ctx.font = '30px serif';
      blobs.forEach(([bx, bb], i) => {
        ctx.fillText(bb, bx, 470 + (rm ? 0 : Math.sin(t / 600 + i * 1.5) * 4));
      });
    },
  });

  const station = (id: string, x: number, y: number, r: number, go: () => void) => {
    const o = {
      id, x, y, r, depth: y,
      draw: (ctx: CanvasRenderingContext2D, t: number) => {
        const p = breathe(t, x);
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(x, y, r * p, 0, Math.PI * 2); ctx.stroke();
      },
      onTap: () => { fx.tap(); go(); },
    };
    scene.addObject(o);
  };
  station('st-memory', 300, 410, 95, () => app.go('mind', 'memory'));
  station('st-pattern', 500, 140, 120, () => app.go('mind', 'pattern'));
  station('st-sort', 500, 548, 120, () => app.go('mind', 'sort'));
  station('st-odd', 830, 475, 95, () => app.go('mind', 'odd'));

  scene.addObject({
    id: 'nova', x: 120, y: 500, r: 44, depth: 900,
    draw: (ctx, t) => drawNova(ctx, 120, 500, 30, { mood: 'idle' }, t, rm,
      lookFromAvatar(app.save.data.avatar), app.save.data.avatar.charm),
    onTap: () => {
      fx.discover(120, 470);
      say('غرفة التفكير! المس أي لعبة!');
    },
  });

  scene.start();
  say('غرفة التفكير! المس البطاقات أو الخرز أو الصناديق!');
}

function memory(app: App, s: HTMLElement): void {
  const dec = decide(app.save.data.attempts, 'memory-pairs');
  const pairs = dec.difficulty === 0 ? 3 : dec.difficulty === 1 ? 4 : 6;
  const pool = ['🐱', '🐶', '🦁', '🐸', '🐵', '🐝', '🦋', '🐢'];
  const deck = [...pool].sort(() => Math.random() - 0.5).slice(0, pairs);
  const cards = [...deck, ...deck].sort(() => Math.random() - 0.5);
  s.append(title('🃏 لعبة الذاكرة', 'افتح بطاقتين متشابهتين!'));
  app.voice.speak('افتح البطاقات وتذكّر أماكنها!');
  const row = choiceRow();
  s.append(row);
  let first: HTMLButtonElement | null = null;
  let firstVal = '';
  let matched = 0; let tries = 0; let hints = 0; const t0 = Date.now();
  const btns: HTMLButtonElement[] = [];
  for (const v of cards) {
    const b = choice('❓', '', () => {
      if ((b as HTMLButtonElement).disabled || b.textContent?.includes(v)) return;
      tries++;
      b.innerHTML = `${v}<small></small>`;
      app.audio.sfx('tap');
      if (!first) { first = b; firstVal = v; return; }
      if (v === firstVal && b !== first) {
        b.classList.add('good'); first.classList.add('good');
        (b as HTMLButtonElement).disabled = true; first.disabled = true;
        app.audio.sfx('good');
        matched++;
        first = null;
        if (matched === pairs) {
          app.ctx().report({ activityId: 'memory-pairs', skillIds: ['memory', 'observation'], success: true, durationMs: Date.now() - t0, tries, hintsUsed: hints });
          app.ctx().earnCoins(6, 'ذاكرة قوية!');
          app.ctx().say('ذاكرتك قوية! لقيت كل الثنائيات!');
          import('../ui/helpers').then(({ confetti }) => confetti());
          s.append(bigButton('🔁 العب مجدداً', 'violet', () => app.go('mind', 'memory')));
        }
      } else {
        const f = first; first = null;
        app.audio.sfx('bad');
        window.setTimeout(() => {
          b.innerHTML = '❓<small></small>';
          f.innerHTML = '❓<small></small>';
        }, 800);
      }
    });
    btns.push(b);
    row.append(b);
  }
  s.append(bigButton('💡 تلميح', 'ghost', () => {
    hints++;
    app.ctx().hint(hints, 'انظر جيداً قبل أن تفتح… تذكّر أماكن الحيوانات!');
  }));
}

function pattern(app: App, s: HTMLElement): void {
  const dec = decide(app.save.data.attempts, 'patterns');
  // build pattern: ABAB or AAB or ABC by difficulty
  const seq = dec.difficulty === 0 ? ['🔴', '🔵', '🔴', '🔵', '?'] : dec.difficulty === 1 ? ['⭐', '⭐', '🔵', '⭐', '⭐', '?'] : ['🔴', '⭐', '🔵', '🔴', '⭐', '?'];
  const answer = dec.difficulty === 0 ? '🔴' : dec.difficulty === 1 ? '🔵' : '🔵';
  s.append(title('🔷 أكمل النمط', 'شو اللي ناقص؟'));
  app.voice.speak('شوف الترتيب… شو اللي ناقص؟');
  const row = el('div', 'toolbar');
  row.style.fontSize = '48px';
  for (const x of seq) {
    const chip = el('div', 'choice', x === '?' ? '❔' : x);
    (chip as HTMLElement).style.cursor = 'default';
    row.append(chip);
  }
  s.append(row);
  const opts = choiceRow();
  s.append(opts);
  let tries = 0; let hints = 0; const t0 = Date.now();
  for (const o of [...new Set(seq.filter((x) => x !== '?'))].sort()) {
    const b = choice(o, '', () => {
      tries++;
      if (o === answer) {
        b.classList.add('good'); app.audio.sfx('good');
        app.ctx().report({ activityId: 'patterns', skillIds: ['patterns', 'sequencing', 'logic'], success: true, durationMs: Date.now() - t0, tries, hintsUsed: hints, errorKind: tries > 1 ? 'pattern' : undefined });
        app.ctx().earnCoins(5, 'نمط صحيح!');
        app.ctx().say('صح! اكتشفت القاعدة!');
        import('../ui/helpers').then(({ confetti }) => confetti());
        s.append(bigButton('🔁 نمط جديد', 'violet', () => app.go('mind', 'pattern')));
      } else {
        b.classList.add('bad'); app.audio.sfx('bad');
        app.voice.speak('همم… شوف أول اثنين… بعدين اللي بعدهم!');
        window.setTimeout(() => b.classList.remove('bad'), 700);
      }
    });
    opts.append(b);
  }
  s.append(bigButton('💡 تلميح', 'ghost', () => {
    hints++;
    (row.children[0] as HTMLElement).style.borderColor = 'var(--sun)';
    (row.children[1] as HTMLElement).style.borderColor = 'var(--sun)';
    app.ctx().hint(hints, 'هذان الاثنان يتكرران! شو بيجي بعدهما؟');
  }));
}

const SORT_ITEMS = [
  { e: '🍎', box: 'kitchen' }, { e: '🥛', box: 'kitchen' }, { e: '🧸', box: 'toys' },
  { e: '⚽', box: 'toys' }, { e: '📕', box: 'books' }, { e: '📗', box: 'books' },
];
const BOXES = [{ id: 'kitchen', e: '🍽️', n: 'المطبخ' }, { id: 'toys', e: '🧸', n: 'الألعاب' }, { id: 'books', e: '📚', n: 'الكتب' }];

function sort(app: App, s: HTMLElement): void {
  // DRAG the thing into its home. Bins glow when the right thing hovers.
  // No reading: the bin shows its family, the thing belongs or it bounces back.
  s.append(title('🧺 رتّب وصنّف', 'اسحب كل شيء إلى بيته!'));
  app.voice.speak('اسحب كل شيء إلى بيته! الصناديق تلمع عندما تقترب من بيتها!');
  const floor = el('div', 'choice-row');
  floor.style.minHeight = '120px';
  s.append(floor);
  const boxRow = el('div', 'choice-row');
  s.append(boxRow);
  let placed = 0; let tries = 0; let hints = 0; const t0 = Date.now();
  const items = [...SORT_ITEMS].sort(() => Math.random() - 0.5);

  interface Box { id: string; el: HTMLButtonElement; rect(): DOMRect | null }
  const boxes: Box[] = [];
  for (const box of BOXES) {
    const b = el('button', 'choice', `${box.e}<small></small>`) as HTMLButtonElement;
    b.style.minWidth = '150px'; b.style.minHeight = '150px'; b.style.fontSize = '64px';
    b.style.touchAction = 'none';
    b.onclick = () => { app.voice.speak('اسحب الأشياء إلى هنا!'); };
    boxRow.append(b);
    boxes.push({ id: box.id, el: b, rect: () => { try { return b.getBoundingClientRect(); } catch { return null; } } });
  }

  const finishCheck = () => {
    if (placed >= items.length) {
      app.ctx().report({ activityId: 'sorting', skillIds: ['classification', 'comparison', 'instructions'], success: true, durationMs: Date.now() - t0, tries, hintsUsed: hints });
      app.ctx().earnCoins(6, 'ترتيب رائع!');
      app.ctx().say('الغرفة مرتبة! كل شي بمكانه!');
      import('../ui/helpers').then(({ confetti }) => confetti());
    }
  };

  for (const it of items) {
    const b = el('button', 'choice', `${it.e}<small></small>`) as HTMLButtonElement;
    b.style.fontSize = '56px';
    b.style.touchAction = 'none';
    b.style.transition = 'transform 0.18s ease';
    b.style.zIndex = '5';
    floor.append(b);
    let sx = 0, sy = 0;
    let dragging = false;
    const glow = (id: string | null) => {
      for (const bx of boxes) {
        (bx.el as HTMLElement).style.borderColor = bx.id === id ? 'var(--sun)' : '';
        (bx.el as HTMLElement).style.transform = bx.id === id ? 'scale(1.08)' : '';
      }
    };
    const under = (x: number, y: number): Box | null => {
      for (const bx of boxes) {
        const r = bx.rect();
        if (r && x >= r.left - 10 && x <= r.right + 10 && y >= r.top - 10 && y <= r.bottom + 10) return bx;
      }
      return null;
    };
    b.onpointerdown = (e) => {
      if ((b as HTMLButtonElement).disabled) return;
      dragging = true;
      sx = e.clientX; sy = e.clientY;
      try { b.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
      b.style.zIndex = '20';
      app.audio.sfx('tap');
    };
    b.onpointermove = (e) => {
      if (!dragging) return;
      b.style.transform = `translate(${e.clientX - sx}px, ${e.clientY - sy}px) scale(1.15)`;
      const hov = under(e.clientX, e.clientY);
      glow(hov ? hov.id : null);
    };
    b.onpointerup = (e) => {
      if (!dragging) return;
      dragging = false;
      glow(null);
      const target = under(e.clientX, e.clientY);
      b.style.transform = '';
      b.style.zIndex = '5';
      if (!target) return; // dropped nowhere: stays
      tries++;
      if (target.id === it.box) {
        (b as HTMLButtonElement).disabled = true;
        b.style.opacity = '0.35';
        b.style.transform = 'scale(0.6)';
        target.el.append(el('span', '', it.e));
        app.audio.sfx('good');
        placed++;
        app.voice.speak('في بيته!');
        finishCheck();
      } else {
        // wrong home: bounce back with a wobble, never a "wrong" screen
        app.audio.sfx('bad');
        app.voice.speak('همم… ليس هنا. جرّب بيتاً آخر!');
        b.style.transform = 'translateX(-10px)';
        window.setTimeout(() => { b.style.transform = 'translateX(10px)'; }, 120);
        window.setTimeout(() => { b.style.transform = ''; }, 260);
      }
    };
  }
  s.append(bigButton('💡', 'ghost', () => {
    hints++;
    app.ctx().hint(hints, 'الأكل للمطبخ… واللعب مع بعض… والكتب مع بعض!');
  }));
}

function odd(app: App, s: HTMLElement): void {
  const sets = [
    { items: ['🍎', '🍎', '🍌', '🍎'], odd: 2 }, { items: ['🐱', '🐶', '🐱', '🐱'], odd: 1 },
    { items: ['🔴', '🔵', '🔴', '🔴'], odd: 1 }, { items: ['⭐', '⭐', '⭐', '🌙'], odd: 3 },
  ];
  const set = sets[(Math.random() * sets.length) | 0];
  s.append(title('🔍 الشي المختلف', 'شي واحد مختلف! لاقيه!'));
  app.voice.speak('شي واحد مختلف عن البقية! لاقيه بسرعة!');
  const row = choiceRow();
  s.append(row);
  let tries = 0; const t0 = Date.now();
  set.items.forEach((e, i) => {
    const b = choice(e, '', () => {
      tries++;
      if (i === set.odd) {
        b.classList.add('good'); app.audio.sfx('win');
        app.ctx().report({ activityId: 'odd-one', skillIds: ['observation', 'classification', 'flexibility'], success: true, durationMs: Date.now() - t0, tries, hintsUsed: 0, errorKind: tries > 1 ? 'rushing' : undefined });
        app.ctx().earnCoins(4, 'عين صقر!');
        app.ctx().say('لقيته! عيناك قويتان!');
        import('../ui/helpers').then(({ confetti }) => confetti());
        s.append(bigButton('🔁 مرة أخرى', 'violet', () => app.go('mind', 'odd')));
      } else {
        b.classList.add('bad'); app.audio.sfx('bad');
        window.setTimeout(() => b.classList.remove('bad'), 600);
      }
    });
    row.append(b);
  });
}
