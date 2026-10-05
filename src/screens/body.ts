/* Body 🫀: a gentle visual journey inside the body. Simple language, no jargon. */

import type { App } from '../core/app';
import { bigButton, choice, choiceRow, el, panel, stage, title, topbar } from '../ui/helpers';
import { mountScreen } from './shell';

export function body(app: App, root: HTMLElement, param?: string): void {
  const s = mountScreen(root);
  s.append(topbar({ onHome: () => app.go('world'), coins: app.save.data.world.coins }));
  const tab = param || 'menu';
  if (tab === 'menu') {
    s.append(title('🫀 جسمي', 'تعال في رحلة داخل جسمك!'));
    const row = choiceRow();
    row.append(
      choice('🫁', 'رحلة النفس', () => app.go('body', 'breath')),
      choice('💓', 'قلبي يدق', () => app.go('body', 'heart')),
      choice('👁️', 'الحواس', () => app.go('body', 'senses')),
      choice('🦴', 'عظامي وعضلاتي', () => app.go('body', 'bones')),
    );
    s.append(row);
    app.voice.speak('تعال في رحلة داخل جسمك!');
    return;
  }
  if (tab === 'breath') return breath(app, s);
  if (tab === 'heart') return heart(app, s);
  if (tab === 'senses') return senses(app, s);
  return bones(app, s);
}

function breath(app: App, s: HTMLElement): void {
  s.append(title('🫁 رحلة النفس', 'تنفّس معي: شهيق… زفير…'));
  app.voice.speak('خذ نفساً عميقاً معي! شهيق… زفير…');
  const st = stage();
  const visual = el('div', '', '👃');
  visual.style.fontSize = '72px';
  const lungs = el('div', '', '🫁');
  lungs.style.fontSize = '90px';
  const air = el('div', '', '💨');
  air.style.fontSize = '40px';
  air.style.transition = 'transform 3s ease';
  st.append(visual, air, lungs);
  s.append(st);
  const t0 = Date.now();
  let cycles = 0;
  const hint = el('p', 'lead', 'المس الزر وتنفّس مع الدائرة!');
  s.append(hint);
  s.append(bigButton('🌬️ تنفّس!', '', () => {
    cycles++;
    app.audio.sfx('step');
    hint.textContent = `شهيق… الهواء يدخل من الأنف إلى الرئتين! (${cycles}/3)`;
    app.voice.speak('شهيق… الهواء يدخل إلى الرئتين!');
    air.style.transform = 'translateY(30px) scale(1.4)';
    lungs.style.transform = 'scale(1.25)';
    window.setTimeout(() => {
      hint.textContent = 'زفير… الهواء يخرج! الرئتان ترتاحان.';
      app.voice.speak('زفير… أحسنت!');
      air.style.transform = 'translateY(-30px) scale(1)';
      lungs.style.transform = 'scale(1)';
    }, 3000);
    if (cycles >= 3) {
      window.setTimeout(() => {
        app.ctx().report({ activityId: 'breath', skillIds: ['observation', 'selfcare'], success: true, durationMs: Date.now() - t0, tries: cycles, hintsUsed: 0 });
        app.ctx().earnCoins(5, 'تنفّست بعمق!');
        app.ctx().say('رائع! رئتاك تأخذان الهواء وتعطيان جسمك الطاقة!');
        import('../ui/helpers').then(({ confetti }) => confetti());
      }, 3200);
    }
  }));
}

function heart(app: App, s: HTMLElement): void {
  s.append(title('💓 قلبي يدق', 'المس قلبك… ثم تحرّك وشوف!'));
  app.voice.speak('حط إيدك على قلبك وحس بالدقات! بعدين اقفز معي!');
  const st = stage();
  const heartEl = el('div', '', '❤️');
  heartEl.style.fontSize = '110px';
  heartEl.style.transition = 'transform 0.3s ease';
  st.append(heartEl);
  s.append(st);
  const t0 = Date.now();
  const counter = el('p', 'lead', 'دقاتك: اضغط على القلب مع كل دقة تحسها!');
  s.append(counter);
  let beats = 0; let jumping = false;
  heartEl.style.cursor = 'pointer';
  heartEl.onclick = () => {
    beats++;
    app.audio.sfx('pop');
    heartEl.style.transform = 'scale(1.3)';
    window.setTimeout(() => { heartEl.style.transform = 'scale(1)'; }, 250);
    counter.textContent = `دقات: ${beats} — ${beats >= 10 ? 'ممتاز! قلبك مضخة قوية!' : 'أحسنت! كمّل!'}`;
    if (beats === 10) {
      app.ctx().report({ activityId: 'heart', skillIds: ['observation', 'selfcare'], success: true, durationMs: Date.now() - t0, tries: beats, hintsUsed: 0 });
      app.ctx().earnCoins(5, 'قلب قوي!');
      app.ctx().say('قلبك مضخة صغيرة ترسل الدم لكل جسمك!');
      import('../ui/helpers').then(({ confetti }) => confetti());
    }
  };
  s.append(bigButton('🏃 اقفز ٥ مرات!', 'violet', () => {
    if (jumping) return;
    jumping = true;
    app.voice.speak('واحد… اثنان… ثلاثة… أربعة… خمسة! حس بقلبك الآن!');
    let j = 0;
    const iv = window.setInterval(() => {
      j++;
      heartEl.style.transform = 'scale(1.4)';
      window.setTimeout(() => { heartEl.style.transform = 'scale(1)'; }, 200);
      app.audio.sfx('step');
      if (j >= 5) {
        window.clearInterval(iv); jumping = false;
        counter.textContent = 'شفت؟ لما نتحرك، القلب بيدق أسرع ليعطينا طاقة!';
        app.voice.speak('شفت؟ لما نتحرك، القلب بيدق أسرع!');
      }
    }, 600);
  }));
}

