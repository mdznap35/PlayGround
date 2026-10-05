/* Parents 👨‍👩‍👧: gated, useful, visual, no diagnostic claims.
   Skills, trends, help-needed, favorites, projects, settings, safety. */

import type { App } from '../core/app';
import { ACTIVITIES } from '../core/content';
import type { SkillId } from '../core/types';
import { bigButton, choice, choiceRow, el, panel, title, topbar } from '../ui/helpers';
import { mountScreen } from './shell';

export const SKILL_AR: Record<SkillId, string> = {
  observation: 'الملاحظة', memory: 'الذاكرة', classification: 'التصنيف', patterns: 'الأنماط',
  sequencing: 'التسلسل', prediction: 'التوقع', planning: 'التخطيط', flexibility: 'المرونة',
  problemSolving: 'حل المشكلات', spatial: 'المكان',
  quantity: 'الكمية', counting: 'العد', comparison: 'المقارنة', addition: 'الجمع',
  subtraction: 'الطرح', shapes: 'الأشكال', measurement: 'القياس', time: 'الوقت',
  money: 'النقود', directions: 'الاتجاهات',
  listening: 'الاستماع', vocabulary: 'المفردات', instructions: 'فهم التعليمات',
  sentences: 'الجمل', naming: 'التسمية', description: 'الوصف',
  construction: 'البناء', composition: 'التأليف', storytelling: 'سرد القصص', color: 'الألوان',
  sound: 'الصوت', invention: 'الاختراع',
  sequence: 'التسلسل البرمجي', logic: 'المنطق', conditions: 'الشروط', repetition: 'التكرار',
  debugging: 'إصلاح الأخطاء', systems: 'الأنظمة',
  nature: 'الطبيعة', animals: 'الحيوانات', geography: 'الجغرافيا', professions: 'المهن',
  transport: 'المواصلات', culture: 'الثقافات', space: 'الفضاء',
  selfcare: 'العناية', safety: 'السلامة', emotions: 'المشاعر', communication: 'التواصل', values: 'القيم',
};

