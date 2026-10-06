import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import { existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SoundBank } from '../src/core/sound';
import { ambienceFor } from '../src/core/ambience';
import { MemoryBlobStore, openBlobStore } from '../src/core/blobstore';
import { bucketWeatherCode, fetchWeather, fixtureWeather, parseCurrentWeather } from '../src/services/world-data';
import { GatewayAI, NoopAI } from '../src/services/ai';
import { RecordedFileBackend } from '../src/services/voice-pack';
import { MoodController } from '../src/ui/moods';

describe('sound bank (offline-safe, synth fallback)', () => {
  const synth = { sfx: vi.fn() } as unknown as import('../src/core/audio').AudioManager;
  it('falls back to synth when no bank files are registered', async () => {
    const bank = new SoundBank(synth);
    expect(await bank.play('tap')).toBe('synth');
    expect(synth.sfx).toHaveBeenCalledWith('tap');
  });
  it('ambience never throws and tracks state (silent no-op without audio HW)', async () => {
    const bank = new SoundBank(synth);
    await expect(bank.ambience('garden')).resolves.toBeDefined();
    bank.stopAmbience();
    expect(bank.activeAmbience).toBeNull();
  });
  it('volumes clamp, persist in-session, and mute silences playback', async () => {
    const bank = new SoundBank(synth);
    bank.setSfxVolume(2);
    bank.setAmbienceVolume(-1);
    expect(bank.sfxVolume).toBe(1);
    expect(bank.ambienceVolume).toBe(0);
    await bank.setMuted(true);
    expect(bank.muted).toBe(true);
    expect(await bank.play('tap')).toBe('muted');
    await bank.setMuted(false);
    expect(await bank.play('tap')).toBe('synth'); // node: no audio HW → synth
  });
  it('routes ambience only to appropriate zones (sea bed stays unwired)', () => {
    expect(ambienceFor('world')).toBe('garden');
    expect(ambienceFor('explorer', 'garden')).toBe('garden');
    expect(ambienceFor('explorer', 'fly')).toBeNull();
    expect(ambienceFor('lab')).toBeNull();
    expect(ambienceFor('music')).toBeNull();
    expect(ambienceFor('parents')).toBeNull();
  });
  it('every bank SFX file exists on disk (no missing assets)', () => {
    const root = join(dirname(fileURLToPath(import.meta.url)), '..');
    const dir = join(root, 'public', 'audio', 'sfx');
    const expected = ['tap', 'pop', 'good', 'win', 'bad', 'coin', 'build', 'step'];
    for (const name of expected) {
      expect(existsSync(join(dir, `${name}.ogg`)), `${name}.ogg missing`).toBe(true);
    }
    expect(readdirSync(dir).filter((f) => f.endsWith('.ogg'))).toHaveLength(8);
  });
  it('ambience beds exist on disk', () => {
    const root = join(dirname(fileURLToPath(import.meta.url)), '..');
    for (const f of ['dawn-chorus.ogg', 'pebble-beach.ogg']) {
      expect(existsSync(join(root, 'public', 'audio', 'ambience', f))).toBe(true);
    }
  });
  it('tryPlay is sync, safe, and honors mute (node: no howler → false)', () => {
    const bank = new SoundBank(synth);
    expect(bank.tryPlay('tap')).toBe(false);
    expect(bank.tryPlay('splash')).toBe(false); // no file by design
    expect(() => bank.prime()).not.toThrow();
  });
  it('bank honors a handling bank: AudioManager skips synth (no double-play)', async () => {
    const { AudioManager } = await import('../src/core/audio');
    const audio = new AudioManager();
    audio.settings = { voice: false, voiceRate: 1, music: false, sfx: true, reduceMotion: false, aiAssist: false };
    const played: string[] = [];
    audio.bank = { tryPlay: (n) => { played.push(n); return true; } };
    expect(() => audio.sfx('tap')).not.toThrow();
    expect(played).toEqual(['tap']);
  });
  it('AudioManager falls back safely when bank declines (node: no AudioContext)', async () => {
    const { AudioManager } = await import('../src/core/audio');
    const audio = new AudioManager();
    audio.settings = { voice: false, voiceRate: 1, music: false, sfx: true, reduceMotion: false, aiAssist: false };
    audio.bank = { tryPlay: () => false };
    expect(() => audio.sfx('tap')).not.toThrow();
    audio.bank = null;
    expect(() => audio.sfx('tap')).not.toThrow();
  });
  it('AudioManager respects the sfx setting before consulting the bank', async () => {
    const { AudioManager } = await import('../src/core/audio');
    const audio = new AudioManager();
    audio.settings = { voice: false, voiceRate: 1, music: false, sfx: false, reduceMotion: false, aiAssist: false };
    let consulted = false;
    audio.bank = { tryPlay: () => { consulted = true; return true; } };
    audio.sfx('tap');
    expect(consulted).toBe(false);
  });
});

