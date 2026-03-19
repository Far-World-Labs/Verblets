import { describe, it, expect, vi } from 'vitest';
import {
  withOperation,
  resolve,
  resolveAll,
  resolveOption,
  resolveMapped,
  resolveOptionMapped,
  resolveAsyncOption,
  mapped,
} from './resolve.js';

describe('withOperation', () => {
  it('sets operation on evalContext', () => {
    const result = withOperation('filter', {});
    expect(result.evalContext).toEqual({ operation: 'filter' });
  });

  it('preserves existing evalContext attributes', () => {
    const result = withOperation('filter', {
      evalContext: { request: { domain: 'medical' } },
    });
    expect(result.evalContext.operation).toBe('filter');
    expect(result.evalContext.request).toEqual({ domain: 'medical' });
  });

  it('composes hierarchically with parent operation', () => {
    const parent = withOperation('document-shrink', {});
    const child = withOperation('score', parent);
    expect(child.evalContext.operation).toBe('document-shrink/score');
  });

  it('composes three levels deep', () => {
    const a = withOperation('group', {});
    const b = withOperation('reduce', a);
    const c = withOperation('list', b);
    expect(c.evalContext.operation).toBe('group/reduce/list');
  });

  it('preserves all other config keys', () => {
    const config = { llm: { fast: true }, maxAttempts: 5, logger: 'log' };
    const result = withOperation('filter', config);
    expect(result.llm).toEqual({ fast: true });
    expect(result.maxAttempts).toBe(5);
    expect(result.logger).toBe('log');
  });

  it('does not mutate the original config', () => {
    const config = { evalContext: { request: { domain: 'legal' } } };
    withOperation('filter', config);
    expect(config.evalContext.operation).toBeUndefined();
  });

  it('operation is visible to optionValue functions via resolve', async () => {
    const config = withOperation('filter', {
      optionValue: {
        maxAttempts: (ctx) => (ctx.operation === 'filter' ? 5 : 3),
      },
    });
    const result = await resolve('maxAttempts', config, 3);
    expect(result).toBe(5);
  });

  it('composed operation is visible to nested optionValue functions', async () => {
    const config = withOperation(
      'score',
      withOperation('document-shrink', {
        optionValue: {
          maxAttempts: (ctx) => {
            if (ctx.operation === 'document-shrink/score') return 2;
            if (ctx.operation === 'document-shrink') return 5;
            return 3;
          },
        },
      })
    );
    const result = await resolve('maxAttempts', config, 3);
    expect(result).toBe(2);
  });
});

describe('resolve', () => {
  it('returns value from optionAsyncValue function (async)', async () => {
    const options = {
      optionAsyncValue: { protection: async () => 'redact' },
    };
    const result = await resolve('protection', options, 'depersonalize');
    expect(result).toBe('redact');
  });

  it('returns value from optionValue function (sync) when no async', async () => {
    const options = {
      optionValue: { protection: () => 'redact' },
    };
    const result = await resolve('protection', options, 'depersonalize');
    expect(result).toBe('redact');
  });

  it('returns options[name] when no functions', async () => {
    const options = { protection: 'redact' };
    const result = await resolve('protection', options, 'depersonalize');
    expect(result).toBe('redact');
  });

  it('returns fallback when nothing set', async () => {
    const result = await resolve('protection', {}, 'depersonalize');
    expect(result).toBe('depersonalize');
  });

  it('optionAsyncValue takes precedence over optionValue', async () => {
    const options = {
      optionAsyncValue: { protection: async () => 'async-value' },
      optionValue: { protection: () => 'sync-value' },
      protection: 'direct-value',
    };
    const result = await resolve('protection', options, 'fallback');
    expect(result).toBe('async-value');
  });

  it('optionValue takes precedence over options[name]', async () => {
    const options = {
      optionValue: { protection: () => 'sync-value' },
      protection: 'direct-value',
    };
    const result = await resolve('protection', options, 'fallback');
    expect(result).toBe('sync-value');
  });

  it('catches async function errors, returns fallback', async () => {
    const options = {
      optionAsyncValue: {
        protection: async () => {
          throw new Error('service unavailable');
        },
      },
    };
    const result = await resolve('protection', options, 'depersonalize');
    expect(result).toBe('depersonalize');
  });

  it('catches sync function errors, returns fallback', async () => {
    const options = {
      optionValue: {
        protection: () => {
          throw new Error('boom');
        },
      },
    };
    const result = await resolve('protection', options, 'depersonalize');
    expect(result).toBe('depersonalize');
  });

  it('returns fallback when async function returns undefined', async () => {
    const options = {
      optionAsyncValue: { threshold: async () => undefined },
    };
    const result = await resolve('threshold', options, 0.5);
    expect(result).toBe(0.5);
  });

  it('returns fallback when sync function returns undefined', async () => {
    const options = {
      optionValue: { threshold: () => undefined },
    };
    const result = await resolve('threshold', options, 0.5);
    expect(result).toBe(0.5);
  });

  it('passes evalContext and { logger } to async function', async () => {
    const ctx = { user: 'alice' };
    const logger = { info: vi.fn() };
    const options = {
      evalContext: ctx,
      logger,
      optionAsyncValue: {
        protection: async (receivedCtx, { logger: receivedLogger }) => {
          expect(receivedCtx).toBe(ctx);
          expect(receivedLogger).toBe(logger);
          return 'redact';
        },
      },
    };
    const result = await resolve('protection', options, 'depersonalize');
    expect(result).toBe('redact');
  });

  it('passes evalContext and { logger } to sync function', async () => {
    const ctx = { user: 'alice' };
    const logger = { info: vi.fn() };
    const options = {
      evalContext: ctx,
      logger,
      optionValue: {
        protection: (receivedCtx, { logger: receivedLogger }) => {
          expect(receivedCtx).toBe(ctx);
          expect(receivedLogger).toBe(logger);
          return 'redact';
        },
      },
    };
    const result = await resolve('protection', options, 'depersonalize');
    expect(result).toBe('redact');
  });

  it('falls through to sync when optionAsyncValue key is not a function', async () => {
    const options = {
      optionAsyncValue: { protection: 'not-a-function' },
      optionValue: { protection: () => 'sync-value' },
    };
    const result = await resolve('protection', options, 'fallback');
    expect(result).toBe('sync-value');
  });

  it('falls through to direct when optionValue key is not a function', async () => {
    const options = {
      optionValue: { protection: 'not-a-function' },
      protection: 'direct-value',
    };
    const result = await resolve('protection', options, 'fallback');
    expect(result).toBe('direct-value');
  });
});

