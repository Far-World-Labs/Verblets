import { describe, it, expect, vi, beforeEach } from 'vitest';
import init from './init.js';
import * as config from './lib/config/index.js';
describe('init()', () => {
  beforeEach(() => {
    config.setRuntimeProvider(undefined);
  });

  it('returns config with modelService and getRedis', () => {
    const result = init();
    expect(result.config).toBeDefined();
    expect(result.config.modelService).toBeDefined();
    expect(typeof result.config.modelService.getModel).toBe('function');
    expect(typeof result.config.modelService.negotiateModel).toBe('function');
    expect(result.config.getRedis).toBeUndefined();
  });

  it('returns a fresh ModelService instance', () => {
    const result = init();
    expect(result.modelService).toBeDefined();
    expect(typeof result.modelService.getModel).toBe('function');
  });

  it('returns wrapped functions from shared exports', () => {
    const result = init();
    expect(typeof result.filter).toBe('function');
    expect(typeof result.map).toBe('function');
    expect(typeof result.bool).toBe('function');
    expect(typeof result.llm).toBe('function');
    expect(typeof result.score).toBe('function');
  });

  it('two init calls return independent ModelService instances', () => {
    const a = init();
    const b = init();
    expect(a.modelService).not.toBe(b.modelService);
  });

  it('model overrides on one instance do not affect another', () => {
    const a = init({ modelOverrides: { temperature: 0.1 } });
    const b = init({ modelOverrides: { temperature: 0.9 } });
    expect(a.modelService.getGlobalOverride('temperature')).toBe(0.1);
    expect(b.modelService.getGlobalOverride('temperature')).toBe(0.9);
  });

  it('wires runtimeProvider into global config', () => {
    const provider = { get: vi.fn() };
    init({ runtimeProvider: provider });
    expect(config.getRuntimeProvider()).toBe(provider);
  });

  it('provides getRedis when redis client is supplied', () => {
    const mockRedis = { get: vi.fn(), set: vi.fn() };
    const result = init({ redis: mockRedis });
    expect(result.config.getRedis).toBeDefined();
    expect(typeof result.config.getRedis).toBe('function');
  });

  it('getRedis resolves to the supplied redis client', async () => {
    const mockRedis = { get: vi.fn(), set: vi.fn() };
    const result = init({ redis: mockRedis });
    const client = await result.config.getRedis();
    expect(client).toBe(mockRedis);
  });

  it('applies model overrides to the instance ModelService', () => {
    const result = init({ modelOverrides: { temperature: 0.5, modelName: 'gpt-4.1' } });
    expect(result.modelService.getGlobalOverride('temperature')).toBe(0.5);
    expect(result.modelService.getGlobalOverride('modelName')).toBe('gpt-4.1');
  });

  it('returns a context builder', () => {
    const result = init();
    expect(result.context).toBeDefined();
    expect(typeof result.context.setApplication).toBe('function');
  });

  it('passes through non-function exports unchanged', () => {
    const result = init();
    // constants is a plain object — should pass through
    expect(result.constants).toBeDefined();
    expect(typeof result.constants).toBe('object');
  });

  it('skips undefined options gracefully', () => {
    expect(() => init({ redis: undefined, modelOverrides: undefined })).not.toThrow();
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
