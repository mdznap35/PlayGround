/* Space 🚀: countdown math, fuel planning, star catching. */

import type { App } from '../core/app';
import { bigButton, choice, el, stage, title, topbar } from '../ui/helpers';
import { mountScreen } from './shell';

export function space(app: App, root: HTMLElement): void {
  const s = mountScreen(root);
  s.append(topbar({ onHome: () => app.go('world'), coins: app.save.data.world.coins }));
  s.append(title('🚀 المهمة الفضائية', 'جهّز الصاروخ وعِد تنازلياً!'));
  app.voice.speak('جهّز الصاروخ! كم وحدة وقود نحتاج؟');

  const st = stage();
  const rocket = el('div', '', '🚀');
  rocket.style.fontSize = '90px';
  rocket.style.transition = 'transform 2.5s ease-in';
  st.append(rocket);
  s.append(st);

  // fuel = distance in kid-math
  const distance = 5 + ((Math.random() * 4) | 0); // 5..8
  s.append(el('p', 'lead', `الرحلة تحتاج ${distance} وحدات وقود! ⛽ المس حتى تملأ الخزان!`));
  const tank = el('div', 'toolbar');
  tank.style.fontSize = '36px';
  s.append(tank);
  let fuel = 0;
  const fuelBtn = choice('⛽', 'وقود', () => {
    if (fuel >= distance + 2) return;
    fuel++;
    tank.append(el('span', '', '🟡'));
    app.audio.sfx('pop');
    app.voice.speak(`${fuel}!`);
    if (fuel === distance) {
      app.voice.speak('ممتاز! الخزان ممتلئ بالضبط! جاهز للعد التنازلي!');
      s.append(launchBtn);
    }
  });
  const fb = el('div', 'choice-row');
  fb.append(fuelBtn);
  s.append(fb);

  const t0 = Date.now();
  const launchBtn = bigButton('🚀 إطلاق! ٣… ٢… ١…', '', () => {
    launchBtn.setAttribute('disabled', 'true');
    let n = 3;
    app.voice.speak('ثلاثة… اثنان… واحد… انطلاق!');
    const iv = window.setInterval(() => {
      app.voice.speak(`${n}…`);
      counter.textContent = n > 0 ? `${n}…` : 'انطلاق! 🚀';
      n--;
      if (n < 0) {
        window.clearInterval(iv);
        rocket.style.transform = 'translateY(-260px) scale(0.6)';
        app.audio.sfx('win');
        import('../ui/helpers').then(({ confetti }) => confetti());
        app.ctx().report({ activityId: 'space-launch', skillIds: ['counting', 'sequencing', 'space', 'measurement'], success: true, durationMs: Date.now() - t0, tries: 1, hintsUsed: 0 });
        app.ctx().earnCoins(10, 'انطلقت!');
        app.ctx().spotlight('space');
        app.ctx().say('رائع! أنت في الفضاء! اجمع النجوم الآن!');
        stars(app, s);
      }
    }, 900);
  });
  const counter = el('p', 'lead', '');
  s.append(counter);
}

function stars(app: App, s: HTMLElement): void {
  const st = stage();
  s.append(el('p', 'lead', 'المس ٥ نجوم قبل أن تختفي! ⭐'));
  s.append(st);
  let got = 0;
  const spawn = () => {
    if (got >= 5) return;
    const b = el('button', 'icon-btn', '⭐') as HTMLButtonElement;
    b.style.cssText = 'position:absolute;font-size:40px;background:none;border:none;cursor:pointer;';
    b.style.top = `${10 + Math.random() * 70}%`;
    b.style.left = `${5 + Math.random() * 85}%`;
    const kill = window.setTimeout(() => { b.remove(); if (got < 5) spawn(); }, 2200);
    b.onclick = () => {
      window.clearTimeout(kill);
      got++;
      app.audio.sfx('coin');
      b.remove();
      if (got >= 5) {
        app.ctx().earnCoins(8, 'صائد النجوم!');
        app.ctx().say('جمعت كل النجوم! مهمة فضائية ناجحة!');
        import('../ui/helpers').then(({ confetti }) => confetti());
        s.append(bigButton('🛰️ ابنِ محطة فضاء', 'violet', () => {
          app.save.update((d) => { if (!d.world.buildings.includes('spacestation')) d.world.buildings.push('spacestation'); });
          app.save.saveNow();
          app.go('city');
        }));
      } else spawn();
    };
    st.append(b);
  };
  spawn();
}
