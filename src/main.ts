/* NOVA boot: first-launch cinematic → world hub. Router + overlays. */

import './styles.css';
import { App, type ScreenName } from './core/app';
import { ambienceFor } from './core/ambience';
import { bus } from './core/events';
import { SoundBank } from './core/sound';
import { NOVA_LOOKS } from './engine/art';
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
import { hatch } from './screens/hatch';
import { grove } from './screens/grove';
import { lamplight } from './screens/lamplight';
import { starmail } from './screens/starmail';
import { projects } from './screens/projects';
import { quests } from './screens/quests';
import { parents, applySettings } from './screens/parents';

const app = new App();
// File-based SFX + zone ambience. Lazy (no startup cost), synth-fallback,
// offline-safe (precached same-origin files). No visual or learning changes.
const bank = new SoundBank(app.audio);
app.audio.bank = { tryPlay: (n) => bank.tryPlay(n) };
toasts();
const nova = new NovaGuide((text) => app.voice.speak(text, 'ar', true));
void nova;
// wear my Nova's colors in the guide bubble from the first frame
{
  const look = NOVA_LOOKS[app.save.data.avatar.tint];
  nova.paintFace(look.mid, look.deep);
}

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
  hatch: () => hatch(app, root),
  grove: () => grove(app, root),
  lamplight: () => lamplight(app, root),
  starmail: () => starmail(app, root),
};

app.go = (name: ScreenName, param?: string) => {
  try {
    app.voice.stop();
    app.save.flush();
    window.scrollTo(0, 0);
    routes[name](param);
    app.analytics.track('nav', { name });
    // Zone ambience: fire-and-forget, never blocks navigation, never throws.
    try {
      const bed = ambienceFor(name, param);
      if (bed) void bank.ambience(bed);
      else bank.stopAmbience();
    } catch { /* audio must never break navigation */ }
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

// global tap unlocks audio (mobile autoplay policy) + warms the file bank
window.addEventListener('pointerdown', () => { app.audio.unlock(); bank.prime(); }, { passive: true });
bus.on('save:reset', () => { applySettings(app); });
// live purse: every reward refreshes visible coin counters without re-render
bus.on('toast', () => {
  const coins = app.save.data.world.coins;
  for (const s of document.querySelectorAll('.purse span')) s.textContent = `${coins}`;
});

applySettings(app);

// Deep-link affordance (testing + future share links): #<screen> jumps straight
// in when it names a real route. Otherwise normal boot:
// first launch → cinematic → hatch beach; unhatched keepers → hatch beach.
const hash = (location.hash || '').replace('#', '');
if (hash && hash in routes) {
  app.analytics.track('session:start', {});
  app.go(hash as ScreenName);
} else if (!localStorage.getItem('nova.seen')) {
  localStorage.setItem('nova.seen', '1');
  firstLaunch(app, root);
} else if (!app.save.data.hatch?.hatchedAt) {
  app.analytics.track('session:start', {});
  app.go('hatch');
} else {
  app.analytics.track('session:start', {});
  app.go('world');
}
