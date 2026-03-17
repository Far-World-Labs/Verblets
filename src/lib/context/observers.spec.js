import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../config/index.js', () => ({
  get: vi.fn(),
}));

vi.mock('../version/index.js', () => ({
  default: '3.2.1',
}));

vi.mock('../../services/llm-model/index.js', () => ({
  sensitivityAvailable: vi.fn(),
}));

const { get: configGet } = await import('../config/index.js');
const { sensitivityAvailable } = await import('../../services/llm-model/index.js');
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
      sensitivityAvailable.mockReturnValue({ available: false, fast: false, good: false });

      const result = observeProviders();
      expect(result.openai).toBe(true);
      expect(result.anthropic).toBe(false);
      expect(result.openwebui).toBe(true);
    });

    it('detects full sensitivity capability (fast + good)', () => {
      configGet.mockReturnValue(undefined);
      sensitivityAvailable.mockReturnValue({ available: true, fast: true, good: true });

      const result = observeProviders();
      expect(result.sensitivityCapable).toBe('full');
    });

    it('detects fast-only sensitivity capability', () => {
      configGet.mockReturnValue(undefined);
      sensitivityAvailable.mockReturnValue({ available: true, fast: true, good: false });

      const result = observeProviders();
      expect(result.sensitivityCapable).toBe('fast-only');
    });

    it('detects no sensitivity capability', () => {
      configGet.mockReturnValue(undefined);
      sensitivityAvailable.mockReturnValue({ available: false, fast: false, good: false });

      const result = observeProviders();
      expect(result.sensitivityCapable).toBe('none');
    });

    it('derives embeddingAvailable from openwebui presence', () => {
      configGet.mockImplementation((key) => {
        if (key === 'OPENWEBUI_API_KEY') return 'sk-owui';
        return undefined;
      });
      sensitivityAvailable.mockReturnValue({ available: false, fast: false, good: false });

      const result = observeProviders();
      expect(result.embeddingAvailable).toBe(true);
    });

    it('embeddingAvailable is false without openwebui', () => {
      configGet.mockReturnValue(undefined);
      sensitivityAvailable.mockReturnValue({ available: false, fast: false, good: false });

      const result = observeProviders();
      expect(result.embeddingAvailable).toBe(false);
    });

    it('detects redis configuration', () => {
      configGet.mockImplementation((key) => {
        if (key === 'REDIS_HOST') return 'localhost';
        return undefined;
      });
      sensitivityAvailable.mockReturnValue({ available: false, fast: false, good: false });

      const result = observeProviders();
      expect(result.redisConfigured).toBe(true);
    });

    it('returns all expected attributes with default key', () => {
      configGet.mockReturnValue(undefined);
      sensitivityAvailable.mockReturnValue({ available: false, fast: false, good: false });

      const result = observeProviders();
      expect(result.key).toBe('default');
      expect(result).toHaveProperty('openai');
      expect(result).toHaveProperty('anthropic');
      expect(result).toHaveProperty('openwebui');
      expect(result).toHaveProperty('sensitivityCapable');
      expect(result).toHaveProperty('embeddingAvailable');
      expect(result).toHaveProperty('redisConfigured');
    });
  });
});
