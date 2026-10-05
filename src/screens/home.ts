/* Home zone 🏠: shop (money), weather dress (life skills), emotions, co-play. */

import type { App } from '../core/app';
import { decide } from '../core/adaptive';
import { bigButton, choice, choiceRow, el, panel, stage, title, topbar } from '../ui/helpers';
import { mountScreen } from './shell';

export function home(app: App, root: HTMLElement, param?: string): void {
  const s = mountScreen(root);
  s.append(topbar({ onHome: () => app.go('world'), coins: app.save.data.world.coins }));
  const tab = param || 'menu';
  if (tab === 'menu') {
    s.append(title('🏠 بيتي', 'مكانك الدافئ! شو حابب تعمل؟'));
    const row = choiceRow();
    row.append(
      choice('🛒', 'المتجر', () => app.go('home', 'shop')),
      choice('🧥', 'لبس الطقس', () => app.go('home', 'dress')),
      choice('😊', 'مشاعري', () => app.go('home', 'feel')),
      choice('👨‍👩‍👧', 'نلعب معاً', () => app.go('home', 'coplay')),
    );
    s.append(row);
    app.voice.speak('أهلاً في بيتك! شو حابب تعمل؟');
    return;
  }
  if (tab === 'shop') return shop(app, s);
  if (tab === 'dress') return dress(app, s);
  if (tab === 'feel') return feel(app, s);
  return coplay(app, s);
}

/* ---------- shop: needs vs wants, prices, comparison, change ---------- */
const GOODS = [
  { id: 'apple', emoji: '🍎', name: 'تفاحة', en: 'Apple', price: 3, need: true },
  { id: 'bread', emoji: '🍞', name: 'خبز', en: 'Bread', price: 4, need: true },
  { id: 'milk', emoji: '🥛', name: 'حليب', en: 'Milk', price: 5, need: true },
  { id: 'toy', emoji: '🧸', name: 'لعبة', en: 'Toy', price: 12, need: false },
  { id: 'candy', emoji: '🍭', name: 'حلويات', en: 'Candy', price: 8, need: false },
];

function shop(app: App, s: HTMLElement): void {
  const dec = decide(app.save.data.attempts, 'shop');
  const budget = dec.difficulty === 0 ? 10 : dec.difficulty === 1 ? 15 : 20;
  s.append(title('🛒 متجر نوفا', `معك ${budget} عملات! اشترِ ما تحتاجه أولاً.`));
  app.voice.speak(`معك ${budget} عملات! اشترِ ما تحتاجه أولاً.`);
  const st = stage();
  const list = el('div', 'choice-row');
  const cart = el('p', 'lead', '');
  st.append(list);
  s.append(st, cart);
  const bar = el('div', 'toolbar');
  const hintBtn = bigButton('💡 تلميح', 'ghost');
  s.append(bar);
  let spent = 0;
  const bought: string[] = [];
  let hints = 0; const t0 = Date.now(); let tries = 0;
  const hintTexts = ['انظر للبطاقة الخضراء: هذه أشياء نحتاجها!', 'التفاحة والخبز والحليب أولاً!', 'اللعب والحلويات: نتمناها، لكن بعد الأساسيات.'];

  for (const g of GOODS) {
    const b = choice(g.emoji, `${g.name} ${g.price}🪙`, () => {
      tries++;
      app.audio.sfx('tap');
      if (spent + g.price > budget) {
        app.audio.sfx('bad');
        cart.textContent = 'ما بيكفي! اختار شيئاً أرخص أو احذف شيئاً.';
        app.voice.speak('ما بيكفي! جرّب شيئاً آخر.');
        return;
      }
      spent += g.price; bought.push(g.id);
      b.classList.add(g.need ? 'good' : 'picked');
      b.setAttribute('disabled', 'true');
      (b as HTMLButtonElement).disabled = true;
      app.audio.sfx('coin');
      app.voice.speak(`${g.name}! بالإنجليزية: ${g.en}!`, 'ar');
      const needs = bought.filter((x) => GOODS.find((y) => y.id === x)?.need).length;
      cart.textContent = `السلة: ${bought.length} أشياء — دفعت ${spent} من ${budget}`;
      if (needs >= 3) {
        const t = Date.now() - t0;
        app.ctx().report({ activityId: 'shop', skillIds: ['money', 'comparison', 'addition'], success: true, durationMs: t, tries, hintsUsed: hints });
        app.ctx().earnCoins(6, 'تسوّق ذكي!');
        app.ctx().say(`ممتاز! اشتريت الأساسيات أولاً!`);
        import('../ui/helpers').then(({ confetti }) => confetti());
        bar.append(bigButton('🔁 العب مرة أخرى', 'violet', () => app.go('home', 'shop')));
      }
    });
    list.append(b);
  }
  hintBtn.onclick = () => { app.ctx().hint(hints, hintTexts[Math.min(hints, 2)]); hints++; };
  bar.append(hintBtn);
}

