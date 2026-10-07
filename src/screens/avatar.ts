/* My Nova — avatar picker. Tapping Nova opens HER wardrobe, not a menu.
   Big touch targets, live preview, voice-led (no reading needed):
   pick a color, pick a keepsake, she celebrates and wears it everywhere.
   Pure save writes (claimed=true) + face repaint; island keeps living behind. */

import type { App } from '../core/app';
import type { NovaCharm, NovaTint } from '../core/types';
import { bus } from '../core/events';
import { NOVA_LOOKS, drawNova, lookFromAvatar } from '../engine/art';
import { el } from '../ui/helpers';

const TINTS: { id: NovaTint; voice: string }[] = [
  { id: 'violet', voice: 'بنفسجية! لون النجوم!' },
  { id: 'teal', voice: 'خضراء! لون البحر!' },
  { id: 'coral', voice: 'وردية! لون الزهر!' },
  { id: 'sunny', voice: 'ذهبية! لون الشمس!' },
];

const CHARMS: { id: NovaCharm; emoji: string; voice: string }[] = [
  { id: 'none', emoji: '✨', voice: 'بسيطة وجميلة!' },
  { id: 'leaf', emoji: '🍃', voice: 'ورقة! من حديقتك!' },
  { id: 'star', emoji: '⭐', voice: 'نجمة! من الفضاء!' },
  { id: 'shell', emoji: '🐚', voice: 'صدفة! من البحر!' },
];

export function openAvatarPicker(app: App): void {
  const say = (text: string) => {
    bus.emit('nova:say', { text });
    app.voice.speak(text);
  };
  const paint = () => {
    const look = lookFromAvatar(app.save.data.avatar);
    bus.emit('avatar:paint', { mid: look.mid, deep: look.deep });
  };

  const overlay = el('div', 'avatar-overlay');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'نوفا خاصتي');

  const card = el('div', 'avatar-card');

  // live preview canvas — she wears every tap instantly
  const prev = document.createElement('canvas');
  prev.width = 200; prev.height = 200;
  prev.className = 'avatar-preview';
  const pctx = prev.getContext('2d')!;
  const repaint = () => {
    const a = app.save.data.avatar;
    pctx.clearRect(0, 0, 200, 200);
    drawNova(pctx, 100, 110, 62, { mood: 'celebrate' }, performance.now(), false,
      lookFromAvatar(a), a.charm);
  };
  repaint();

  const rowTint = el('div', 'avatar-row');
  for (const t of TINTS) {
    const look = NOVA_LOOKS[t.id];
    const b = el('button', 'avatar-swatch') as HTMLButtonElement;
    b.style.background = `radial-gradient(circle at 35% 30%, ${look.light}, ${look.mid} 60%, ${look.deep})`;
    b.setAttribute('aria-label', t.voice);
    if (app.save.data.avatar.tint === t.id) b.classList.add('picked');
    b.onclick = () => {
      app.save.update((d) => { d.avatar.tint = t.id; d.avatar.claimed = true; });
      app.save.saveNow();
      paint();
      for (const x of [...rowTint.children]) x.classList.remove('picked');
      b.classList.add('picked');
      app.audio.sfx('pop');
      repaint();
      say(t.voice);
    };
    rowTint.append(b);
  }

  const rowCharm = el('div', 'avatar-row');
  for (const c of CHARMS) {
    const b = el('button', 'avatar-swatch', c.emoji) as HTMLButtonElement;
    b.style.fontSize = '34px';
    b.setAttribute('aria-label', c.voice);
    if (app.save.data.avatar.charm === c.id) b.classList.add('picked');
    b.onclick = () => {
      app.save.update((d) => { d.avatar.charm = c.id; d.avatar.claimed = true; });
      app.save.saveNow();
      for (const x of [...rowCharm.children]) x.classList.remove('picked');
      b.classList.add('picked');
      app.audio.sfx('pop');
      repaint();
      say(c.voice);
    };
    rowCharm.append(b);
  }

  const done = el('button', 'big-btn', '✓') as HTMLButtonElement;
  done.setAttribute('aria-label', 'تم');
  done.onclick = () => {
    app.audio.sfx('win');
    bus.emit('nova:mood', { mood: 'celebrate' as const });
    say('هذه أنا! شكراً!');
    overlay.remove();
  };

  card.append(prev, rowTint, rowCharm, done);
  overlay.append(card);
  // tap outside closes (child can never get stuck)
  overlay.addEventListener('pointerdown', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.body.append(overlay);
  say(app.save.data.avatar.claimed ? 'هذه أنا! غيّر شكلي كما تحب!' : 'المس لوناً! هذه نوفا خاصتك!');
}
