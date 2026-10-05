/* Explorer 🌍: destinations + passport, garden sim, English words, train. */

import type { App } from '../core/app';
import { EN_WORDS, DESTINATIONS } from '../core/content';
import { bigButton, choice, choiceRow, el, panel, stage, title, topbar } from '../ui/helpers';
import { mountScreen } from './shell';

export function explorer(app: App, root: HTMLElement, param?: string): void {
  const s = mountScreen(root);
  s.append(topbar({ onHome: () => app.go('world'), coins: app.save.data.world.coins }));
  const tab = param || 'menu';
  if (tab === 'menu') {
    s.append(title('🌍 بوابة العالم', `جوازك: ${app.save.data.passport.length} أختام! وين نسافر؟`));
    const row = choiceRow();
    row.append(
      choice('✈️', 'سافر', () => app.go('explorer', 'fly')),
      choice('🌱', 'حديقتي', () => app.go('explorer', 'garden')),
      choice('🔤', 'كلمات', () => app.go('explorer', 'words')),
      choice('🚂', 'القطار', () => app.go('explorer', 'train')),
    );
    s.append(row);
    app.voice.speak('وين حابب تسافر اليوم؟');
    return;
  }
  if (tab === 'fly') return fly(app, s);
  if (tab === 'garden') return garden(app, s);
  if (tab === 'words') return words(app, s);
  return train(app, s);
}

function fly(app: App, s: HTMLElement): void {
  s.append(title('✈️ وين نسافر؟', 'المس بلداً لاستكشافه!'));
  app.voice.speak('اختار بلداً! كل بلد فيه حيوان وأكلة وحكاية!');
  for (const dst of DESTINATIONS) {
    const visited = app.save.data.passport.includes(dst.id);
    const p = panel();
    p.innerHTML = `<h2>${dst.emoji} ${dst.name} ${visited ? '✅' : ''}</h2><p>${dst.fact}</p><p>${dst.animal} • ${dst.food}</p>`;
    const b = bigButton(visited ? '✅ زرناها!' : '🎫 سافر!', visited ? 'ghost' : '', () => {
      if (visited) return;
      app.audio.sfx('win');
      app.save.update((d) => { d.passport.push(dst.id); });
      app.save.saveNow();
      app.ctx().report({ activityId: 'fly', skillIds: ['geography', 'culture', 'animals'], success: true, durationMs: 20000, tries: 1, hintsUsed: 0 });
      app.ctx().earnCoins(5, `زرت ${dst.name}!`);
      app.ctx().say(`أهلاً في ${dst.name}! ختم جديد في جوازك!`);
      import('../ui/helpers').then(({ confetti }) => confetti());
      app.go('explorer', 'fly');
    });
    p.append(b);
    s.append(p);
  }
}

/* garden: what-if sim — water & light sliders change plant happiness live */
function garden(app: App, s: HTMLElement): void {
  s.append(title('🌱 حديقتي', 'النبات يحتاج ماءً وضوءاً… لكن ليس كثيراً!'));
  app.voice.speak('اسقِ النبات وعرّضه للشمس! لكن احذر الكثير!');
  const st = stage(true);
  const plant = el('div', '', '🌱');
  plant.style.fontSize = '100px';
  plant.style.transition = 'transform 0.5s ease';
  const face = el('div', '', '');
  st.append(plant);
  s.append(st);
  s.append(face);
  const mkSlider = (label: string, emoji: string) => {
    const wrap = el('div');
    wrap.style.width = '100%';
    wrap.append(el('p', 'lead', `${emoji} ${label}`));
    const r = document.createElement('input');
    r.type = 'range'; r.min = '0'; r.max = '100'; r.value = '50';
    wrap.append(r);
    s.append(wrap);
    return r;
  };
  const water = mkSlider('الماء', '💧');
  const light = mkSlider('الضوء', '☀️');
  const animals = choiceRow();
  s.append(el('p', 'lead', 'من يعيش في حديقتك؟ (اختر حيواناً يناسب النبات!)'));
  s.append(animals);
  let pet: string | null = null;
  for (const a of ['🐝', '🦋', '🐌', '🐦']) {
    const b = choice(a, '', () => {
      pet = a; app.audio.sfx('pop');
      for (const x of [...animals.children]) x.classList.remove('picked');
      b.classList.add('picked');
      update();
    });
    animals.append(b);
  }
  const t0 = Date.now();
  const update = () => {
    const w = +water.value, li = +light.value;
    // happiness peaks at balanced values — real "what if" model
    const score = 100 - (Math.abs(w - 55) * 1.1 + Math.abs(li - 60) * 1.1);
    if (score > 70) { plant.textContent = '🌳'; face.textContent = '😊 النبات سعيد جداً!'; }
    else if (score > 40) { plant.textContent = '🌿'; face.textContent = '🙂 النبات بخير… جرّب تعديلاً!'; }
    else { plant.textContent = w > 80 ? '🥀' : '🌱'; face.textContent = w > 80 ? '😟 ماء كثير! الجذور تختنق!' : li < 25 ? '😟 ظلام! النبات يحتاج ضوءاً!' : '😟 شي ما مش مظبوط… عدّل!'; }
    plant.style.transform = `scale(${0.8 + Math.max(0, score) / 200})`;
    if (score > 70 && pet) {
      app.ctx().report({ activityId: 'garden', skillIds: ['nature', 'animals', 'prediction', 'systems'], success: true, durationMs: Date.now() - t0, tries: 2, hintsUsed: 0 });
      app.ctx().earnCoins(6, 'حديقة متوازنة!');
      app.ctx().say('حديقة متوازنة! الماء والضوء والحيوانات يعيشون معاً!');
      app.save.update((d) => { d.world.garden.plants++; if (!d.world.garden.animals.includes(pet!)) d.world.garden.animals.push(pet!); });
      app.save.saveNow();
      import('../ui/helpers').then(({ confetti }) => confetti());
      pet = null;
      for (const x of [...animals.children]) x.classList.remove('picked');
    }
  };
  water.oninput = update; light.oninput = update;
  update();
}