const WEATHERS = [
  { id: 'rain', emoji: '🌧️', name: 'ممطر', items: ['🧥', '☂️', '🥾'], wrong: ['🕶️', '🩴'] },
  { id: 'sun', emoji: '☀️', name: 'مشمس', items: ['🕶️', '🧢', '🩴'], wrong: ['🧥', '☂️'] },
  { id: 'snow', emoji: '❄️', name: 'مثلج', items: ['🧥', '🧤', '🧣'], wrong: ['🩴', '🕶️'] },
];

function dress(app: App, s: HTMLElement): void {
  const w = WEATHERS[(Math.random() * WEATHERS.length) | 0];
  s.append(title(`${w.emoji} الجو ${w.name}!`, 'شو لازم نلبس؟ المس 3 أشياء مناسبة!'));
  app.voice.speak(`الجو ${w.name}! شو لازم نلبس؟`);
  const row = choiceRow();
  s.append(row);
  let picked = 0; let tries = 0; let hints = 0; const t0 = Date.now();
  const all = [...w.items.map((e) => ({ e, ok: true })), ...w.wrong.map((e) => ({ e, ok: false }))].sort(() => Math.random() - 0.5);
  for (const it of all) {
    const b = choice(it.e, '', () => {
      tries++;
      if (it.ok) {
        b.classList.add('good'); (b as HTMLButtonElement).disabled = true; app.audio.sfx('good');
        picked++;
        if (picked >= 3) {
          app.ctx().report({ activityId: 'weather-dress', skillIds: ['observation', 'selfcare', 'classification'], success: true, durationMs: Date.now() - t0, tries, hintsUsed: hints });
          app.ctx().earnCoins(5, 'لبس مناسب!');
          app.ctx().say('ممتاز! جاهز للخروج!');
          import('../ui/helpers').then(({ confetti }) => confetti());
        }
      } else {
        b.classList.add('bad'); app.audio.sfx('bad');
        app.voice.speak('همم… هاد مو مناسب لهالطقس. جرّب غيره!');
        window.setTimeout(() => b.classList.remove('bad'), 700);
      }
    });
    row.append(b);
  }
  const hb = bigButton('💡 تلميح', 'ghost', () => { hints++; app.ctx().hint(hints, hints > 1 ? `نحتاج: ${w.items.join(' ')}` : 'فكّر: هل الدنيا برد أم شوب أم مطر؟'); });
  s.append(hb);
}

const FACES = [
  { e: '😊', n: 'فرحان', when: 'لما نلعب مع أصحابنا!' },
  { e: '😢', n: 'حزين', when: 'لما لعبتنا تنكسر… نطلب حضناً!' },
  { e: '😠', n: 'غاضب', when: 'خذ نفساً عميقاً وعِد للعشرة!' },
  { e: '😨', n: 'خائف', when: 'الظلام مخيف… نطلب مساعدة كبير!' },
  { e: '😲', n: 'متفاجئ', when: 'مفاجأة حلوة!' },
];

