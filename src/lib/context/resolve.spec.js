import { describe, it, expect, vi } from 'vitest';
import { resolveOption, resolveAsyncOption } from './resolve.js';

describe('resolveOption', () => {
  it('returns value from optionValue function when set', () => {
    const options = {
      optionValue: { protection: () => 'redact' },
    };
    const result = resolveOption('protection', options, 'depersonalize');
    expect(result).toBe('redact');
  });

  it('passes optionContext as first arg to value function', () => {
    const ctx = { request: { compliance: 'hipaa' } };
    const options = {
      optionContext: ctx,
      optionValue: {
        protection: (receivedCtx) => {
          expect(receivedCtx).toBe(ctx);
          return receivedCtx.request.compliance === 'hipaa' ? 'redact' : 'depersonalize';
        },
      },
    };
    const result = resolveOption('protection', options, 'depersonalize');
    expect(result).toBe('redact');
  });

  it('passes { logger } as second arg when logger is on options', () => {
    const logger = { info: vi.fn() };
    const options = {
      logger,
      optionValue: {
        threshold: (_ctx, { logger: receivedLogger }) => {
          expect(receivedLogger).toBe(logger);
          return 0.3;
        },
      },
    };
    const result = resolveOption('threshold', options, 0.5);
    expect(result).toBe(0.3);
  });

  it('falls through to options[name] when no value function', () => {
    const options = { protection: 'redact' };
    const result = resolveOption('protection', options, 'depersonalize');
    expect(result).toBe('redact');
  });

  it('returns fallback when neither value function nor direct option', () => {
    const result = resolveOption('protection', {}, 'depersonalize');
    expect(result).toBe('depersonalize');
  });

  it('returns fallback when value function returns undefined', () => {
    const options = {
      optionValue: { threshold: () => undefined },
    };
    const result = resolveOption('threshold', options, 0.5);
    expect(result).toBe(0.5);
  });

  it('returns fallback when value function throws', () => {
    const options = {
      optionValue: {
        threshold: () => {
          throw new Error('boom');
        },
      },
    };
    const result = resolveOption('threshold', options, 0.5);
    expect(result).toBe(0.5);
  });

  it('value function result takes precedence over direct options[name]', () => {
    const options = {
      protection: 'depersonalize',
      optionValue: { protection: () => 'redact' },
    };
    const result = resolveOption('protection', options, 'none');
    expect(result).toBe('redact');
  });

  it('works when optionContext is undefined', () => {
    const options = {
      optionValue: { threshold: (ctx) => (ctx === undefined ? 0.3 : 0.5) },
    };
    const result = resolveOption('threshold', options, 0.5);
    expect(result).toBe(0.3);
  });

  it('works when optionValue is undefined', () => {
    const options = { protection: 'redact' };
    const result = resolveOption('protection', options, 'depersonalize');
    expect(result).toBe('redact');
  });
});

describe('resolveAsyncOption', () => {
  it('returns value from optionAsyncValue function when set', async () => {
    const options = {
      optionAsyncValue: { scanEnabled: async () => true },
    };
    const result = await resolveAsyncOption('scanEnabled', options, { fallback: false });
    expect(result).toBe(true);
  });

  it('passes { logger } as second arg', async () => {
    const logger = { info: vi.fn() };
    const options = {
      logger,
      optionAsyncValue: {
        scanEnabled: async (_ctx, { logger: receivedLogger }) => {
          expect(receivedLogger).toBe(logger);
          return true;
        },
      },
    };
    const result = await resolveAsyncOption('scanEnabled', options, { fallback: false });
    expect(result).toBe(true);
  });

  it('falls through to options[name] when no async function', async () => {
    const options = { scanEnabled: true };
    const result = await resolveAsyncOption('scanEnabled', options, { fallback: false });
    expect(result).toBe(true);
  });

  it('returns fallback when neither async function nor direct option', async () => {
    const result = await resolveAsyncOption('scanEnabled', {}, { fallback: true });
    expect(result).toBe(true);
  });

  it('returns fallback when async function resolves to undefined', async () => {
    const options = {
      optionAsyncValue: { scanEnabled: async () => undefined },
    };
    const result = await resolveAsyncOption('scanEnabled', options, { fallback: true });
    expect(result).toBe(true);
  });

  it('throws on timeout when timeout is specified and exceeded', async () => {
    const options = {
      optionAsyncValue: {
        scanEnabled: () => new Promise((resolve) => setTimeout(() => resolve(true), 500)),
      },
    };
    await expect(
      resolveAsyncOption('scanEnabled', options, { fallback: true, timeout: 10 })
    ).rejects.toThrow('optionAsyncValue "scanEnabled" timed out after 10ms');
  });

  it('timeout error message includes function name and duration', async () => {
    const options = {
      optionAsyncValue: {
        myFeatureFlag: () => new Promise(() => {}),
      },
    };
    await expect(
      resolveAsyncOption('myFeatureFlag', options, { fallback: false, timeout: 25 })
    ).rejects.toThrow('optionAsyncValue "myFeatureFlag" timed out after 25ms');
  });

  it('does not throw when no timeout and function is slow', async () => {
    const options = {
      optionAsyncValue: {
        scanEnabled: () => new Promise((resolve) => setTimeout(() => resolve(true), 50)),
      },
    };
    const result = await resolveAsyncOption('scanEnabled', options, { fallback: false });
    expect(result).toBe(true);
  });

  it('cleans up timer on successful resolution', async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const options = {
      optionAsyncValue: { scanEnabled: async () => true },
    };
    await resolveAsyncOption('scanEnabled', options, { fallback: false, timeout: 5000 });
    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it('propagates internal errors from async function', async () => {
    const options = {
      optionAsyncValue: {
        scanEnabled: async () => {
          throw new Error('service unavailable');
        },
      },
    };
    await expect(resolveAsyncOption('scanEnabled', options, { fallback: true })).rejects.toThrow(
      'service unavailable'
    );
  });
});