const SENSE_Q = [
  { sound: '🎶', options: [{ e: '👂', n: 'الأذن' }, { e: '👁️', n: 'العين' }], answer: '👂', why: 'الأذن تستقبل الصوت، والدماغ يفهمه!' },
  { sound: '🌹', options: [{ e: '👃', n: 'الأنف' }, { e: '👅', n: 'اللسان' }], answer: '👃', why: 'الأنف يشم الروائح الجميلة!' },
  { sound: '💡', options: [{ e: '👁️', n: 'العين' }, { e: '✋', n: 'اليد' }], answer: '👁️', why: 'العين ترى الضوء والألوان!' },
  { sound: '🍯', options: [{ e: '👅', n: 'اللسان' }, { e: '👂', n: 'الأذن' }], answer: '👅', why: 'اللسان يتذوق الحلو!' },
  { sound: '🧤', options: [{ e: '✋', n: 'الجلد' }, { e: '👃', n: 'الأنف' }], answer: '✋', why: 'الجلد يحس بالملمس: ناعم أم خشن!' },
];

function senses(app: App, s: HTMLElement): void {
  const qi = (Math.random() * SENSE_Q.length) | 0;
  const q = SENSE_Q[qi];
  s.append(title(`${q.sound} أي حاسة؟`, 'المس العضو الذي يستقبل هذا الشيء!'));
  app.voice.speak('أي حاسة تستقبل هذا الشيء؟ المس العضو الصح!');
  const row = choiceRow();
  s.append(row);
  let tries = 0; const t0 = Date.now();
  for (const o of q.options) {
    const b = choice(o.e, o.n, () => {
      tries++;
      if (o.e === q.answer) {
        b.classList.add('good'); app.audio.sfx('good');
        const p = panel();
        p.innerHTML = `<h2>${o.e} ${o.n}</h2><p>${q.why}</p>`;
        s.append(p);
        app.ctx().report({ activityId: 'senses', skillIds: ['listening', 'classification', 'observation'], success: true, durationMs: Date.now() - t0, tries, hintsUsed: 0 });
        app.ctx().earnCoins(5, 'حواس ذكية!');
        import('../ui/helpers').then(({ confetti }) => confetti());
        s.append(bigButton('🔁 سؤال جديد', 'violet', () => app.go('body', 'senses')));
      } else {
        b.classList.add('bad'); app.audio.sfx('bad');
        window.setTimeout(() => b.classList.remove('bad'), 700);
      }
    });
    row.append(b);
  }
}

function bones(app: App, s: HTMLElement): void {
  s.append(title('🦴 عظامي وعضلاتي', 'العظام صلبة… والعضلات تتحرك!'));
  app.voice.speak('المس ذراعك! العظم صلب بالداخل، والعضلة تتحرك!');
  const st = stage();
  st.innerHTML = '<div style="font-size:90px" id="bone-arm">💪</div>';
  s.append(st);
  const q = el('p', 'lead', 'حرّك ذراعك الآن! شو اللي بيتحرك؟');
  s.append(q);
  const row = choiceRow();
  const t0 = Date.now(); let tries = 0;
  const b1 = choice('🦴', 'العظام', () => wrong(b1));
  const b2 = choice('💪', 'العضلات', () => {
    tries++;
    b2.classList.add('good'); app.audio.sfx('good');
    const p = panel();
    p.innerHTML = '<h2>💪 العضلات!</h2><p>العظام تعطينا الشكل والقوة، والعضلات تشدّها فنتحرك! جرّب تقفز وتشوف!</p>';
    s.append(p);
    app.ctx().report({ activityId: 'bones', skillIds: ['observation', 'selfcare'], success: true, durationMs: Date.now() - t0, tries, hintsUsed: 0 });
    app.ctx().earnCoins(4, 'اكتشفت جسمك!');
    app.ctx().say('صح! العضلات تتحرك والعظام تدعم!');
  });
  const wrong = (b: HTMLButtonElement) => {
    tries++;
    b.classList.add('bad'); app.audio.sfx('bad');
    app.voice.speak('العظام صلبة وما بتتحرك لحالها… شو اللي بيشدّها؟');
    window.setTimeout(() => b.classList.remove('bad'), 700);
  };
  row.append(b1, b2);
  s.append(row);
}
