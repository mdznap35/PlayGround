/* WorldDataService: keyless public science data with strict validation and a
   bundled fixture fallback. OFFLINE CONTRACT: every method resolves to either
   live data or the local fixture — never rejects into the UI. The fixture in
   assets/data/open-meteo-sample.json doubles as the test vector. */

import openMeteoSample from '../../assets/data/open-meteo-sample.json';

export interface KidWeather {
  tempC: number;
  code: 'sun' | 'cloud' | 'rain' | 'snow' | 'storm';
  windKph: number;
  place: string;
}

/** WMO weather-code → tiny kid-readable bucket. Pure + tested. */
export function bucketWeatherCode(code: unknown): KidWeather['code'] {
  const n = typeof code === 'number' ? code : -1;
  if (n === 0 || n === 1) return 'sun';
  if (n === 2 || n === 3 || n === 45 || n === 48) return 'cloud';
  if ((n >= 51 && n <= 67) || (n >= 80 && n <= 82)) return 'rain';
  if ((n >= 71 && n <= 77) || n === 85 || n === 86) return 'snow';
  if (n >= 95) return 'storm';
  return 'cloud';
}

/** Strict parse of an Open-Meteo `current` payload. Returns null on any shape drift. */
export function parseCurrentWeather(json: unknown, place: string): KidWeather | null {
  try {
    const cur = (json as { current?: Record<string, unknown> })?.current;
    if (!cur || typeof cur !== 'object') return null;
    const tempC = Number(cur['temperature_2m']);
    const windKph = Number(cur['wind_speed_10m']);
    if (!Number.isFinite(tempC) || !Number.isFinite(windKph)) return null;
    return { tempC, windKph, code: bucketWeatherCode(cur['weather_code']), place };
  } catch {
    return null;
  }
}

export function fixtureWeather(): KidWeather {
  return parseCurrentWeather(openMeteoSample, 'fixture') ?? { tempC: 20, code: 'sun', windKph: 5, place: 'fixture' };
}

export async function fetchWeather(
  endpoint: string,
  lat: number,
  lon: number,
  place: string,
  timeoutMs = 6000,
): Promise<{ live: boolean; weather: KidWeather }> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const url = `${endpoint}?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto`;
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) throw new Error(`weather ${res.status}`);
    const parsed = parseCurrentWeather(await res.json(), place);
    if (!parsed) throw new Error('weather shape');
    return { live: true, weather: parsed };
  } catch {
    return { live: false, weather: { ...fixtureWeather(), place } };
  }
}