export function parents(app: App, root: HTMLElement, param?: string): void {
  const s = mountScreen(root);
  s.append(topbar({ onHome: () => app.go('world'), coins: app.save.data.world.coins }));
  if (param !== 'in') return gate(app, s);
  const d = app.save.data;
  s.append(title('👨‍👩‍👧 لوحة الوالدين', 'نظرة مفيدة على رحلة طفلك — بدون ادعاءات تشخيصية.'));

  // overview
  const ov = panel();
  const att = d.attempts;
  const wins = att.filter((a) => a.success).length;
  ov.innerHTML = `<h2>📊 نظرة عامة</h2>
    <div class="kv"><span>أنشطة ملعوبة</span><b>${att.length}</b></div>
    <div class="kv"><span>نسبة النجاح</span><b>${att.length ? Math.round((wins / att.length) * 100) : 0}%</b></div>
    <div class="kv"><span>مشاريع مكتملة</span><b>${d.projects.filter((p) => p.status === 'done').length}</b></div>
    <div class="kv"><span>بلدان مزورة</span><b>${d.passport.length}</b></div>
    <div class="kv"><span>عملات نوفا</span><b>${d.world.coins} 🪙</b></div>`;
  s.append(ov);

  // skills improving
  const sk = panel();
  const entries = Object.entries(d.skills).sort((a, b) => b[1].strength - a[1].strength);
  let html = '<h2>🌱 المهارات</h2>';
  if (!entries.length) html += '<p>العب قليلاً وستظهر المهارات هنا!</p>';
  for (const [id, st] of entries.slice(0, 12)) {
    const pct = Math.round(st.strength * 100);
    const ctxCount = Array.isArray(st.contexts) ? st.contexts.length : 0;
    const transfer = ctxCount >= 2 ? ` • 🌉 ${ctxCount} سياقات` : '';
    html += `<div class="kv"><span>${SKILL_AR[id as SkillId] ?? id}</span><b>${pct}% • ${st.plays} مرات${transfer}</b></div>`;
  }
  sk.innerHTML = html;
  s.append(sk);

  // transfer: same skill alive in different contexts (the real learning signal)
  const transferred = app.skills.transferred().slice(0, 4);
  if (transferred.length) {
    const tr = panel();
    tr.innerHTML = '<h2>🌉 تنتقل بين السياقات</h2><p>هذه المهارات استخدمها طفلك في أكثر من نشاط — وهذا أقوى من الحفظ:</p>' +
      transferred.map((t) => {
        const names = t.contexts.map((c) => ACTIVITIES.find((x) => x.id === c)?.title ?? c).join(' ← ');
        return `<div class="kv"><span>${SKILL_AR[t.id]}</span><b>${t.contexts.length} سياقات</b></div><p style="font-size:14px">${names}</p>`;
      }).join('');
    s.append(tr);
  }

  // needs repetition
  const need = app.skills.needsPractice();
  const np = panel();
  np.innerHTML = `<h2>🔁 تحتاج تكراراً ممتعاً</h2>` +
    (need.length ? need.slice(0, 6).map((n) => `<div class="kv"><span>${SKILL_AR[n.id]}</span><b>${Math.round(n.strength * 100)}%</b></div>`).join('') : '<p>لا شيء عالق حالياً — ممتاز!</p>') +
    '<p>نصيحة: التكرار عبر اللعب والسياقات المختلفة يثبّت المهارة أكثر من الحفظ.</p>';
  s.append(np);

  // favorites + errors
  const fav = panel();
  const themes = Object.entries(d.spotlight).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const errs = d.attempts.filter((a) => !a.success).slice(-5).map((a) => ACTIVITIES.find((x) => x.id === a.activityId)?.title ?? a.activityId);
  fav.innerHTML = `<h2>💛 الاهتمامات</h2><p>${themes.length ? themes.map(([t, c]) => `${t} (${c})`).join(' • ') : 'ستظهر بعد اللعب'}</p>
    <h2>🧩 أخطاء أخيرة (للمتابعة بلطف)</h2><p>${errs.length ? errs.join(' • ') : 'لا أخطاء مسجلة'}</p>`;
  s.append(fav);

  // settings
  const st = app.save.data.settings;
  const set = panel();
  set.innerHTML = '<h2>⚙️ الإعدادات والسلامة</h2>';
  const toggles: [string, keyof typeof st, string][] = [
    ['الصوت والتعليمات', 'voice', 'voice'], ['الموسيقى', 'music', 'music'], ['المؤثرات', 'sfx', 'sfx'],
    ['تقليل الحركة', 'reduceMotion', 'reduce'], ['مساعدة ذكية', 'aiAssist', 'ai'],
  ];
  for (const [label, key] of toggles) {
    const row = el('div', 'kv');
    row.innerHTML = `<span>${label}</span>`;
    const b = el('button', 'tag', st[key] ? 'مفعّل ✅' : 'مغلق') as HTMLButtonElement;
    b.style.cursor = 'pointer';
    b.onclick = () => {
      app.save.update((dd) => { (dd.settings[key] as boolean) = !dd.settings[key]; });
      app.save.saveNow();
      applySettings(app);
      app.go('parents', 'in');
    };
    row.append(b);
    set.append(row);
  }
  const rate = el('div', 'kv');
  rate.innerHTML = '<span>سرعة الصوت</span>';
  const rs = document.createElement('input');
  rs.type = 'range'; rs.min = '0.6'; rs.max = '1.3'; rs.step = '0.05'; rs.value = `${st.voiceRate}`;
  rs.onchange = () => { app.save.update((dd) => { dd.settings.voiceRate = +rs.value; }); app.save.saveNow(); };
  rate.append(rs);
  set.append(rate);
  const safety = el('p', '', '🔒 بلا إعلانات • بلا دردشة • بلا مشاركة • البيانات على هذا الجهاز فقط.');
  set.append(safety);
  const reset = bigButton('🗑️ بداية جديدة (مسح التقدم)', 'ghost', () => {
    if (window.confirm('مسح كل تقدم الطفل؟')) { app.save.reset(); applySettings(app); app.go('world'); }
  });
  set.append(reset);
  s.append(set);
}

function gate(app: App, s: HTMLElement): void {
  s.append(title('🔐 منطقة الوالدين', 'سؤال سريع للكبار فقط:'));
  const a = 5 + ((Math.random() * 8) | 0);
  const b = 4 + ((Math.random() * 6) | 0);
  s.append(el('p', 'lead', `كم يساوي ${a} + ${b}؟`));
  const row = choiceRow();
  const ans = a + b;
  for (const o of [ans, ans + 2, ans - 1].sort(() => Math.random() - 0.5)) {
    row.append(choice(`${o}`, '', () => {
      if (o === ans) app.go('parents', 'in');
      else { app.audio.sfx('bad'); app.go('world'); }
    }));
  }
  s.append(row);
}

export function applySettings(app: App): void {
  const st = app.save.data.settings;
  app.audio.settings = st;
  app.voice.settings = st;
  document.body.classList.toggle('reduce-motion', st.reduceMotion);
  if (st.music) app.audio.startMusic();
  else app.audio.stopMusic();
}
