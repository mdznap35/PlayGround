/* Stories 📖: no reading required — scenes speak, child decides.
   Choices branch; English words woven in context. */

import type { App } from '../core/app';
import { STORIES } from '../core/content';
import { bigButton, choice, choiceRow, el, title, topbar } from '../ui/helpers';
import { mountScreen } from './shell';

export function stories(app: App, root: HTMLElement, param?: string): void {
  const s = mountScreen(root);
  s.append(topbar({ onHome: () => app.go('world'), coins: app.save.data.world.coins }));
  const [storyId, nodeId] = (param || '').split(':');
  const story = STORIES.find((x) => x.id === storyId);
  if (!story) {
    s.append(title('📖 القصص', 'اختر مغامرة!'));
    const row = choiceRow();
    for (const st of STORIES) {
      row.append(choice(st.emoji, st.title, () => { app.audio.sfx('tap'); app.go('stories', st.id); }));
    }
    s.append(row);
    app.voice.speak('اختر قصة! أنت من يقرر ماذا يحدث!');
    return;
  }
  const node = story.nodes[nodeId || story.start];
  if (!node) { app.go('stories'); return; }
  s.append(title(`${story.emoji} ${story.title}`, ''));
  const stageEl = el('div', 'stage');
  const face = el('div', '', node.emoji);
  face.style.fontSize = '100px';
  stageEl.append(face);
  s.append(stageEl);
  const text = el('p', 'lead', node.text);
  text.style.fontSize = '22px';
  s.append(text);
  app.voice.speak(node.text);
  if (node.end) {
    app.audio.sfx('win');
    app.ctx().report({ activityId: `story-${story.id}`, skillIds: story.skills, success: true, durationMs: 60000, tries: 2, hintsUsed: 0 });
    app.ctx().earnCoins(8, 'صانع حكايات!');
    import('../ui/helpers').then(({ confetti }) => confetti());
    s.append(bigButton('📖 قصة أخرى', 'violet', () => app.go('stories')));
    return;
  }
  const row = choiceRow();
  for (const c of node.choices ?? []) {
    row.append(choice(c.emoji, c.label, () => {
      app.audio.sfx('tap');
      app.go('stories', `${story.id}:${c.next}`);
    }));
  }
  s.append(row);
  s.append(bigButton('🔊 اسمع مجدداً', 'ghost', () => app.voice.speak(node.text)));
}