function feel(app: App, s: HTMLElement): void {
  const f = FACES[(Math.random() * FACES.length) | 0];
  s.append(title(`${f.e} شو حاسس؟`, 'المس الوجه الذي يشبه هذا الشعور!'));
  app.voice.speak('شوف الوجه… شو حاسس؟ المس الوجه المشابه!');
  const st = stage();
  st.append(el('div', 'big-emoji', f.e));
  s.append(st);
  const row = choiceRow();
  s.append(row);
  let tries = 0; const t0 = Date.now();
  for (const c of [...FACES].sort(() => Math.random() - 0.5).slice(0, 4)) {
    const b = choice(c.e, c.n, () => {
      tries++;
      if (c.e === f.e) {
        b.classList.add('good'); app.audio.sfx('good');
        const p = panel();
        p.innerHTML = `<h2>${f.e} ${f.n}</h2><p>${f.when}</p>`;
        s.append(p);
        app.ctx().report({ activityId: 'emotions', skillIds: ['emotions', 'communication'], success: true, durationMs: Date.now() - t0, tries, hintsUsed: 0 });
        app.ctx().earnCoins(4, 'فهمت مشاعرك!');
        app.ctx().say('صح! كل المشاعر طبيعية ومهمة.');
      } else {
        b.classList.add('bad'); app.audio.sfx('bad');
        window.setTimeout(() => b.classList.remove('bad'), 700);
      }
    });
    row.append(b);
  }
  // ensure the right answer is always present
  if (![...row.children].some((x) => (x as HTMLElement).textContent?.includes(f.n))) {
    const b = choice(f.e, f.n, () => { b.classList.add('good'); app.audio.sfx('good'); });
    row.append(b);
  }
}

const COPLAY = [
  { e: '🍂', t: 'اجمعوا ٣ أوراق مختلفة من الخارج وقارنوا أحجامها!', skill: 'مقارنة وملاحظة' },
  { e: '🔺', t: 'دوّروا في البيت عن ٥ أشياء مثلثة الشكل!', skill: 'أشكال' },
  { e: '👂', t: 'اسكتوا دقيقة… كم صوتاً سمعتم؟ قلّدوها معاً!', skill: 'استماع' },
  { e: '🍳', t: 'اطبخوا شيئاً بسيطاً معاً: عِدّوا المكونات!', skill: 'عدّ وقياس' },
  { e: '📦', t: 'رتّبوا غرفة واحدة معاً: كل شي بمكانه!', skill: 'تنظيم' },
];

function coplay(app: App, s: HTMLElement): void {
  s.append(title('👨‍👩‍👧 نلعب معاً', 'مهمة حقيقية مع عائلتك، ثم سجّل اكتشافك!'));
  app.voice.speak('مهمة حقيقية مع عائلتك! اختاروا واحدة ونفّذوها معاً!');
  const m = COPLAY[(Math.random() * COPLAY.length) | 0];
  const p = panel();
  p.innerHTML = `<h2>${m.e} مهمتكم</h2><p>${m.t}</p><p><b>المهارة:</b> ${m.skill}</p>`;
  s.append(p);
  s.append(bigButton('✅ نفّذناها!', '', () => {
    app.audio.sfx('win');
    app.ctx().earnCoins(8, 'لعب عائلي!');
    app.ctx().report({ activityId: 'coplay', skillIds: ['communication', 'observation'], success: true, durationMs: 60000, tries: 1, hintsUsed: 0 });
    app.ctx().say('رائع! العائلة أقوى فريق!');
    import('../ui/helpers').then(({ confetti }) => confetti());
  }));
  s.append(bigButton('🎲 مهمة أخرى', 'violet', () => app.go('home', 'coplay')));
}
