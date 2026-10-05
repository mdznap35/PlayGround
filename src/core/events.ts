/* Tiny typed event bus — decouples systems without a framework. */

export type Handler<T = unknown> = (payload: T) => void;

export class Bus {
  private map = new Map<string, Set<Handler>>();

  on<T>(event: string, fn: Handler<T>): () => void {
    let set = this.map.get(event);
    if (!set) { set = new Set(); this.map.set(event, set); }
    set.add(fn as Handler);
    return () => { set!.delete(fn as Handler); };
  }

  emit<T>(event: string, payload: T): void {
    const set = this.map.get(event);
    if (!set) return;
    for (const fn of [...set]) {
      try { (fn as Handler<T>)(payload); } catch (e) { console.error('[bus]', event, e); }
    }
  }
}

export const bus = new Bus();
