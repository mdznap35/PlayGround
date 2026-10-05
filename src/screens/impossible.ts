/* Impossible Room 🌀: wonder first — illusions + What-If engine.
   Goal: the child says "شو عم يصير؟!" then thinks. */

import type { App } from '../core/app';
import { bigButton, choice, choiceRow, el, panel, stage, title, topbar } from '../ui/helpers';
import { mountScreen } from './shell';

export function impossible(app: App, root: HTMLElement, param?: string): void {
  const s = mountScreen(root);
  s.append(topbar({ onHome: () => app.go('world'), coins: app.save.data.world.coins }));
  const tab = param || 'menu';
  if (tab === 'menu') {
    s.append(title('🌀 غرفة المستحيل', 'شو عم يصير؟!'));
    const row = choiceRow();
    row.append(
      choice('📏', 'أي خط أطول؟', () => app.go('impossible', 'lines')),
      choice('🐍', 'الثعابين تدور؟', () => app.go('impossible', 'snakes')),
      choice('🌧️', 'ماذا لو…؟', () => app.go('impossible', 'whatif')),
    );
    s.append(row);
    app.voice.speak('شو عم يصير هنا؟! تعال وشوف بعينك!');
    return;
  }
  if (tab === 'lines') return lines(app, s);
  if (tab === 'snakes') return snakes(app, s);
  return whatif(app, s);
}

/* Müller-Lyer: which line is longer? They are EQUAL. */
function lines(app: App, s: HTMLElement): void {
  s.append(title('📏 أي خط أطول؟', 'انظر جيداً… ثم قِس بنفسك!'));
  app.voice.speak('أي خط أطول؟ انظر جيداً واختار!');
  const st = stage(true);
  st.innerHTML = `
    <svg viewBox="0 0 400 160" style="width:100%;max-width:480px">
      <line x1="60" y1="50" x2="340" y2="50" stroke="#23224d" stroke-width="6"/>
      <path d="M60,50 L90,35 M60,50 L90,65 M340,50 L310,35 M340,50 L310,65" stroke="#23224d" stroke-width="6" fill="none"/>
      <line x1="60" y1="120" x2="340" y2="120" stroke="#7c6cf0" stroke-width="6"/>
      <path d="M60,120 L30,105 M60,120 L30,135 M340,120 L370,105 M340,120 L370,135" stroke="#7c6cf0" stroke-width="6" fill="none"/>
    </svg>`;
  s.append(st);
  const row = choiceRow();
  s.append(row);
  let tries = 0; const t0 = Date.now();
  const reveal = (pickedTop: boolean, b: HTMLButtonElement) => {
    tries++;
    if (tries === 1) {
      // whatever they pick first, surprise them: measure!
      b.classList.add('picked');
      app.voice.speak('همم… خلّينا نقيس بالمسطرة بدل عيوننا!');
      const p = panel();
      p.innerHTML = '<h2>📐 مفاجأة!</h2><p>الخطان <b>نفس الطول تماماً</b>! عيوننا خدعتنا! الأسهم غيّرت رأينا!</p>';
      s.append(p);
      app.ctx().report({ activityId: 'impossible-lines', skillIds: ['observation', 'measurement', 'flexibility'], success: true, durationMs: Date.now() - t0, tries, hintsUsed: 0 });
      app.ctx().earnCoins(6, 'عين ناقدة!');
      app.ctx().say('عيوننا أحياناً تخدعنا! العالم الحقيقي يحتاج قياساً!');
      import('../ui/helpers').then(({ confetti }) => confetti());
    }
    void pickedTop;
  };
  const b1 = choice('⬆️', 'الفوق', () => reveal(true, b1));
  const b2 = choice('⬇️', 'التحت', () => reveal(false, b2));
  row.append(b1, b2);
}

