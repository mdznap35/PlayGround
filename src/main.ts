/* NOVA boot: first-launch cinematic → world hub. Router + overlays. */

import './styles.css';
import { App, type ScreenName } from './core/app';
import { bus } from './core/events';
import { NovaGuide, toasts } from './ui/nova';
import { firstLaunch } from './screens/first';
import { world } from './screens/world';
import { home } from './screens/home';
import { lab } from './screens/lab';
import { body } from './screens/body';
import { mind } from './screens/mind';
import { make } from './screens/make';
import { robot } from './screens/robot';
import { explorer } from './screens/explorer';
import { space } from './screens/space';
import { impossible } from './screens/impossible';
import { stories } from './screens/stories';
import { music } from './screens/music';
import { values } from './screens/values';
import { city, museum } from './screens/city';
import { projects } from './screens/projects';
import { quests } from './screens/quests';
import { parents, applySettings } from './screens/parents';

const app = new App();
toasts();
const nova = new NovaGuide((text) => app.voice.speak(text, 'ar', true));
void nova;

const root = document.getElementById('app')!;

const routes: Record<ScreenName, (param?: string) => void> = {
  world: () => world(app, root),
  home: (p) => home(app, root, p),
  lab: (p) => lab(app, root, p),
  body: (p) => body(app, root, p),
  mind: (p) => mind(app, root, p),
  make: (p) => make(app, root, p),
  robot: () => robot(app, root),
  explorer: (p) => explorer(app, root, p),
  space: () => space(app, root),
  impossible: (p) => impossible(app, root, p),
  stories: (p) => stories(app, root, p),
  music: () => music(app, root),
  values: () => values(app, root),
  city: () => city(app, root),
  museum: () => museum(app, root),
  parents: (p) => parents(app, root, p),
  projects: (p) => projects(app, root, p),
  quests: () => quests(app, root),
};

app.go = (name: ScreenName, param?: string) => {
  try {
    app.voice.stop();
    app.save.flush();
    window.scrollTo(0, 0);
    routes[name](param);
    app.analytics.track('nav', { name });
  } catch (e) {
    console.error('[nav]', e);
    root.innerHTML = '';
    const d = document.createElement('div');
    d.className = 'screen';
    d.innerHTML = '<h1 class="title">🛟 عطل صغير!</h1><p class="lead">لا تقلق، لنرجع للعالم!</p>';
    const b = document.createElement('button');
    b.className = 'big-btn';
    b.textContent = '🏠 إلى العالم';
    b.onclick = () => routes.world();
    d.append(b);
    root.append(d);
  }
};

// global tap unlocks audio (mobile autoplay policy)
window.addEventListener('pointerdown', () => app.audio.unlock(), { passive: true });
bus.on('save:reset', () => { applySettings(app); });
// live purse: every reward refreshes visible coin counters without re-render
bus.on('toast', () => {
  const coins = app.save.data.world.coins;
  for (const s of document.querySelectorAll('.purse span')) s.textContent = `${coins}`;
});

applySettings(app);

// First launch ever → cinematic. Otherwise straight into the world.
if (!localStorage.getItem('nova.seen')) {
  localStorage.setItem('nova.seen', '1');
  firstLaunch(app, root);
} else {
  app.analytics.track('session:start', {});
  app.go('world');
}
