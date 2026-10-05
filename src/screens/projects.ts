/* Projects 🏗️: generic runner — steps, decisions, validation, save/resume,
   artifact → museum + world. Driven by PROJECTS data. */

import type { App } from '../core/app';
import { PROJECTS } from '../core/content';
import { bigButton, choice, choiceRow, el, panel, stage, title, topbar } from '../ui/helpers';
import { mountScreen } from './shell';

export function projects(app: App, root: HTMLElement, param?: string): void {
  const s = mountScreen(root);
  s.append(topbar({ onHome: () => app.go('world'), coins: app.save.data.world.coins }));
  const def = PROJECTS.find((p) => p.id === param);
  if (!def) {
    s.append(title('🏗️ مشاريعي', 'مشروع حقيقي: فكرة… خطوات… نتيجة تُعرض!'));
    for (const p of PROJECTS) {
      const done = app.save.data.projects.some((x) => x.defId === p.id && x.status === 'done');
      const active = app.save.data.projects.some((x) => x.defId === p.id && x.status === 'active');
      const card = el('button', 'zone-card', '') as HTMLButtonElement;
      card.style.minHeight = '140px';
      card.innerHTML = `${done ? '<span class="badge">مكتمل 🎉</span>' : active ? '<span class="badge">مستمر…</span>' : ''}<span class="emoji">${p.emoji}</span><span class="name">${p.title}</span><span class="hint">${p.intro}</span>`;
      card.onclick = () => { app.audio.sfx('tap'); app.go('projects', p.id); };
      s.append(card);
    }
    app.voice.speak('اختر مشروعاً! سنبنيه معاً خطوة خطوة!');
    return;
  }
  runProject(app, s, def.id);
}

function runProject(app: App, s: HTMLElement, defId: string): void {
  const def = PROJECTS.find((p) => p.id === defId)!;
  const ps = app.projects.start(defId);
  const nextStep = ps.steps.find((x) => !x.done);
  s.append(title(`${def.emoji} ${def.title}`, def.intro));
  const prog = el('div', 'progress');
  const doneCount = ps.steps.filter((x) => x.done).length;
  prog.innerHTML = `<div style="width:${(doneCount / ps.steps.length) * 100}%"></div>`;
  s.append(prog);
  s.append(el('p', 'lead', `الخطوة ${doneCount + 1} من ${ps.steps.length}`));

  if (!nextStep) {
    // all steps done → finale
    const st = stage();
    st.append(el('div', '', def.emoji));
    s.append(st);
    s.append(bigButton('🎉 اعرض مشروعي!', '', () => {
      app.projects.finish(defId, { kind: defId, title: def.title, emoji: def.emoji, description: `أكملت كل الخطوات!`, createdAt: Date.now() });
      app.ctx().report({ activityId: defId, skillIds: def.skills, success: true, durationMs: Date.now() - ps.startedAt, tries: ps.steps.length, hintsUsed: 0 });
      app.audio.sfx('win');
      import('../ui/helpers').then(({ confetti }) => confetti());
      app.ctx().say(`مشروع ${def.title} مكتمل! صار في متحفك ومدينتك!`);
      app.go('museum');
    }));
    return;
  }

  const stepDef = def.steps.find((x) => x.id === nextStep.stepId)!;
  const p = panel();
  p.innerHTML = `<h2>${stepDef.title}</h2>`;
  s.append(p);
  app.voice.speak(stepDef.voice);
  s.append(el('p', 'lead', stepDef.voice));

  // per-project interactive step bodies (compact but REAL choices)
  const done = (data?: Record<string, unknown>) => {
    app.projects.completeStep(defId, nextStep.stepId, data);
    app.audio.sfx('good');
    app.go('projects', defId);
  };
  stepBody(app, s, defId, nextStep.stepId, done);
}

function pickRow(s: HTMLElement, options: { e: string; n: string }[], onPick: (i: number, b: HTMLButtonElement) => void): void {
  const row = choiceRow();
  options.forEach((o, i) => {
    const b = choice(o.e, o.n, () => onPick(i, b));
    row.append(b);
  });
  s.append(row);
}

