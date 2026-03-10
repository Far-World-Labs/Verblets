import { describe, it, expect, vi, beforeEach } from 'vitest';
import init from './init.js';
import * as config from './lib/config/index.js';
import modelService from './services/llm-model/index.js';
import { getClient } from './services/redis/index.js';

describe('init()', () => {
  beforeEach(() => {
    config.setRuntimeProvider(undefined);
  });

  it('returns config and modelService when called with no args', () => {
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

  it('applies model overrides', () => {
    const spy = vi.spyOn(modelService, 'setGlobalOverride');
    init({ modelOverrides: { temperature: 0.5, modelName: 'gpt-4.1' } });
    expect(spy).toHaveBeenCalledWith('temperature', 0.5);
    expect(spy).toHaveBeenCalledWith('modelName', 'gpt-4.1');
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

  it('skips undefined options gracefully', () => {
    expect(() => init({ redis: undefined, modelOverrides: undefined })).not.toThrow();
  });
});
