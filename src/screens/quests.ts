/* Quests 🗺️: the 10 polished adventures — checklists that deep-link
   into real activities and celebrate completion. */

import type { App } from '../core/app';
import { QUESTS } from '../core/content';
import type { ScreenName } from '../core/app';
import { bigButton, el, title, topbar } from '../ui/helpers';
import { mountScreen } from './shell';

export function quests(app: App, root: HTMLElement): void {
  const s = mountScreen(root);
  s.append(topbar({ onHome: () => app.go('world'), coins: app.save.data.world.coins }));
  s.append(title('🗺️ مغامراتي', 'كل مغامرة خطوات… أكملها واكسب!'));
  app.voice.speak('اختر مغامرة! كل مغامرة فيها خطوات ممتعة!');
  for (const q of QUESTS) {
    const qp = app.save.data.quests.find((x) => x.questId === q.id);
    const doneCount = qp?.stepsDone.length ?? 0;
    const card = el('button', 'zone-card', '') as HTMLButtonElement;
    card.style.minHeight = '130px';
    card.innerHTML = `${qp?.done ? '<span class="badge">مكتملة 🎉</span>' : doneCount ? '<span class="badge">مستمرة…</span>' : ''}<span class="emoji">${q.emoji}</span><span class="name">${q.title}</span><span class="hint">${q.story}</span><span class="hint">${doneCount}/${q.steps.length} • +${q.rewardCoins}🪙</span>`;
    card.onclick = () => { app.audio.sfx('tap'); openQuest(app, q.id); };
    s.append(card);
  }
  s.append(bigButton('🏗️ مشاريعي الكبيرة', 'violet', () => app.go('projects')));
}

function openQuest(app: App, questId: string): void {
  const q = QUESTS.find((x) => x.id === questId)!;
  const root = document.getElementById('app')!;
  const s = mountScreen(root);
  s.append(topbar({ onHome: () => app.go('world'), coins: app.save.data.world.coins }));
  s.append(title(`${q.emoji} ${q.title}`, q.story));
  app.voice.speak(`${q.title}! ${q.story}`);
  const qp = app.save.data.quests.find((x) => x.questId === q.id);
  q.steps.forEach((st, i) => {
    const done = qp?.stepsDone.includes(st.id);
    const p = el('div', 'panel');
    p.innerHTML = `<h2>${done ? '✅' : `${i + 1}.`} ${st.text}</h2>`;
    if (!done) {
      const b = bigButton('▶️ ابدأ!', '', () => {
        app.visitActivity(questId, st.id);
        app.save.saveNow();
        app.go(st.zone as ScreenName, st.activityId?.includes('-') || st.activityId ? activityParam(st.zone, st.activityId) : undefined);
      });
      b.style.minHeight = '64px'; b.style.fontSize = '21px';
      p.append(b);
    }
    s.append(p);
  });
  s.append(bigButton('🔙 كل المغامرات', 'ghost', () => app.go('quests')));
}

function activityParam(zone: string, activityId?: string): string | undefined {
  if (!activityId) return undefined;
  const map: Record<string, string> = {
    'float-sink': 'float', magnet: 'magnet', breath: 'breath', heart: 'heart',
    'robot-fix': '', 'memory-pairs': 'memory', patterns: 'pattern', train: 'train',
    'word-spots': 'words', garden: 'garden', 'space-launch': '', 'bridge-count': '',
  };
  void zone;
  return map[activityId] ?? undefined;
}