describe('nova moods (pure controller, auto-revert, no DOM)', () => {
  it('starts idle, notifies, and auto-reverts to idle', async () => {
    const mc = new MoodController(15);
    const seen: string[] = [];
    const off = mc.onChange((m) => seen.push(m));
    expect(mc.current).toBe('idle');
    mc.setMood('celebrate');
    expect(mc.current).toBe('celebrate');
    await new Promise((r) => setTimeout(r, 40));
    expect(mc.current).toBe('idle');
    expect(seen).toEqual(['celebrate', 'idle']);
    off();
    mc.destroy();
  });
  it('ignores unknown moods and survives throwing listeners', () => {
    const mc = new MoodController(10);
    mc.onChange(() => { throw new Error('listener bug'); });
    expect(() => mc.setMood('celebrate')).not.toThrow();
    mc.setMood('party' as never);
    expect(mc.current).toBe('celebrate');
    mc.destroy();
  });
});

describe('blob store (dexie with memory fallback)', () => {
  it('memory store round-trips', async () => {
    const s = new MemoryBlobStore();
    await s.put('k', 'v');
    expect(await s.get('k')).toBe('v');
    expect(await s.keys()).toEqual(['k']);
    await s.delete('k');
    expect(await s.get('k')).toBeUndefined();
  });
  it('openBlobStore prefers dexie under fake-indexeddb', async () => {
    const s = await openBlobStore();
    expect(s.backend).toBe('dexie');
    await s.put('draw-1', 'data-url');
    expect(await s.get('draw-1')).toBe('data-url');
    await s.delete('draw-1');
  });
});

describe('world data (strict parse + fixture fallback)', () => {
  it('buckets WMO codes to kid concepts', () => {
    expect(bucketWeatherCode(0)).toBe('sun');
    expect(bucketWeatherCode(61)).toBe('rain');
    expect(bucketWeatherCode(71)).toBe('snow');
    expect(bucketWeatherCode(96)).toBe('storm');
    expect(bucketWeatherCode('x')).toBe('cloud');
  });
  it('parses the bundled Open-Meteo fixture', () => {
    const w = fixtureWeather();
    expect(w.tempC).toBeCloseTo(19.5);
    expect(w.place).toBe('fixture');
  });
  it('rejects shape drift', () => {
    expect(parseCurrentWeather({ current: { temperature_2m: 'hot' } }, 'p')).toBeNull();
    expect(parseCurrentWeather({}, 'p')).toBeNull();
    expect(parseCurrentWeather(null, 'p')).toBeNull();
  });
  it('falls back to fixture when fetch fails (offline contract)', async () => {
    const failing = async () => { throw new Error('offline'); };
    const r = await fetchWeather('https://x', 0, 0, 'home', 10);
    expect(r.live).toBe(false);
    expect(r.weather.place).toBe('home');
    void failing;
  });
});

describe('ai service (noop default, gateway scaffold)', () => {
  it('noop is deterministic and offline', async () => {
    const ai = new NoopAI();
    expect(ai.available()).toBe(false);
    const r = await ai.run({ op: 'explain', input: 'why sky', lang: 'ar', audience: 'kid6' });
    expect(r.ok && r.fromFallback && r.text.length > 0).toBe(true);
  });
  it('gateway without endpoint falls back without network', async () => {
    const ai = new GatewayAI('', async () => { throw new Error('must not be called'); });
    expect(ai.available()).toBe(false);
    const r = await ai.run({ op: 'storyIdea', input: 'x', lang: 'en', audience: 'kid6' });
    expect(r.fromFallback).toBe(true);
  });
  it('gateway shapes an OpenAI-compatible request and validates the reply', async () => {
    const seen: string[] = [];
    const ai = new GatewayAI('https://gw.example/v1', async (input, init) => {
      seen.push(input, JSON.stringify(init));
      return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: '  hello little explorer  ' } }] }) };
    });
    const r = await ai.run({ op: 'explain', input: 'rain', lang: 'en', audience: 'kid6' });
    expect(r).toEqual({ ok: true, text: 'hello little explorer', fromFallback: false });
    expect(seen[0]).toContain('/chat/completions');
    expect(seen[1]).not.toMatch(/Authorization|api[_-]?key/i);
  });
  it('gateway falls back on bad status or empty reply', async () => {
    const bad = new GatewayAI('https://gw.example', async () => ({ ok: false, status: 500, json: async () => ({}) }));
    expect((await bad.run({ op: 'explain', input: 'x', lang: 'ar', audience: 'kid6' })).fromFallback).toBe(true);
  });
});

describe('recorded voice backend (line-addressed, fallback-safe)', () => {
  const fallback = { speak: vi.fn(), stop: vi.fn(), available: () => true, id: 'fb' };
  const pack = { pack: 'core-ar', lang: 'ar', voice: 'noura', license: 'produced', lines: { hello: 'hello.ogg' } } as const;
  it('exposes coverage and delegates unknown lines', () => {
    const b = new RecordedFileBackend({ ...pack, lines: { ...pack.lines } }, './audio/voices/core-ar', fallback);
    expect(b.has('hello')).toBe(true);
    expect(b.lineCount).toBe(1);
    b.speak('full text path', 'ar', 1);
    expect(fallback.speak).toHaveBeenCalledWith('full text path', 'ar', 1);
  });
  it('never throws in environments without Audio (tests/SSR)', () => {
    const b = new RecordedFileBackend({ ...pack, lines: { ...pack.lines } }, './audio/voices/core-ar', fallback);
    expect(() => b.speakLine('hello', 'مرحبا', 'ar', 1)).not.toThrow();
    expect(() => b.stop()).not.toThrow();
  });
});