describe('resolveOption', () => {
  it('returns value from optionValue function when set', () => {
    const options = {
      optionValue: { protection: () => 'redact' },
    };
    const result = resolveOption('protection', options, 'depersonalize');
    expect(result).toBe('redact');
  });

  it('passes evalContext as first arg to value function', () => {
    const ctx = { request: { compliance: 'hipaa' } };
    const options = {
      evalContext: ctx,
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

  it('works when evalContext is undefined', () => {
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

describe('resolveMapped', () => {
  const mapper = (v) => {
    if (v === undefined) return 0.3;
    if (typeof v === 'number') return v;
    return { low: 0.45, high: 0.15 }[v] ?? 0.3;
  };

  it('maps undefined to default via mapper', async () => {
    const result = await resolveMapped('compression', {}, mapper);
    expect(result).toBe(0.3);
  });

  it('maps enum string via mapper', async () => {
    const result = await resolveMapped('compression', { compression: 'high' }, mapper);
    expect(result).toBe(0.15);
  });

  it('passes through raw number via mapper', async () => {
    const result = await resolveMapped('compression', { compression: 0.2 }, mapper);
    expect(result).toBe(0.2);
  });

  it('resolves from optionValue lazily then maps', async () => {
    const options = withOperation('document-shrink', {
      optionValue: {
        compression: (ctx) => (ctx.operation === 'document-shrink' ? 'low' : undefined),
      },
    });
    const result = await resolveMapped('compression', options, mapper);
    expect(result).toBe(0.45);
  });

  it('resolves from optionAsyncValue lazily then maps', async () => {
    const options = {
      optionAsyncValue: { compression: async () => 0.1 },
    };
    const result = await resolveMapped('compression', options, mapper);
    expect(result).toBe(0.1);
  });

  it('mapper receives undefined when optionValue returns undefined', async () => {
    const options = {
      optionValue: { compression: () => undefined },
    };
    const result = await resolveMapped('compression', options, mapper);
    expect(result).toBe(0.3);
  });

  it('uses nested operation context for lazy evaluation', async () => {
    const options = withOperation(
      'score',
      withOperation('document-shrink', {
        optionValue: {
          compression: (ctx) => {
            if (ctx.operation === 'document-shrink/score') return 'high';
            if (ctx.operation === 'document-shrink') return 'low';
            return undefined;
          },
        },
      })
    );
    const result = await resolveMapped('compression', options, mapper);
    expect(result).toBe(0.15);
  });
});

describe('resolveOptionMapped', () => {
  const mapper = (v) => {
    if (v === undefined) return undefined;
    if (v === 'low' || v === 'high') return v;
    return undefined;
  };

  it('maps undefined to default via mapper', () => {
    const result = resolveOptionMapped('challenge', {}, mapper);
    expect(result).toBeUndefined();
  });

  it('maps enum string via mapper', () => {
    const result = resolveOptionMapped('challenge', { challenge: 'high' }, mapper);
    expect(result).toBe('high');
  });

  it('resolves from optionValue lazily then maps', () => {
    const options = withOperation('socratic', {
      optionValue: {
        challenge: (ctx) => (ctx.operation === 'socratic' ? 'low' : undefined),
      },
    });
    const result = resolveOptionMapped('challenge', options, mapper);
    expect(result).toBe('low');
  });

  it('rejects unknown values via mapper', () => {
    const result = resolveOptionMapped('challenge', { challenge: 'extreme' }, mapper);
    expect(result).toBeUndefined();
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

describe('mapped', () => {
  it('creates a tagged marker object with __mapped and fn', () => {
    const fn = (v) => v;
    const marker = mapped(fn);
    expect(marker.__mapped).toBe(true);
    expect(marker.fn).toBe(fn);
  });

  it('marker is distinguishable from a plain object with same keys', () => {
    const plain = { __mapped: false, fn: () => {} };
    const marker = mapped(() => {});
    expect(plain.__mapped).toBe(false);
    expect(marker.__mapped).toBe(true);
  });
});

describe('resolveAll', () => {
  it('resolves plain fallbacks for all entries', async () => {
    const result = await resolveAll(
      {},
      {
        llm: undefined,
        maxAttempts: 3,
        retryDelay: 1000,
      }
    );
    expect(result).toEqual({ llm: undefined, maxAttempts: 3, retryDelay: 1000 });
  });

  it('resolves mapped entries via mapped()', async () => {
    const mapCompression = (v) => {
      if (v === undefined) return 0.3;
      return { low: 0.45, high: 0.15 }[v] ?? 0.3;
    };
    const result = await resolveAll(
      { compression: 'high' },
      {
        compression: mapped(mapCompression),
        maxAttempts: 3,
      }
    );
    expect(result).toEqual({ compression: 0.15, maxAttempts: 3 });
  });

  it('resolves mapped entry with default when option absent', async () => {
    const mapCompression = (v) => (v === undefined ? 0.3 : v);
    const result = await resolveAll(
      {},
      {
        compression: mapped(mapCompression),
      }
    );
    expect(result).toEqual({ compression: 0.3 });
  });

  it('respects optionValue for plain entries', async () => {
    const config = withOperation('filter', {
      optionValue: {
        maxAttempts: (ctx) => (ctx.operation === 'filter' ? 5 : 3),
      },
    });
    const result = await resolveAll(config, { maxAttempts: 3 });
    expect(result.maxAttempts).toBe(5);
  });

  it('respects optionAsyncValue for plain entries', async () => {
    const config = {
      optionAsyncValue: { llm: async () => ({ fast: true }) },
    };
    const result = await resolveAll(config, { llm: undefined });
    expect(result.llm).toEqual({ fast: true });
  });

  it('respects optionValue for mapped entries', async () => {
    const mapper = (v) => (v ?? 'default').toUpperCase();
    const config = withOperation('test', {
      optionValue: {
        mode: (ctx) => (ctx.operation === 'test' ? 'fast' : undefined),
      },
    });
    const result = await resolveAll(config, { mode: mapped(mapper) });
    expect(result.mode).toBe('FAST');
  });

  it('returns direct config values when no resolver functions', async () => {
    const config = { llm: { fast: true }, maxAttempts: 5 };
    const result = await resolveAll(config, { llm: undefined, maxAttempts: 3 });
    expect(result).toEqual({ llm: { fast: true }, maxAttempts: 5 });
  });

  it('handles mixed plain and mapped entries', async () => {
    const mapStrictness = (v) => {
      if (v === undefined) return { guidance: undefined, errorPosture: 'strict' };
      return (
        { low: { guidance: 'include', errorPosture: 'resilient' } }[v] ?? {
          guidance: undefined,
          errorPosture: 'strict',
        }
      );
    };
    const config = { llm: 'fast', strictness: 'low', maxAttempts: 5 };
    const result = await resolveAll(config, {
      llm: undefined,
      strictness: mapped(mapStrictness),
      maxAttempts: 3,
      retryDelay: 1000,
    });
    expect(result.llm).toBe('fast');
    expect(result.strictness).toEqual({ guidance: 'include', errorPosture: 'resilient' });
    expect(result.maxAttempts).toBe(5);
    expect(result.retryDelay).toBe(1000);
  });
});
