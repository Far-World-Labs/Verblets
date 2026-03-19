import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../config/index.js', () => ({
  get: vi.fn(),
}));

vi.mock('../version/index.js', () => ({
  default: '3.2.1',
}));

const { get: configGet } = await import('../config/index.js');
const { observeApplication, observeProviders } = await import('./observers.js');

describe('context observers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('observeApplication', () => {
    it('returns environment from NODE_ENV', () => {
      configGet.mockImplementation((key) => {
        if (key === 'NODE_ENV') return 'production';
        return undefined;
      });

      const result = observeApplication();
      expect(result.environment).toBe('production');
      expect(result.key).toBe('default');
    });

    it('defaults environment to development when NODE_ENV is unset', () => {
      configGet.mockReturnValue(undefined);

      const result = observeApplication();
      expect(result.environment).toBe('development');
    });

    it('defaults environment to development when NODE_ENV is empty', () => {
      configGet.mockImplementation((key) => {
        if (key === 'NODE_ENV') return '';
        return undefined;
      });

      const result = observeApplication();
      expect(result.environment).toBe('development');
    });

    it('returns library version', () => {
      configGet.mockReturnValue(undefined);

      const result = observeApplication();
      expect(result.version).toBe('3.2.1');
    });
  });

  describe('observeProviders', () => {
    it('detects provider API key presence', () => {
      configGet.mockImplementation((key) => {
        const values = {
          OPENAI_API_KEY: 'sk-test',
          ANTHROPIC_API_KEY: undefined,
          OPENWEBUI_API_KEY: 'sk-owui',
          REDIS_HOST: undefined,
        };
        return values[key];
      });

      const result = observeProviders();
      expect(result.openai).toBe(true);
      expect(result.anthropic).toBe(false);
      expect(result.openwebui).toBe(true);
    });

    it('derives embeddingAvailable from openwebui presence', () => {
      configGet.mockImplementation((key) => {
        if (key === 'OPENWEBUI_API_KEY') return 'sk-owui';
        return undefined;
      });

      const result = observeProviders();
      expect(result.embeddingAvailable).toBe(true);
    });

    it('embeddingAvailable is false without openwebui', () => {
      configGet.mockReturnValue(undefined);

      const result = observeProviders();
      expect(result.embeddingAvailable).toBe(false);
    });

    it('detects redis configuration', () => {
      configGet.mockImplementation((key) => {
        if (key === 'REDIS_HOST') return 'localhost';
        return undefined;
      });

      const result = observeProviders();
      expect(result.redisConfigured).toBe(true);
    });

    it('returns all expected attributes with default key', () => {
      configGet.mockReturnValue(undefined);

      const result = observeProviders();
      expect(result.key).toBe('default');
      expect(result).toHaveProperty('openai');
      expect(result).toHaveProperty('anthropic');
      expect(result).toHaveProperty('openwebui');
      expect(result).toHaveProperty('embeddingAvailable');
      expect(result).toHaveProperty('redisConfigured');
    });
  });
});
