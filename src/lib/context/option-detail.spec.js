import { describe, it, expect, vi } from 'vitest';
import { getOptionDetail, nameStep } from './option.js';

describe('getOptionDetail', () => {
  it('resolves from policy and reports source', async () => {
    const config = nameStep('filter', {
      policy: { strictness: () => 'high' },
    });

    const { value, detail } = await getOptionDetail('strictness', config, 'low');

    expect(value).toBe('high');
    expect(detail.source).toBe('policy');
    expect(detail.option).toBe('strictness');
    expect(detail.operation).toBe('filter');
    expect(detail.policyReturned).toBe('high');
  });

  it('resolves from direct config when no policy exists', async () => {
    const config = nameStep('score', { strictness: 'med' });

    const { value, detail } = await getOptionDetail('strictness', config, 'low');

    expect(value).toBe('med');
    expect(detail.source).toBe('config');
  });

  it('falls back and reports fallback source', async () => {
    const config = nameStep('join', {});

    const { value, detail } = await getOptionDetail('strictness', config, 'low');

    expect(value).toBe('low');
    expect(detail.source).toBe('fallback');
  });

  it('falls back when policy returns undefined', async () => {
    const config = nameStep('filter', {
      policy: { strictness: () => undefined },
    });

    const { value, detail } = await getOptionDetail('strictness', config, 'med');

    expect(value).toBe('med');
    expect(detail.source).toBe('policy');
    expect(detail.policyReturned).toBe(undefined);
  });

  it('propagates policy errors instead of swallowing them', async () => {
    const config = nameStep('filter', {
      policy: {
        strictness: () => {
          throw new Error('provider down');
        },
      },
    });

    await expect(getOptionDetail('strictness', config, 'med')).rejects.toThrow('provider down');
  });

  it('passes context with operation to policy function', async () => {
    const policyFn = vi.fn().mockResolvedValue('high');
    const config = nameStep('filter', {
      policy: { strictness: policyFn },
    });

    await getOptionDetail('strictness', config, 'low');

    expect(policyFn).toHaveBeenCalledWith(
      { operation: 'filter' },
      expect.objectContaining({ logger: undefined })
    );
  });

  it('includes operation in detail', async () => {
    const config = nameStep('score', {
      strictness: 'high',
    });

    const { detail } = await getOptionDetail('strictness', config, 'low');

    expect(detail.operation).toBe('score');
  });

  it('emits option:resolve event with operation', async () => {
    const events = [];
    const config = nameStep('filter', {
      strictness: 'high',
      onProgress: (e) => events.push(e),
    });

    await getOptionDetail('strictness', config, 'low');

    const resolve = events.find((e) => e.event === 'option:resolve');
    expect(resolve).toBeDefined();
    expect(resolve.operation).toBe('filter');
    expect(resolve.source).toBe('config');
    expect(resolve.value).toBe('high');
  });

  it('handles async policy functions', async () => {
    const config = nameStep('filter', {
      policy: {
        strictness: async () => {
          await new Promise((r) => setTimeout(r, 5));
          return 'high';
        },
      },
    });

    const { value, detail } = await getOptionDetail('strictness', config, 'low');

    expect(value).toBe('high');
    expect(detail.source).toBe('policy');
  });
});
