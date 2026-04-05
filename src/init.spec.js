import { describe, it, expect, vi, beforeEach } from 'vitest';
import init from './init.js';
import * as config from './lib/config/index.js';
import modelService from './services/llm-model/index.js';
import { setBasePolicy } from './lib/llm/index.js';
import { getClient } from './services/redis/index.js';

vi.mock('./lib/llm/index.js', async (importOriginal) => {
  const original = await importOriginal();
  return { ...original, setBasePolicy: vi.fn() };
});

describe('init()', () => {
  beforeEach(() => {
    config.setRuntimeProvider(undefined);
  });

  it('returns config and modelService', () => {
    const result = init();
    expect(result.config).toBeDefined();
    expect(result.config.get).toBe(config.get);
    expect(result.modelService).toBe(modelService);
  });

  it('wires runtimeProvider into config', () => {
    const provider = { get: vi.fn() };
    init({ runtimeProvider: provider });
    expect(config.getRuntimeProvider()).toBe(provider);
  });

  it('wires redis client via setClient', async () => {
    const mockRedis = { get: vi.fn(), set: vi.fn() };
    init({ redis: mockRedis });
    const client = await getClient();
    expect(client).toBe(mockRedis);
  });

  it('extends catalog via models (addModels)', () => {
    const spy = vi.spyOn(modelService, 'addModels');
    const models = {
      'my-llama': { maxContextWindow: 8192, maxOutputTokens: 4096, requestTimeout: 1000 },
    };
    init({ models });
    expect(spy).toHaveBeenCalledWith(models);
    spy.mockRestore();
  });

  it('overrides negotiation rules via rules (setRules)', () => {
    const spy = vi.spyOn(modelService, 'setRules');
    const rules = [{ match: { reasoning: true }, use: 'my-llama' }, { use: 'gpt-4.1-mini' }];
    init({ rules });
    expect(spy).toHaveBeenCalledWith(rules);
    spy.mockRestore();
  });

  it('is idempotent — can be called multiple times', () => {
    const p1 = { get: vi.fn() };
    const p2 = { get: vi.fn() };
    init({ runtimeProvider: p1 });
    expect(config.getRuntimeProvider()).toBe(p1);
    init({ runtimeProvider: p2 });
    expect(config.getRuntimeProvider()).toBe(p2);
  });

  it('applies base policy via setBasePolicy', () => {
    const policy = { temperature: () => 0.8 };
    init({ policy });
    expect(setBasePolicy).toHaveBeenCalledWith(policy);
  });

  it('skips undefined options gracefully', () => {
    expect(() =>
      init({ redis: undefined, models: undefined, rules: undefined, policy: undefined })
    ).not.toThrow();
  });

  describe('validation', () => {
    it('throws when no API keys are configured', () => {
      vi.stubEnv('OPENAI_API_KEY', '');
      vi.stubEnv('ANTHROPIC_API_KEY', '');
      delete process.env.OPENAI_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;
      expect(() => init()).toThrow('At least one of OPENAI_API_KEY, ANTHROPIC_API_KEY');
    });

    it('passes with a valid API key', () => {
      vi.stubEnv('OPENAI_API_KEY', 'sk-test');
      expect(() => init()).not.toThrow();
    });

    it('throws requiredIf error when OPENWEBUI_API_KEY set without URL', () => {
      vi.stubEnv('OPENAI_API_KEY', 'sk-test');
      vi.stubEnv('OPENWEBUI_API_KEY', 'sk-owui');
      delete process.env.OPENWEBUI_API_URL;
      expect(() => init()).toThrow('OPENWEBUI_API_URL is required when OPENWEBUI_API_KEY is set');
    });

    it('validates before wiring — bad config does not partially configure', () => {
      vi.stubEnv('OPENAI_API_KEY', '');
      vi.stubEnv('ANTHROPIC_API_KEY', '');
      delete process.env.OPENAI_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;
      const provider = { get: vi.fn() };
      expect(() => init({ runtimeProvider: provider })).toThrow('Config validation failed');
      expect(config.getRuntimeProvider()).not.toBe(provider);
    });
  });
});
