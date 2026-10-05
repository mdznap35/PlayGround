/* Robot 🤖: visual programming. Move / Turn / Repeat / If — plus debugging.
   Real execution on a grid, step-by-step, with failure as part of play. */

import type { App } from '../core/app';
import { decide } from '../core/adaptive';
import { bigButton, el, title, topbar } from '../ui/helpers';
import { mountScreen } from './shell';

type Cmd = 'F' | 'L' | 'R';
const CMD_EMOJI: Record<Cmd, string> = { F: '⬆️', L: '↩️', R: '↪️' };

interface Level { size: number; start: [number, number]; dir: number; goal: [number, number]; walls: [number, number][]; stars: [number, number][]; }

const LEVELS: Level[] = [
  { size: 4, start: [0, 3], dir: 0, goal: [3, 0], walls: [], stars: [[2, 2]] },
  { size: 5, start: [0, 4], dir: 0, goal: [4, 0], walls: [[2, 2], [2, 3]], stars: [[1, 1], [3, 3]] },
  { size: 6, start: [0, 5], dir: 0, goal: [5, 0], walls: [[2, 2], [2, 3], [3, 3], [4, 2]], stars: [[1, 4], [4, 4], [3, 1]] },
];

export function robot(app: App, root: HTMLElement): void {
  const dec = decide(app.save.data.attempts, 'robot-fix');
  const level = LEVELS[Math.min(dec.difficulty, 2)];
  const s = mountScreen(root);
  s.append(topbar({ onHome: () => app.go('world'), coins: app.save.data.world.coins }));
  s.append(title('🤖 إصلاح الروبوت', 'أعطِ الأوامر بالصور ووصّله للبطارية 🔋!'));
  app.voice.speak('الروبوت ضايع! رتّب الأوامر ووصّله للبطارية!');

  const gridEl = el('div');
  gridEl.style.cssText = `display:grid;grid-template-columns:repeat(${level.size},64px);gap:6px;justify-content:center;`;
  s.append(gridEl);

  let prog: Cmd[] = [];
  const progEl = el('div', 'toolbar');
  progEl.style.minHeight = '60px';
  s.append(progEl);

  const renderProg = () => {
    progEl.innerHTML = '';
    if (!prog.length) progEl.append(el('span', 'tag', 'لا أوامر بعد — المس الأزرار!'));
    prog.forEach((c, i) => {
      const chip = el('button', 'tag', `${CMD_EMOJI[c]}`) as HTMLButtonElement;
      chip.style.fontSize = '26px';
      chip.onclick = () => { prog.splice(i, 1); app.audio.sfx('tap'); renderProg(); };
      progEl.append(chip);
    });
  };
  renderProg();

  const draw = (rx: number, ry: number, dir: number, trail: [number, number][], bump: [number, number] | null) => {
    gridEl.innerHTML = '';
    for (let y = 0; y < level.size; y++) {
      for (let x = 0; x < level.size; x++) {
        const cell = el('div');
        cell.style.cssText = 'width:64px;height:64px;border-radius:16px;background:rgba(255,255,255,0.12);display:flex;align-items:center;justify-content:center;font-size:34px;border:2px solid rgba(255,255,255,0.15);';
        const isWall = level.walls.some(([wx, wy]) => wx === x && wy === y);
        const isStar = level.stars.some(([sx, sy]) => sx === x && sy === y);
        if (isWall) cell.textContent = '🪨';
        else if (x === level.goal[0] && y === level.goal[1]) cell.textContent = '🔋';
        else if (isStar) cell.textContent = '⭐';
        else if (trail.some(([tx, ty]) => tx === x && ty === y)) cell.textContent = '·';
        if (x === rx && y === ry) {
          cell.textContent = ['🤖⬆️', '🤖➡️', '🤖⬇️', '🤖⬅️'][dir];
          cell.style.borderColor = 'var(--sun)';
          if (bump) { cell.style.borderColor = 'var(--coral)'; cell.style.background = 'rgba(255,122,122,0.3)'; }
        }
        gridEl.append(cell);
      }
    }
  };
  draw(level.start[0], level.start[1], level.dir, [], null);

  const pad = el('div', 'toolbar');
  for (const c of ['F', 'L', 'R'] as Cmd[]) {
    const b = el('button', 'choice', `${CMD_EMOJI[c]}<small>${c === 'F' ? 'امشِ' : c === 'L' ? 'يسار' : 'يمين'}</small>`) as HTMLButtonElement;
    b.onclick = () => { if (prog.length < 20) { prog.push(c); app.audio.sfx('tap'); renderProg(); } };
    pad.append(b);
  }
  s.append(pad);

  const bar = el('div', 'toolbar');
  const t0 = Date.now(); let tries = 0; let hints = 0;
  const runBtn = bigButton('▶️ نفّذ!', '', () => {
    tries++;
    runBtn.setAttribute('disabled', 'true');
    let [rx, ry] = level.start;
    let dir = level.dir;
    const trail: [number, number][] = [[rx, ry]];
    let step = 0; let starsGot = 0;
    const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    const iv = window.setInterval(() => {
      if (step >= prog.length) {
        window.clearInterval(iv);
        runBtn.removeAttribute('disabled');
        const won = rx === level.goal[0] && ry === level.goal[1];
        if (won) {
          app.audio.sfx('win');
          app.ctx().report({ activityId: 'robot-fix', skillIds: ['sequence', 'planning', 'debugging', 'directions'], success: true, durationMs: Date.now() - t0, tries, hintsUsed: hints });
          app.ctx().earnCoins(10, 'الروبوت وصل!');
          app.ctx().say(`وصل! وجمع ${starsGot} نجوم! ${tries > 1 ? 'أصلحت الأوامر بنفسك — هذا اسمه debugging!' : ''}`);
          import('../ui/helpers').then(({ confetti }) => confetti());
          app.ctx().spotlight('build');
        } else {
          app.audio.sfx('bad');
          app.voice.speak('ما وصل… شوف وين وقف وغيّر الأوامر! الأخطاء جزء من اللعبة!');
        }
        return;
      }
      const c = prog[step++];
      if (c === 'L') dir = (dir + 3) % 4;
      else if (c === 'R') dir = (dir + 1) % 4;
      else {
        const nx = rx + DIRS[dir][0], ny = ry + DIRS[dir][1];
        const hitWall = nx < 0 || ny < 0 || nx >= level.size || ny >= level.size || level.walls.some(([wx, wy]) => wx === nx && wy === ny);
        if (hitWall) {
          draw(rx, ry, dir, trail, [nx, ny]);
          app.audio.sfx('bad');
          app.voice.speak('اصطدم بصخرة! احذف آخر أمر وجرّب التفافاً!');
          window.clearInterval(iv);
          runBtn.removeAttribute('disabled');
          app.ctx().report({ activityId: 'robot-fix', skillIds: ['sequence', 'debugging'], success: false, durationMs: Date.now() - t0, tries, hintsUsed: hints, errorKind: 'crash' });
          return;
        }
        rx = nx; ry = ny; trail.push([rx, ry]);
        if (level.stars.some(([sx, sy]) => sx === rx && sy === ry)) { starsGot++; app.audio.sfx('coin'); }
      }
      app.audio.sfx('step');
      draw(rx, ry, dir, trail, null);
    }, 550);
  });
  const clearBtn = bigButton('🧹 امسح', 'ghost', () => { prog = []; renderProg(); });
  const hintBtn = bigButton('💡 تلميح', 'ghost', () => {
    hints++;
    app.ctx().hint(hints, hints === 1 ? 'عِد المربعات حتى البطارية… كم خطوة للأمام؟' : 'جرّب: امشِ، امشِ، استدر، امشِ! ثم عدّل!');
  });
  bar.append(runBtn, clearBtn, hintBtn);
  s.append(bar);
  s.append(el('p', 'lead', '💡 المس الأمر في الشريط لحذفه. الخطأ يعني أنك تتعلم!'));
}
