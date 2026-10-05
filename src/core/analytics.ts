/* Analytics: local-only, minimal, no PII. Aggregates feed the parent dashboard. */

export interface AnalyticEvent {
  name: string;
  at: number;
  data?: Record<string, unknown>;
}

const MAX = 300;

export class Analytics {
  private log: AnalyticEvent[] = [];

  track(name: string, data?: Record<string, unknown>): void {
    this.log.push({ name, at: Date.now(), data });
    if (this.log.length > MAX) this.log.splice(0, this.log.length - MAX);
  }

  count(name: string): number {
    return this.log.filter((e) => e.name === name).length;
  }

  /** minutes played today (approx from session markers) */
  sessionsToday(): number {
    const day = new Date().toDateString();
    return this.log.filter((e) => e.name === 'session:start' && new Date(e.at).toDateString() === day).length;
  }
}