/* English: hear → understand → choose → repeat. Same words, many contexts. */
function words(app: App, s: HTMLElement): void {
  const pool = [...EN_WORDS].sort(() => Math.random() - 0.5).slice(0, 4);
  const target = pool[(Math.random() * pool.length) | 0];
  s.append(title('🔤 كلمات العالم', 'اسمع… بعدين المس الصورة!'));
  app.voice.speak(`${target.en}! ${target.en}! المس صورة ${target.ar}!`);
  // speak English too (bilingual ear)
  try {
    const u = new SpeechSynthesisUtterance(target.en);
    u.lang = 'en-US'; u.rate = 0.8;
    window.speechSynthesis?.speak(u);
  } catch { /* ignore */ }
  const row = choiceRow();
  s.append(row);
  let tries = 0; const t0 = Date.now();
  for (const w of pool.sort(() => Math.random() - 0.5)) {
    const b = choice(w.emoji, '', () => {
      tries++;
      if (w.en === target.en) {
        b.classList.add('good'); app.audio.sfx('good');
        app.voice.speak(`${target.en}! أحسنت! قلها معي: ${target.en}!`);
        try {
          const u = new SpeechSynthesisUtterance(target.en);
          u.lang = 'en-US'; u.rate = 0.75;
          window.speechSynthesis?.speak(u);
        } catch { /* ignore */ }
        app.ctx().report({ activityId: 'word-spots', skillIds: ['listening', 'vocabulary', 'naming'], success: true, durationMs: Date.now() - t0, tries, hintsUsed: 0, errorKind: tries > 1 ? 'guessing' : undefined });
        app.ctx().earnCoins(4, `${target.en}!`);
        import('../ui/helpers').then(({ confetti }) => confetti());
        s.append(bigButton('🔁 كلمة جديدة', 'violet', () => app.go('explorer', 'words')));
      } else {
        b.classList.add('bad'); app.audio.sfx('bad');
        window.setTimeout(() => b.classList.remove('bad'), 700);
      }
    });
    row.append(b);
  }
  s.append(bigButton('🔊 اسمع مجدداً', 'ghost', () => {
    app.voice.speak(`${target.en}! المس صورة ${target.ar}!`);
    try {
      const u = new SpeechSynthesisUtterance(target.en);
      u.lang = 'en-US'; u.rate = 0.8;
      window.speechSynthesis?.speak(u);
    } catch { /* ignore */ }
  }));
}

function train(app: App, s: HTMLElement): void {
  s.append(title('🚂 مهمة القطار', 'القطار يجب أن يصل الساعة ٣! أي طريق أسرع؟'));
  app.voice.speak('القطار مستعجل! أي طريق يوصّله بالوقت؟');
  const st = stage(true);
  st.innerHTML = '<div style="font-size:70px">🚂 💨</div>';
  s.append(st);
  const row = choiceRow();
  s.append(row);
  let tries = 0; const t0 = Date.now();
  const opts = [
    { e: '🛤️', n: 'الطريق القصير', ok: true, why: 'الطريق القصير أسرع! وصل بالوقت! 🕒' },
    { e: '🎢', n: 'طريق الألعاب', ok: false, why: '' },
    { e: '🌳', n: 'طريق الغابة', ok: false, why: '' },
  ].sort(() => Math.random() - 0.5);
  for (const o of opts) {
    const b = choice(o.e, o.n, () => {
      tries++;
      if (o.ok) {
        b.classList.add('good'); app.audio.sfx('win');
        st.innerHTML = '<div style="font-size:70px">🚂 🎉 🏁</div>';
        app.ctx().report({ activityId: 'train', skillIds: ['time', 'directions', 'planning'], success: true, durationMs: Date.now() - t0, tries, hintsUsed: 0 });
        app.ctx().earnCoins(6, 'وصل بالوقت!');
        app.ctx().say(o.why);
        import('../ui/helpers').then(({ confetti }) => confetti());
      } else {
        b.classList.add('bad'); app.audio.sfx('bad');
        app.voice.speak('هذا الطريق طويل وجميل… لكن القطار سيتأخر! جرّب غيره!');
        window.setTimeout(() => b.classList.remove('bad'), 700);
      }
    });
    row.append(b);
  }
}