/* Rotating snakes illusion (CSS-animated, static image that looks alive). */
function snakes(app: App, s: HTMLElement): void {
  s.append(title('🐍 الثعابين تدور؟', 'الصور ثابتة… لكن عيونك تراها تتحرك!'));
  app.voice.speak('شوف الدوائر… هل تتحرك؟ حرّك عينك وانظر!');
  const st = stage();
  const discs = el('div', 'toolbar');
  for (let i = 0; i < 3; i++) {
    const disc = el('div', '', '🌀');
    (disc as HTMLElement).style.fontSize = '90px';
    (disc as HTMLElement).style.animation = 'spin 6s linear infinite';
    const style = document.createElement('style');
    style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
    document.head.append(style);
    discs.append(disc);
  }
  st.append(discs);
  s.append(st);
  const p = panel();
  p.innerHTML = '<h2>👁️ خدعة بصرية!</h2><p>الألوان المرتبة تخدع الدماغ فيرى الحركة! دماغك يحاول مساعدتك… وأحياناً يبالغ!</p>';
  s.append(p);
  s.append(bigButton('🤯 عجيب!', '', () => {
    app.audio.sfx('win');
    app.ctx().report({ activityId: 'impossible-snakes', skillIds: ['observation', 'flexibility'], success: true, durationMs: 15000, tries: 1, hintsUsed: 0 });
    app.ctx().earnCoins(4, 'اكتشفت الخدعة!');
    app.ctx().say('صح! ليس كل ما نراه حقيقياً!');
  }));
}

/* What-If Engine: change variables, watch the pond world react. */
function whatif(app: App, s: HTMLElement): void {
  s.append(title('🌧️ ماذا لو…؟', 'غيّر الطقس وشوف شو بيصير للبركة!'));
  app.voice.speak('ماذا يحدث لو زادت الأمطار؟ جرّب بنفسك!');
  const c = document.createElement('canvas');
  c.className = 'sim'; c.width = 640; c.height = 300;
  s.append(c);
  const ctx = c.getContext('2d')!;
  let rain = 40, sun = 50;
  const draw = () => {
    ctx.clearRect(0, 0, 640, 300);
    // sky
    const sky = ctx.createLinearGradient(0, 0, 0, 200);
    sky.addColorStop(0, sun > 60 ? '#bfe9ff' : '#9aa5c4');
    sky.addColorStop(1, '#e8f4ff');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, 640, 200);
    if (sun > 60) { ctx.font = '60px serif'; ctx.fillText('☀️', 520, 70); }
    if (rain > 50) {
      ctx.strokeStyle = 'rgba(60,120,255,0.7)'; ctx.lineWidth = 2;
      for (let i = 0; i < 40; i++) {
        const x = (i * 53 + Date.now() / 20) % 640;
        const y = (i * 37) % 120;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 6, y + 14); ctx.stroke();
      }
      requestAnimationFrame(() => { if (document.body.contains(c)) draw(); });
    }
    // pond level responds to rain & sun
    const level = 200 - rain * 0.5 + (100 - sun) * 0.1;
    ctx.fillStyle = '#3aa7e0'; ctx.fillRect(0, level, 640, 300 - level);
    ctx.font = '44px serif';
    if (rain > 70) ctx.fillText('🐸🎉', 280, level - 10);
    else if (sun > 75 && rain < 30) { ctx.fillText('🐸😰', 280, level - 10); }
    else ctx.fillText('🐸', 280, level - 10);
    ctx.fillText('🌾', 60, 230); ctx.fillText('🌾', 560, 230);
  };
  draw();
  const mk = (label: string, val: number, cb: (v: number) => void) => {
    const w = el('div'); w.style.width = '100%';
    w.append(el('p', 'lead', label));
    const r = document.createElement('input');
    r.type = 'range'; r.min = '0'; r.max = '100'; r.value = `${val}`;
    r.oninput = () => { cb(+r.value); draw(); narrate(+r.value, label); };
    w.append(r); s.append(w);
  };
  const note = el('p', 'lead', 'البركة متوازنة الآن.');
  s.append(note);
  const narrate = (v: number, label: string) => {
    void v; void label;
    if (rain > 70) { note.textContent = '🌧️ مطر كثير! البركة امتلأت والضفدع سعيد! لكن ماذا عن العشب؟'; }
    else if (sun > 75 && rain < 30) { note.textContent = '☀️ شمس قوية ولا مطر! البركة تجف… الضفدع حزين!'; }
    else { note.textContent = '⚖️ توازن جميل! كل شي سعيد!'; }
  };
  mk('🌧️ المطر', rain, (v) => { rain = v; });
  mk('☀️ الشمس', sun, (v) => { sun = v; });
  s.append(bigButton('🔬 سجّلت اكتشافاً!', 'violet', () => {
    app.audio.sfx('win');
    app.ctx().report({ activityId: 'whatif', skillIds: ['prediction', 'systems', 'nature'], success: true, durationMs: 30000, tries: 2, hintsUsed: 0 });
    app.ctx().earnCoins(6, 'عالِم تجارب!');
    app.ctx().say('العلماء يغيّرون شيئاً واحداً ويراقبون! مثلك تماماً!');
    import('../ui/helpers').then(({ confetti }) => confetti());
  }));
}