function stepBody(app: App, s: HTMLElement, defId: string, stepId: string, done: (d?: Record<string, unknown>) => void): void {
  // ---- bridge ----
  if (defId === 'p-bridge' && stepId === 'mat') {
    pickRow(s, [{ e: '🪵', n: 'خشب قوي' }, { e: '🧶', n: 'حبال' }, { e: '📄', n: 'ورق' }], (i, b) => {
      if (i === 0) { b.classList.add('good'); app.voice.speak('اختيار ممتاز! الخشب يتحمّل!'); window.setTimeout(() => done({ mat: 'wood' }), 600); }
      else { b.classList.add('bad'); app.voice.speak('همم… هل يتحمّل الأثقال؟ جرّب غيره!'); window.setTimeout(() => b.classList.remove('bad'), 700); }
    });
    return;
  }
  if (defId === 'p-bridge' && stepId === 'len') {
    s.append(el('p', 'lead', 'النهر عرضه ٥ قطع! كم قطعة نحتاج؟'));
    pickRow(s, [{ e: '4️⃣', n: '٤' }, { e: '5️⃣', n: '٥' }, { e: '7️⃣', n: '٧' }], (i, b) => {
      if (i === 1) { b.classList.add('good'); window.setTimeout(() => done({ len: 5 }), 600); }
      else { b.classList.add('bad'); app.voice.speak('عِد عرض النهر معي: ١… ٢… ٣… ٤… ٥!'); window.setTimeout(() => b.classList.remove('bad'), 700); }
    });
    return;
  }
  if (defId === 'p-bridge' && stepId === 'build') {
    s.append(el('p', 'lead', 'المس ٥ قطع لبناء الجسر!'));
    const row = choiceRow(); s.append(row);
    let n = 0;
    for (let i = 0; i < 5; i++) {
      const b = choice('🟫', '', () => {
        if ((b as HTMLButtonElement).disabled) return;
        (b as HTMLButtonElement).disabled = true;
        b.classList.add('good'); n++;
        app.audio.sfx('build'); app.voice.speak(`${n}!`);
        if (n === 5) window.setTimeout(() => done({}), 500);
      });
      row.append(b);
    }
    return;
  }
  if (defId === 'p-bridge' && stepId === 'test') {
    s.append(el('p', 'lead', 'توقّع: هل يتحمّل الجسر الخشبي الفيل؟ 🐘'));
    pickRow(s, [{ e: '👍', n: 'نعم!' }, { e: '👎', n: 'لا!' }], (i, b) => {
      b.classList.add('good');
      app.voice.speak(i === 0 ? 'صح! الخشب القوي بطول مناسب يتحمّل! فيل سعيد يعبر!' : 'ذكي! الفيل ثقيل جداً! لكن جسرنا للمشاة والحيوانات الصغيرة — نجح!');
      window.setTimeout(() => done({}), 1200);
    });
    return;
  }
  // ---- city ----
  if (defId === 'p-city' && stepId === 'plan') {
    s.append(el('p', 'lead', 'ماذا تحتاج المدينة أولاً؟ اختر ٣!'));
    const row = choiceRow(); s.append(row);
    let n = 0;
    for (const o of [{ e: '🏠', n: 'بيت' }, { e: '🏫', n: 'مدرسة' }, { e: '🏥', n: 'مستشفى' }, { e: '🎪', n: 'سيرك' }]) {
      const b = choice(o.e, o.n, () => {
        if ((b as HTMLButtonElement).disabled) return;
        (b as HTMLButtonElement).disabled = true;
        b.classList.add('good'); n++; app.audio.sfx('pop');
        if (n === 3) window.setTimeout(() => done({}), 500);
      });
      row.append(b);
    }
    return;
  }
  if (defId === 'p-city') {
    // build + life steps: simple confirm-with-play
    s.append(bigButton(stepId === 'build' ? '🏗️ ابنِ المباني الثلاثة!' : '💡 شغّل الحياة!', '', () => {
      app.audio.sfx('build');
      app.voice.speak(stepId === 'build' ? 'بناء رائع! المدينة ترتفع!' : 'انظر! السيارات تتحرك والناس سعداء!');
      import('../ui/helpers').then(({ confetti }) => confetti());
      window.setTimeout(() => done({}), 900);
    }));
    return;
  }
  // ---- robot project ----
  if (defId === 'p-robot' && stepId === 'parts') {
    s.append(el('p', 'lead', 'ركّب الروبوت: اختر رأساً وجسماً وعجلات!'));
    const picks: string[] = [];
    const groups = [[{ e: '🤖', n: 'رأس' }, { e: '👾', n: 'رأس فضائي' }], [{ e: '📦', n: 'جسم' }, { e: '🛢️', n: 'جسم قوي' }], [{ e: '🛞', n: 'عجلات' }, { e: '🦿', n: 'أرجل' }]];
    for (const g of groups) {
      pickRow(s, g, (i, b) => {
        b.classList.add('good'); picks.push(g[i].e); app.audio.sfx('pop');
        for (const x of [...b.parentElement!.children]) if (x !== b) (x as HTMLButtonElement).disabled = true;
        if (picks.length === 3) { app.ctx().say(`روبوتك: ${picks.join('')}! رائع!`); window.setTimeout(() => done({ parts: picks }), 700); }
      });
    }
    return;
  }
  if (defId === 'p-robot') {
    s.append(el('p', 'lead', stepId === 'code' ? 'برمج الروبوت في منطقة الروبوت ثم ارجع!' : 'الأخطاء تعلّمنا! جرّب مرة أخرى!'));
    s.append(bigButton('🤖 افتح منطقة الروبوت', 'violet', () => app.go('robot')));
    s.append(bigButton('✅ أنجزت المهمة!', '', () => done({})));
    return;
  }
  // ---- film ----
  if (defId === 'p-film' && stepId === 'chars') {
    s.append(el('p', 'lead', 'اختر بطلين لفيلمك!'));
    const row = choiceRow(); s.append(row);
    const cast: string[] = [];
    for (const o of [{ e: '🦁', n: 'أسد' }, { e: '🐰', n: 'أرنب' }, { e: '🤖', n: 'روبوت' }, { e: '🧜', n: 'حورية' }]) {
      const b = choice(o.e, o.n, () => {
        if ((b as HTMLButtonElement).disabled || cast.length >= 2) return;
        (b as HTMLButtonElement).disabled = true;
        b.classList.add('good'); cast.push(o.e); app.audio.sfx('pop');
        if (cast.length === 2) window.setTimeout(() => done({ cast }), 500);
      });
      row.append(b);
    }
    return;
  }
  if (defId === 'p-film' && stepId === 'scenes') {
    s.append(el('p', 'lead', 'رتّب المشاهد: البداية… الوسط… النهاية!'));
    const order = ['🌅 بداية', '🌊 مغامرة', '🎉 نهاية'];
    const row = choiceRow(); s.append(row);
    let next = 0;
    for (const o of [...order].sort(() => Math.random() - 0.5)) {
      const b = choice(o.split(' ')[0], o, () => {
        const want = order[next];
        if (o === want) {
          (b as HTMLButtonElement).disabled = true;
          b.classList.add('good'); next++; app.audio.sfx('pop');
          if (next === 3) window.setTimeout(() => done({}), 500);
        } else { b.classList.add('bad'); app.voice.speak('القصة تبدأ بالبداية! أي مشهد أول؟'); window.setTimeout(() => b.classList.remove('bad'), 700); }
      });
      row.append(b);
    }
    return;
  }
  if (defId === 'p-film' && stepId === 'music') {
    s.append(el('p', 'lead', 'أضف موسيقى من صنعك!'));
    s.append(bigButton('🎵 لحّن في الاستوديو', 'violet', () => app.go('music')));
    s.append(bigButton('✅ أضفت الموسيقى!', '', () => done({})));
    return;
  }
  // ---- space project ----
  if (defId === 'p-space' && stepId === 'ship') {
    s.append(el('p', 'lead', 'اختر ٣ أجزاء للمركبة!'));
    const row = choiceRow(); s.append(row);
    let n = 0;
    for (const o of [{ e: '🚀', n: 'جسم' }, { e: '🪽', n: 'أجنحة' }, { e: '🔥', n: 'محرك' }, { e: '⛵', n: 'شراع' }]) {
      const b = choice(o.e, o.n, () => {
        if ((b as HTMLButtonElement).disabled) return;
        if (o.e === '⛵') { b.classList.add('bad'); app.voice.speak('الشراع للبحر… لا للفضاء!'); window.setTimeout(() => b.classList.remove('bad'), 700); return; }
        (b as HTMLButtonElement).disabled = true;
        b.classList.add('good'); n++; app.audio.sfx('build');
        if (n === 3) window.setTimeout(() => done({}), 500);
      });
      row.append(b);
    }
    return;
  }
  if (defId === 'p-space' && stepId === 'fuel') {
    s.append(el('p', 'lead', 'الرحلة بعيدة: نحتاج ٦ وحدات! عِد معي!'));
    const row = choiceRow(); s.append(row);
    let n = 0;
    for (let i = 0; i < 6; i++) {
      const b = choice('🛢️', '', () => {
        if ((b as HTMLButtonElement).disabled) return;
        (b as HTMLButtonElement).disabled = true;
        b.classList.add('good'); n++; app.audio.sfx('pop'); app.voice.speak(`${n}!`);
        if (n === 6) window.setTimeout(() => done({}), 500);
      });
      row.append(b);
    }
    return;
  }
  if (defId === 'p-space' && stepId === 'fly') {
    s.append(el('p', 'lead', 'نفّذ المهمة في منطقة الفضاء ثم ارجع!'));
    s.append(bigButton('🚀 افتح الفضاء', 'violet', () => app.go('space')));
    s.append(bigButton('✅ أكملت المهمة!', '', () => done({})));
    return;
  }
  // ---- garden project ----
  if (defId === 'p-garden' && stepId === 'env') {
    pickRow(s, [{ e: '🌳', n: 'غابة' }, { e: '🏜️', n: 'صحراء' }, { e: '🌊', n: 'بحر' }], (_i, b) => {
      b.classList.add('good');
      app.voice.speak('بيئة جميلة! الآن اختر من يعيش فيها!');
      window.setTimeout(() => done({}), 700);
    });
    return;
  }
  if (defId === 'p-garden' && stepId === 'life') {
    s.append(el('p', 'lead', 'اختر ٣ كائنات تناسب بيئتك!'));
    s.append(bigButton('🌱 افتح حديقتي', 'violet', () => app.go('explorer', 'garden')));
    s.append(bigButton('✅ المحمية جاهزة!', '', () => done({})));
    return;
  }
  if (defId === 'p-garden' && stepId === 'balance') {
    s.append(el('p', 'lead', 'هل الجميع سعيد وماء كافٍ؟ راقب وعدّل!'));
    s.append(bigButton('⚖️ التوازن مثالي!', '', () => done({})));
    return;
  }
  // fallback generic
  s.append(bigButton('✅ أنجزت الخطوة!', '', () => done({})));
}
