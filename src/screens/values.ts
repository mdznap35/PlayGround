/* Values 🕌 (نور): curated, sourced, calm. Never AI-generated.
   Stories of prophets are referenced at high level; details stay with family. */

import type { App } from '../core/app';
import { VALUES } from '../core/content';
import { bigButton, el, panel, title, topbar } from '../ui/helpers';
import { mountScreen } from './shell';

const WUDU = ['🙌 غسل اليدين', '👄 المضمضة', '👃 الاستنشاق', '🙂 غسل الوجه', '💪 غسل الذراعين', '👋 مسح الرأس', '🦶 غسل القدمين'];
const SALAH = ['🧍 نقف وننوي', '🤲 تكبيرة الإحرام', '📖 نقرأ الفاتحة', '🙇 الركوع', '🧎 السجود', '🤲 التشهد والسلام'];

export function values(app: App, root: HTMLElement): void {
  const s = mountScreen(root);
  s.append(topbar({ onHome: () => app.go('world'), coins: app.save.data.world.coins }));
  s.append(title('🕌 نور', 'قصص وقيم جميلة ونور هادئ'));
  app.voice.speak('أهلاً في ركن النور الهادئ!');

  for (const v of VALUES) {
    const p = panel();
    p.innerHTML = `<h2>${v.emoji} ${v.title}</h2><p>${v.text}</p><p style="font-size:14px;color:#888">📚 المصدر: ${v.source}</p>`;
    const b = bigButton('🔊 اسمع', 'violet', () => app.voice.speak(`${v.title}. ${v.text}`));
    b.style.minHeight = '60px'; b.style.fontSize = '19px';
    p.append(b);
    s.append(p);
  }

  const w = panel();
  w.innerHTML = '<h2>💧 خطوات الوضوء</h2><p>نتوضأ معاً خطوة خطوة! (تعلّم عملياً مع الأهل)</p>';
  const wrow = el('div', 'toolbar');
  WUDU.forEach((t, i) => {
    const chip = el('button', 'tag', `${i + 1}. ${t}`) as HTMLButtonElement;
    chip.style.cursor = 'pointer'; chip.style.fontSize = '16px'; chip.style.padding = '10px 14px';
    chip.onclick = () => { app.audio.sfx('splash'); app.voice.speak(t); };
    wrow.append(chip);
  });
  w.append(wrow);
  s.append(w);

  const q = panel();
  q.innerHTML = '<h2>🕌 الصلاة</h2><p>خمس صلوات في اليوم: الفجر والظهر والعصر والمغرب والعشاء.</p>';
  const qrow = el('div', 'toolbar');
  SALAH.forEach((t, i) => {
    const chip = el('button', 'tag', `${i + 1}. ${t}`) as HTMLButtonElement;
    chip.style.cursor = 'pointer'; chip.style.fontSize = '16px'; chip.style.padding = '10px 14px';
    chip.onclick = () => { app.audio.sfx('pop'); app.voice.speak(t); };
    qrow.append(chip);
  });
  q.append(qrow);
  s.append(q);

  const note = panel();
  note.innerHTML = '<h2>💛 تنبيه لطيف</h2><p>كل المعلومات الدينية هنا مراجعة وموثقة المصدر. القصص التفصيلية للأنبياء نتعلّمها مع الأهل من المصادر الموثوقة.</p>';
  s.append(note);
}
