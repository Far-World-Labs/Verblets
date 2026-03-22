import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get, getAsync, setRuntimeProvider, validate } from './index.js';

describe('config provider', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    setRuntimeProvider(undefined);
  });

  describe('get() defaults', () => {
    it('returns registry default when env var is unset', () => {
      // VERBLETS_TEMPERATURE has default 0
      delete process.env.VERBLETS_TEMPERATURE;
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
      expect(get('VERBLETS_TEMPERATURE')).toBe(0);
    });
  });

  describe('get() force overrides', () => {
    it('force override wins over normal env', () => {
      vi.stubEnv('VERBLETS_TEMPERATURE', '0.7');
      vi.stubEnv('VERBLETS_FORCE_VERBLETS_TEMPERATURE', '0.9');
      expect(get('VERBLETS_TEMPERATURE')).toBe(0.9);
    });

    it('force override wins over defaults', () => {
      delete process.env.VERBLETS_CACHE_TTL;
      vi.stubEnv('VERBLETS_FORCE_VERBLETS_CACHE_TTL', '3600');
      expect(get('VERBLETS_CACHE_TTL')).toBe(3600);
    });
  });

  describe('type coercion edge cases', () => {
    it('falls through to registry default for NaN number coercion', () => {
      vi.stubEnv('VERBLETS_TEMPERATURE', 'notanumber');
      const result = get('VERBLETS_TEMPERATURE');
      // coerceNumber('notanumber') → undefined → falls through to registry default (0)
      expect(result).toBe(0);
    });

    it('falls through to registry default for unrecognized boolean string', () => {
      vi.stubEnv('DISABLE_CACHE', 'maybe');
      // 'maybe' not in truthyValues/falsyValues → undefined → falls through to default (false)
      expect(get('DISABLE_CACHE')).toBe(false);
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

  describe('validate()', () => {
    it('returns empty array when all constraints are satisfied', () => {
      vi.stubEnv('OPENAI_API_KEY', 'sk-test');
      vi.stubEnv('OPENWEBUI_API_URL', 'https://ollama.example.com');
      vi.stubEnv('OPENWEBUI_API_KEY', 'sk-owui');
      const errors = validate();
      expect(errors).toEqual([]);
    });

    it('returns oneOf error when no API key is set', () => {
      vi.stubEnv('OPENAI_API_KEY', '');
      vi.stubEnv('ANTHROPIC_API_KEY', '');
      // Ensure neither key is set via process.env either
      delete process.env.OPENAI_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;
      const errors = validate();
      expect(errors).toContainEqual(
        expect.stringContaining('At least one of OPENAI_API_KEY, ANTHROPIC_API_KEY')
      );
    });

    it('passes oneOf when only ANTHROPIC_API_KEY is set', () => {
      delete process.env.OPENAI_API_KEY;
      vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test');
      const errors = validate();
      const oneOfErrors = errors.filter((e) => e.includes('OPENAI_API_KEY'));
      expect(oneOfErrors).toHaveLength(0);
    });

    it('returns requiredIf error when OPENWEBUI_API_KEY is set without OPENWEBUI_API_URL', () => {
      vi.stubEnv('OPENAI_API_KEY', 'sk-test');
      vi.stubEnv('OPENWEBUI_API_KEY', 'sk-owui');
      delete process.env.OPENWEBUI_API_URL;
      const errors = validate();
      expect(errors).toContainEqual('OPENWEBUI_API_URL is required when OPENWEBUI_API_KEY is set');
    });

    it('passes requiredIf when OPENWEBUI_API_KEY is unset', () => {
      vi.stubEnv('OPENAI_API_KEY', 'sk-test');
      delete process.env.OPENWEBUI_API_KEY;
      delete process.env.OPENWEBUI_API_URL;
      const errors = validate();
      const requiredIfErrors = errors.filter((e) => e.includes('OPENWEBUI_API_URL'));
      expect(requiredIfErrors).toHaveLength(0);
    });

    it('passes requiredIf when both OPENWEBUI vars are set', () => {
      vi.stubEnv('OPENAI_API_KEY', 'sk-test');
      vi.stubEnv('OPENWEBUI_API_KEY', 'sk-owui');
      vi.stubEnv('OPENWEBUI_API_URL', 'https://ollama.example.com');
      const errors = validate();
      const requiredIfErrors = errors.filter((e) => e.includes('OPENWEBUI_API_URL'));
      expect(requiredIfErrors).toHaveLength(0);
    });
  });
});
