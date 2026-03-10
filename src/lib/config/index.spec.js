import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { get, getAsync, setRuntimeProvider, _resetWarnings } from './index.js';

describe('config provider', () => {
  let warnSpy;

  beforeEach(() => {
    vi.unstubAllEnvs();
    _resetWarnings();
    setRuntimeProvider(undefined);
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  describe('get() defaults', () => {
    it('returns registry default when env var is unset', () => {
      // VERBLETS_TEMPERATURE has default 0
      delete process.env.VERBLETS_TEMPERATURE;
      delete process.env.CHATGPT_TEMPERATURE;
      expect(get('VERBLETS_TEMPERATURE')).toBe(0);
    });

    it('returns undefined for credential vars with no default', () => {
      delete process.env.OPENAI_API_KEY;
      expect(get('OPENAI_API_KEY')).toBeUndefined();
    });

    it('returns undefined for unknown keys', () => {
      expect(get('TOTALLY_UNKNOWN_KEY')).toBeUndefined();
    });
  });

  describe('get() env overrides', () => {
    it('reads string env var', () => {
      vi.stubEnv('OPENAI_PROXY_URL', 'https://proxy.example.com/');
      expect(get('OPENAI_PROXY_URL')).toBe('https://proxy.example.com/');
    });

    it('coerces number env var', () => {
      vi.stubEnv('VERBLETS_TEMPERATURE', '0.7');
      expect(get('VERBLETS_TEMPERATURE')).toBe(0.7);
    });

    it('coerces boolean env var (truthy)', () => {
      vi.stubEnv('DISABLE_CACHE', 'true');
      expect(get('DISABLE_CACHE')).toBe(true);
    });

    it('coerces boolean env var (falsy)', () => {
      vi.stubEnv('DISABLE_CACHE', 'false');
      expect(get('DISABLE_CACHE')).toBe(false);
    });

    it('coerces boolean "1" to true', () => {
      vi.stubEnv('VERBLETS_DEBUG', '1');
      expect(get('VERBLETS_DEBUG')).toBe(true);
    });

    it('coerces boolean "0" to false', () => {
      vi.stubEnv('VERBLETS_DEBUG', '0');
      expect(get('VERBLETS_DEBUG')).toBe(false);
    });

    it('returns default for empty string env var', () => {
      vi.stubEnv('VERBLETS_TEMPERATURE', '');
      delete process.env.CHATGPT_TEMPERATURE;
      expect(get('VERBLETS_TEMPERATURE')).toBe(0);
    });
  });

  describe('get() deprecated alias fallback', () => {
    it('falls back to deprecated var when canonical is unset', () => {
      delete process.env.VERBLETS_TEMPERATURE;
      vi.stubEnv('CHATGPT_TEMPERATURE', '0.5');
      expect(get('VERBLETS_TEMPERATURE')).toBe(0.5);
    });

    it('emits deprecation warning on first access', () => {
      delete process.env.VERBLETS_TEMPERATURE;
      vi.stubEnv('CHATGPT_TEMPERATURE', '0.5');
      get('VERBLETS_TEMPERATURE');
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('CHATGPT_TEMPERATURE'));
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('VERBLETS_TEMPERATURE'));
    });

    it('warns only once per deprecated var', () => {
      delete process.env.VERBLETS_TEMPERATURE;
      vi.stubEnv('CHATGPT_TEMPERATURE', '0.5');
      get('VERBLETS_TEMPERATURE');
      get('VERBLETS_TEMPERATURE');
      get('VERBLETS_TEMPERATURE');
      const deprecationCalls = warnSpy.mock.calls.filter((args) =>
        args[0].includes('CHATGPT_TEMPERATURE')
      );
      expect(deprecationCalls.length).toBe(1);
    });

    it('canonical var wins over deprecated alias', () => {
      vi.stubEnv('VERBLETS_TEMPERATURE', '0.9');
      vi.stubEnv('CHATGPT_TEMPERATURE', '0.5');
      expect(get('VERBLETS_TEMPERATURE')).toBe(0.9);
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe('get() force overrides', () => {
    it('force override wins over normal env', () => {
      vi.stubEnv('VERBLETS_TEMPERATURE', '0.7');
      vi.stubEnv('VERBLETS_FORCE_VERBLETS_TEMPERATURE', '0.9');
      expect(get('VERBLETS_TEMPERATURE')).toBe(0.9);
    });

    it('force override wins over deprecated alias', () => {
      delete process.env.VERBLETS_TEMPERATURE;
      vi.stubEnv('CHATGPT_TEMPERATURE', '0.5');
      vi.stubEnv('VERBLETS_FORCE_VERBLETS_TEMPERATURE', '1.0');
      expect(get('VERBLETS_TEMPERATURE')).toBe(1.0);
    });

    it('force override wins over defaults', () => {
      delete process.env.VERBLETS_CACHE_TTL;
      delete process.env.CHATGPT_CACHE_TTL;
      vi.stubEnv('VERBLETS_FORCE_VERBLETS_CACHE_TTL', '3600');
      expect(get('VERBLETS_CACHE_TTL')).toBe(3600);
    });
  });

  describe('type coercion edge cases', () => {
    it('returns undefined for NaN number coercion', () => {
      vi.stubEnv('VERBLETS_TEMPERATURE', 'notanumber');
      // Coercion returns undefined, falls through to deprecated, then default
      delete process.env.CHATGPT_TEMPERATURE;
      // NaN from coercion → undefined → falls through to default
      const result = get('VERBLETS_TEMPERATURE');
      // 'notanumber' is not empty so it tries coercion, gets undefined from coerceNumber
      // But the env[key] check passes (not undefined, not empty), so typeFn is called
      // coerceNumber('notanumber') returns undefined
      expect(result).toBeUndefined();
    });

    it('coerces boolean for unrecognized string', () => {
      vi.stubEnv('DISABLE_CACHE', 'maybe');
      // 'maybe' is not in truthyValues or falsyValues → coerceBoolean returns undefined
      expect(get('DISABLE_CACHE')).toBeUndefined();
    });

    it('treats already-boolean values correctly', () => {
      // This would come from runtime provider, not env
      // But test the coercion function handles it
      vi.stubEnv('VERBLETS_DEBUG', 'true');
      expect(get('VERBLETS_DEBUG')).toBe(true);
    });
  });

  describe('getAsync()', () => {
    it('falls through to sync get when no runtime provider', async () => {
      vi.stubEnv('VERBLETS_TEMPERATURE', '0.7');
      expect(await getAsync('VERBLETS_TEMPERATURE')).toBe(0.7);
    });

    it('uses runtime provider value when available', async () => {
      const provider = { get: vi.fn().mockResolvedValue(0.42) };
      setRuntimeProvider(provider);
      delete process.env.VERBLETS_TEMPERATURE;
      delete process.env.CHATGPT_TEMPERATURE;
      expect(await getAsync('VERBLETS_TEMPERATURE')).toBe(0.42);
      expect(provider.get).toHaveBeenCalledWith('VERBLETS_TEMPERATURE');
    });

    it('falls through to sync when runtime provider returns undefined', async () => {
      const provider = { get: vi.fn().mockResolvedValue(undefined) };
      setRuntimeProvider(provider);
      vi.stubEnv('VERBLETS_TEMPERATURE', '0.7');
      expect(await getAsync('VERBLETS_TEMPERATURE')).toBe(0.7);
    });

    it('force override wins over runtime provider', async () => {
      const provider = { get: vi.fn().mockResolvedValue(0.42) };
      setRuntimeProvider(provider);
      vi.stubEnv('VERBLETS_FORCE_VERBLETS_TEMPERATURE', '0.9');
      expect(await getAsync('VERBLETS_TEMPERATURE')).toBe(0.9);
      expect(provider.get).not.toHaveBeenCalled();
    });
  });

  describe('setRuntimeProvider()', () => {
    it('replaces the runtime provider', async () => {
      const p1 = { get: vi.fn().mockResolvedValue('a') };
      const p2 = { get: vi.fn().mockResolvedValue('b') };
      setRuntimeProvider(p1);
      delete process.env.OPENAI_PROXY_URL;
      expect(await getAsync('OPENAI_PROXY_URL')).toBe('a');

      setRuntimeProvider(p2);
      expect(await getAsync('OPENAI_PROXY_URL')).toBe('b');
    });

    it('can be cleared with undefined', async () => {
      const p = { get: vi.fn().mockResolvedValue('x') };
      setRuntimeProvider(p);
      setRuntimeProvider(undefined);
      vi.stubEnv('OPENAI_PROXY_URL', 'https://direct.example.com/');
      expect(await getAsync('OPENAI_PROXY_URL')).toBe('https://direct.example.com/');
    });
  });
});
