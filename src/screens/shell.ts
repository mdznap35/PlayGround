/* Screen contract: every screen mounts into #app root and returns cleanup. */

import type { App } from '../core/app';

export type Screen = (app: App, root: HTMLElement, param?: string) => void;

export function clear(root: HTMLElement): void {
  root.innerHTML = '';
  const s = document.createElement('div');
  s.className = 'screen';
  root.append(s);
}

export function mountScreen(root: HTMLElement): HTMLElement {
  root.innerHTML = '';
  const s = document.createElement('div');
  s.className = 'screen';
  root.append(s);
  return s;
}
