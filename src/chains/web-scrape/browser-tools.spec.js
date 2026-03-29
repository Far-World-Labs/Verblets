import { describe, expect, it, vi } from 'vitest';
import { buildStepContext } from './browser-tools.js';

const mockPage = (evaluateResult) => ({
  textContent: vi.fn(async () => 'text'),
  $$eval: vi.fn(async () => []),
  on: vi.fn(),
  evaluate: vi.fn(async () => evaluateResult),
});

const baseParams = {
  url: 'https://example.com',
  screenshotPath: '/tmp/shot.png',
  stepNumber: 0,
  urlIndex: 0,
  previousAction: undefined,
  accumulator: {},
};

describe('buildStepContext', () => {
  it('exposes data from per-URL entry (or empty object)', () => {
    const page = mockPage();
    const ctx = buildStepContext(page, { ...baseParams, data: { token: 'abc', userId: 42 } });
    expect(ctx.data).toEqual({ token: 'abc', userId: 42 });
  });

  it('defaults data to empty object when not provided', () => {
    const page = mockPage();
    const ctx = buildStepContext(page, baseParams);
    expect(ctx.data).toEqual({});
  });

  it('localStorage(key) calls evaluate with the key', async () => {
    const page = mockPage('stored-value');
    const ctx = buildStepContext(page, baseParams);

    const result = await ctx.localStorage('authToken');

    expect(result).toBe('stored-value');
    expect(page.evaluate).toHaveBeenCalledOnce();
    // The first arg is the function, second is the key
    expect(page.evaluate.mock.calls[0][1]).toBe('authToken');
  });

  it('localStorage() without key calls evaluate for all items', async () => {
    const allItems = { theme: 'dark', lang: 'en' };
    const page = mockPage(allItems);
    const ctx = buildStepContext(page, baseParams);

    const result = await ctx.localStorage();

    expect(result).toEqual(allItems);
    expect(page.evaluate).toHaveBeenCalledOnce();
    // No second arg when reading all
    expect(page.evaluate.mock.calls[0]).toHaveLength(1);
  });

  it('localStorage is a function on the context', () => {
    const page = mockPage();
    const ctx = buildStepContext(page, baseParams);
    expect(typeof ctx.localStorage).toBe('function');
  });
});
