/* AIService: optional enhancement layer. HARD RULES (see docs/api-integrations.md):
   - The child experience NEVER depends on a remote model; NoopAI is the default.
   - No secrets in the client: the browser talks only to a configured gateway
     endpoint (VITE_AI_ENDPOINT); keys live on that gateway, never here.
   - No free chat for children: only typed, validated operations (explain,
     parentSummary, storyIdeas) with local fallbacks that are always safe. */

export type AIOp = 'explain' | 'parentSummary' | 'storyIdea';

export interface AIRequest {
  op: AIOp;
  /** Short, structured prompt payload (never raw child input verbatim). */
  input: string;
  lang: 'ar' | 'en';
  /** Max age-appropriateness level: always 'kid6' for child-facing ops. */
  audience: 'kid6' | 'parent';
}

export interface AIResult {
  ok: boolean;
  text: string;
  fromFallback: boolean;
}

export interface AIService {
  readonly id: string;
  available(): boolean;
  run(req: AIRequest): Promise<AIResult>;
}

const FALLBACKS: Record<AIOp, (lang: string) => string> = {
  explain: (l) => (l === 'ar' ? 'لنجرب معاً ونكتشف بأنفسنا!' : "Let's try together and discover!"),
  parentSummary: (l) => (l === 'ar' ? 'لعب طفلك اليوم واستكشف العالم.' : 'Your child played and explored today.'),
  storyIdea: (l) => (l === 'ar' ? 'كان هناك صديق صغير في الغابة…' : 'There was a little friend in the forest…'),
};

/** Default: deterministic local behavior, zero network. */
export class NoopAI implements AIService {
  readonly id = 'noop';
  available(): boolean { return false; }
  async run(req: AIRequest): Promise<AIResult> {
    return { ok: true, text: FALLBACKS[req.op](req.lang), fromFallback: true };
  }
}

export type FetchLike = (input: string, init?: Record<string, unknown>) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

/**
 * OpenAI-compatible chat client (works against OpenRouter or any gateway that
 * speaks /chat/completions). Keys are sent by the GATEWAY, not the browser:
 * this client sends no Authorization header by design.
 */
export class GatewayAI implements AIService {
  readonly id = 'gateway';
  constructor(
    private endpoint: string,
    private fetchFn: FetchLike,
    private model = 'auto',
    private timeoutMs = 12000,
  ) {}

  available(): boolean { return this.endpoint.length > 0; }

  async run(req: AIRequest): Promise<AIResult> {
    const fallback: AIResult = { ok: true, text: FALLBACKS[req.op](req.lang), fromFallback: true };
    if (!this.available()) return fallback;
    try {
      const systems: Record<AIOp, string> = {
        explain: 'Explain simply for a 6-year-old. Two short sentences max. Never mention being an AI.',
        parentSummary: 'Summarize play progress for a parent, warm and factual, no diagnosis.',
        storyIdea: 'Give a gentle 2-sentence story seed for a 6-year-old, kind and safe.',
      };
      const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = ctrl ? setTimeout(() => ctrl.abort(), this.timeoutMs) : null;
      const res = await this.fetchFn(`${this.endpoint.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        ...(ctrl ? { signal: ctrl.signal } : {}),
        body: JSON.stringify({
          model: this.model,
          max_tokens: 160,
          temperature: 0.6,
          messages: [
            { role: 'system', content: systems[req.op] },
            { role: 'user', content: `[${req.audience}/${req.lang}] ${req.input}` },
          ],
        }),
      });
      if (!res.ok) return fallback;
      const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      if (timer) clearTimeout(timer);
      const text = body.choices?.[0]?.message?.content?.trim();
      if (!text) return fallback;
      return { ok: true, text: text.slice(0, 600), fromFallback: false };
    } catch {
      return fallback;
    }
  }
}
