import { beforeEach, describe, expect, it, vi } from 'vitest';
import filter, { mapStrictness } from './index.js';
import listBatch from '../../verblets/list-batch/index.js';

vi.mock('../../verblets/list-batch/index.js', () => ({
  default: vi.fn(async (items) => {
    if (items.includes('FAIL')) throw new Error('fail');
    return items.map((item) => (item.includes('a') ? 'yes' : 'no'));
  }),
  ListStyle: { AUTO: 'auto', XML: 'xml', NEWLINE: 'newline' },
  determineStyle: vi.fn(() => 'newline'),
}));

vi.mock('../../lib/text-batch/index.js', () => ({
  default: vi.fn((items, config) => {
    const batchSize = config?.batchSize || 10;
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push({ items: items.slice(i, i + batchSize), skip: false });
    }
    return batches;
  }),
}));

vi.mock('../../lib/retry/index.js', () => {
  const mock = vi.fn(async (fn) => {
    try {
      return await fn();
    } catch {
      // Retry once on failure
      return await fn();
    }
  });
  return { default: mock };
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('filter', () => {
  it('filters items in batches', async () => {
    const result = await filter(['a', 'b', 'c'], 'a', { batchSize: 2 });
    expect(result).toStrictEqual(['a']);
    expect(listBatch).toHaveBeenCalledTimes(2);
  });

  describe('filter.with', () => {
    it('returns a function', () => {
      const fn = filter.with('contains letter a');
      expect(typeof fn).toBe('function');
    });

    it('returns true for matching items', async () => {
      const fn = filter.with('contains letter a');
      const result = await fn('apple');
      expect(result).toBe(true);
    });

    it('returns false for non-matching items', async () => {
      const fn = filter.with('contains letter a');
      const result = await fn('xyz');
      expect(result).toBe(false);
    });
  });

  it('forwards lifecycle logger to listBatch', async () => {
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
    await filter(['apple', 'box'], 'contains a', { batchSize: 10, logger });
    const callConfig = listBatch.mock.calls[0][2];
    expect(callConfig.logger.logEvent).toBeTypeOf('function');
    expect(callConfig.logger.info).toBe(logger.info);
  });

  it('retries failed batches', async () => {
    let call = 0;
    listBatch.mockImplementation(async (items) => {
      call += 1;
      if (call === 1) throw new Error('fail');
      return items.map((item) => (item.includes('a') ? 'yes' : 'no'));
    });

    const result = await filter(['FAIL', 'a', 'b'], 'a', {
      batchSize: 2,
      maxAttempts: 2,
    });
    expect(result).toStrictEqual(['a']);
    expect(listBatch).toHaveBeenCalledTimes(3);
  });

  it('includes strictness guidance in prompt when set to low', async () => {
    await filter(['apple', 'box'], 'contains a', { batchSize: 10, strictness: 'low' });

    const [, prompt] = listBatch.mock.calls[0];
    expect(prompt).toContain('borderline-handling');
    expect(prompt).toContain('err on the side of inclusion');
  });

  it('includes strictness guidance in prompt when set to high', async () => {
    await filter(['apple', 'box'], 'contains a', { batchSize: 10, strictness: 'high' });

    const [, prompt] = listBatch.mock.calls[0];
    expect(prompt).toContain('borderline-handling');
    expect(prompt).toContain('err on the side of exclusion');
  });

  it('omits strictness guidance when not specified', async () => {
    await filter(['apple', 'box'], 'contains a', { batchSize: 10 });

    const [, prompt] = listBatch.mock.calls[0];
    expect(prompt).not.toContain('borderline-handling');
  });
});

describe('mapStrictness', () => {
  it('returns default config for undefined', () => {
    const result = mapStrictness(undefined);
    expect(result).toStrictEqual({ guidance: undefined, errorPosture: 'strict' });
  });

  it('returns inclusion guidance and resilient posture for low', () => {
    const result = mapStrictness('low');
    expect(result.guidance).toContain('inclusion');
    expect(result.errorPosture).toBe('resilient');
  });

  it('returns default config for med', () => {
    const result = mapStrictness('med');
    expect(result).toStrictEqual({ guidance: undefined, errorPosture: 'strict' });
  });

  it('returns exclusion guidance and strict posture for high', () => {
    const result = mapStrictness('high');
    expect(result.guidance).toContain('exclusion');
    expect(result.errorPosture).toBe('strict');
  });

  it('returns default config for unknown string', () => {
    const result = mapStrictness('medium');
    expect(result).toStrictEqual({ guidance: undefined, errorPosture: 'strict' });
  });

  it('passes through object values', () => {
    const custom = { guidance: 'custom', errorPosture: 'resilient' };
    expect(mapStrictness(custom)).toBe(custom);
  });
});
