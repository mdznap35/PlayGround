/* Music 🎵: rhythm + melody + tempo, visual step sequencer.
   Melody can be saved → used in films (museum artifact). */

import type { App } from '../core/app';
import { bigButton, el, title, topbar } from '../ui/helpers';
import { mountScreen } from './shell';

const NOTES = [
  { n: 'دو', f: 262, c: '#ff7a7a' },
  { n: 'ري', f: 294, c: '#ffc94d' },
  { n: 'مي', f: 330, c: '#5fd68a' },
  { n: 'فا', f: 349, c: '#7fd4ff' },
  { n: 'صول', f: 392, c: '#b3a8ff' },
];
const STEPS = 8;

export function music(app: App, root: HTMLElement): void {
  const s = mountScreen(root);
  s.append(topbar({ onHome: () => app.go('world'), coins: app.save.data.world.coins }));
  s.append(title('🎵 الموسيقى', 'المس المربعات لتلحين أغنيتك!'));
  app.voice.speak('المس المربعات الملونة! بعدين اضغط تشغيل واسمع لحنك!');

  const grid: boolean[][] = NOTES.map(() => Array(STEPS).fill(false));
  // starter melody so first play sounds good
  grid[0][0] = grid[2][2] = grid[4][4] = grid[3][6] = true;
  const board = el('div');
  board.style.cssText = 'display:grid;grid-template-columns:52px repeat(8,1fr);gap:6px;width:100%;align-items:center;';
  s.append(board);

  const render = (playing = -1) => {
    board.innerHTML = '';
    NOTES.forEach((note, r) => {
      const lbl = el('div', 'tag', note.n);
      board.append(lbl);
      for (let st = 0; st < STEPS; st++) {
        const cell = el('button', '', '') as HTMLButtonElement;
        cell.style.cssText = `min-height:52px;border-radius:14px;border:2px solid rgba(255,255,255,0.3);background:${grid[r][st] ? note.c : 'rgba(255,255,255,0.1)'};${st === playing ? 'outline:3px solid #fff;' : ''}cursor:pointer;`;
        cell.setAttribute('aria-label', `${note.n} خطوة ${st + 1}`);
        cell.onclick = () => { grid[r][st] = !grid[r][st]; app.audio.sfx('pop'); playNote(note.f, 0.3); render(); };
        board.append(cell);
      }
    });
  };
  render();

  const playNote = (freq: number, dur = 0.4) => {
    try {
      const AC = window.AudioContext;
      const ctx = new AC();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = instrument;
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.2, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      o.connect(g).connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + dur);
      window.setTimeout(() => void ctx.close(), 600);
    } catch { /* ignore */ }
  };

  let instrument: OscillatorType = 'sine';
  const instRow = el('div', 'toolbar');
  for (const [name, type, emoji] of [['بيانو', 'sine', '🎹'], ['ناي', 'triangle', '🪈'], ['غيتار', 'square', '🎸']] as [string, OscillatorType, string][]) {
    const b = el('button', 'tag', `${emoji} ${name}`) as HTMLButtonElement;
    b.style.cursor = 'pointer'; b.style.fontSize = '18px'; b.style.padding = '12px 20px';
    b.onclick = () => { instrument = type; app.audio.sfx('tap'); };
    instRow.append(b);
  }
  s.append(instRow);

  let tempo = 420;
  const tempoWrap = el('div');
  tempoWrap.style.width = '100%';
  tempoWrap.append(el('p', 'lead', '🥁 السرعة'));
  const tempoR = document.createElement('input');
  tempoR.type = 'range'; tempoR.min = '220'; tempoR.max = '700'; tempoR.value = '420';
  tempoR.oninput = () => { tempo = +tempoR.value; };
  tempoWrap.append(tempoR);
  s.append(tempoWrap);

  let timer: number | null = null;
  const stop = () => { if (timer !== null) { window.clearInterval(timer); timer = null; render(); playBtn.innerHTML = '▶️ تشغيل لحني!'; } };
  const playBtn = bigButton('▶️ تشغيل لحني!', '', () => {
    if (timer !== null) { stop(); return; }
    playBtn.innerHTML = '⏹️ إيقاف';
    let st = 0;
    timer = window.setInterval(() => {
      render(st);
      for (let r = 0; r < NOTES.length; r++) {
        if (grid[r][st]) playNote(NOTES[r].f);
      }
      st = (st + 1) % STEPS;
    }, tempo);
  });
  const bar = el('div', 'toolbar');
  bar.append(playBtn);
  bar.append(bigButton('💾 احفظ لحني', 'violet', () => {
    stop();
    const melody = grid.map((row) => row.map((x) => (x ? 1 : 0)).join('')).join('|');
    app.save.update((d) => {
      d.museum.push({ id: `m-${Date.now()}`, kind: 'melody', title: 'لحني الأول', emoji: '🎵', description: `آلة: ${instrument} — ${melody}`, createdAt: Date.now() });
    });
    app.save.saveNow();
    app.audio.sfx('win');
    app.ctx().report({ activityId: 'melody', skillIds: ['sound', 'composition', 'repetition'], success: true, durationMs: 60000, tries: 1, hintsUsed: 0 });
    app.ctx().earnCoins(6, 'ملحن صغير!');
    app.ctx().say('لحنك محفوظ في المتحف! يمكنك استخدامه في فيلمك!');
    app.ctx().spotlight('music');
  }));
  s.append(bar);
}
