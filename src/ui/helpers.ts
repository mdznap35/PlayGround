/* UI helpers: big touch-friendly builders, confetti, stars. */

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, cls = '', html = '',
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

export function topbar(opts: { onHome: () => void; coins: number; extra?: HTMLElement[] }): HTMLElement {
  const bar = el('div', 'topbar');
  const home = el('button', 'home-btn', '🏠');
  home.setAttribute('aria-label', 'العالم');
  home.onclick = opts.onHome;
  const spacer = el('div', 'spacer');
  const purse = el('div', 'purse', `🪙 <span>${opts.coins}</span>`);
  bar.append(home, spacer);
  for (const x of opts.extra ?? []) bar.append(x);
  bar.append(purse);
  return bar;
}

export function title(text: string, lead = ''): HTMLElement {
  const wrap = el('div');
  wrap.style.textAlign = 'center';
  wrap.append(el('h1', 'title', text));
  if (lead) wrap.append(el('p', 'lead', lead));
  return wrap;
}

export function bigButton(label: string, cls = '', onclick?: () => void): HTMLButtonElement {
  const b = el('button', `big-btn ${cls}`, label) as HTMLButtonElement;
  if (onclick) b.onclick = onclick;
  return b;
}

export function choiceRow(): HTMLElement {
  return el('div', 'choice-row');
}

export function choice(emoji: string, label: string, onclick: () => void): HTMLButtonElement {
  const b = el('button', 'choice', `${emoji}<small>${label}</small>`) as HTMLButtonElement;
  b.onclick = onclick;
  return b;
}

export function panel(): HTMLElement {
  return el('div', 'panel');
}

export function stage(light = false): HTMLElement {
  return el('div', light ? 'stage light' : 'stage');
}

/** Confetti burst on a canvas overlay — cheap, pooled, no libraries. */
export function confetti(): void {
  if (document.body.classList.contains('reduce-motion')) return;
  const c = document.createElement('canvas');
  c.style.cssText = 'position:fixed;inset:0;z-index:90;pointer-events:none;';
  c.width = window.innerWidth; c.height = window.innerHeight;
  document.body.append(c);
  const ctx = c.getContext('2d')!;
  const colors = ['#ffc94d', '#5fd68a', '#ff7a7a', '#7fd4ff', '#b3a8ff'];
  const parts = Array.from({ length: 90 }, () => ({
    x: window.innerWidth / 2 + (Math.random() - 0.5) * 200,
    y: window.innerHeight * 0.35,
    vx: (Math.random() - 0.5) * 9,
    vy: -Math.random() * 9 - 2,
    s: Math.random() * 8 + 4,
    c: colors[(Math.random() * colors.length) | 0],
    r: Math.random() * Math.PI,
  }));
  let frames = 0;
  const tick = () => {
    ctx.clearRect(0, 0, c.width, c.height);
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.35; p.r += 0.1;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
      ctx.restore();
    }
    if (++frames < 90) requestAnimationFrame(tick);
    else c.remove();
  };
  tick();
}

/** Starry background for cinematic / space scenes. */
export function stars(host: HTMLElement, n = 70): void {
  const wrap = el('div', 'stars');
  for (let i = 0; i < n; i++) {
    const s = el('div', 'star');
    const sz = Math.random() * 3 + 1;
    s.style.cssText = `width:${sz}px;height:${sz}px;top:${Math.random() * 100}%;left:${Math.random() * 100}%;animation-delay:${(Math.random() * 2.4).toFixed(2)}s;`;
    wrap.append(s);
  }
  host.append(wrap);
}
