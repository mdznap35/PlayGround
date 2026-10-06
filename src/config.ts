/* Public-only runtime config. BUILD-TIME values from import.meta.env.
   PUBLIC: safe to ship in client JS (endpoints, flags, public tokens).
   SECRET: NEVER here — server keys live outside the client (see .env.example
   and docs/api-integrations.md). Nothing in this file is sensitive. */

export interface NovaConfig {
  /** Open-Meteo base URL (keyless). Overridable for tests/mirrors. */
  weatherEndpoint: string;
  /** Optional AI gateway base URL (OpenAI-compatible). Empty = AI disabled. */
  aiEndpoint: string;
  /** Optional *public* identifier sent with AI calls (never a secret). */
  aiPublicId: string;
}

function env(name: string, fallback: string): string {
  try {
    const v = (import.meta as unknown as { env?: Record<string, string> }).env?.[name];
    return typeof v === 'string' && v.length > 0 ? v : fallback;
  } catch {
    return fallback;
  }
}

export function loadConfig(): NovaConfig {
  return {
    weatherEndpoint: env('VITE_WEATHER_ENDPOINT', 'https://api.open-meteo.com/v1/forecast'),
    aiEndpoint: env('VITE_AI_ENDPOINT', ''),
    aiPublicId: env('VITE_AI_PUBLIC_ID', 'nova-kids-app'),
  };
}

export const config: NovaConfig = loadConfig();
