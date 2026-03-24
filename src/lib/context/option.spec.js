import { describe, it, expect, vi } from 'vitest';
import { nameStep, getOption, getOptions, withPolicy, initChain } from './option.js';

describe('nameStep', () => {
  it('sets operation on config', () => {
    const result = nameStep('filter', {});
    expect(result.operation).toBe('filter');
  });

  it('preserves existing config attributes', () => {
    const result = nameStep('filter', {
      request: { domain: 'medical' },
    });
    expect(result.operation).toBe('filter');
    expect(result.request).toEqual({ domain: 'medical' });
  });

  it('composes hierarchically with parent operation', () => {
    const parent = nameStep('document-shrink', {});
    const child = nameStep('score', parent);
    expect(child.operation).toBe('document-shrink/score');
  });

  it('composes three levels deep', () => {
    const a = nameStep('group', {});
    const b = nameStep('reduce', a);
    const c = nameStep('list', b);
    expect(c.operation).toBe('group/reduce/list');
  });

  it('preserves all other config keys', () => {
    const config = { llm: { fast: true }, maxAttempts: 5, logger: 'log' };
    const result = nameStep('filter', config);
    expect(result.llm).toEqual({ fast: true });
    expect(result.maxAttempts).toBe(5);
    expect(result.logger).toBe('log');
  });

  it('does not mutate the original config', () => {
    const config = { request: { domain: 'legal' } };
    nameStep('filter', config);
    expect(config.operation).toBeUndefined();
  });

  it('does not add a now timestamp', () => {
    const result = nameStep('filter', {});
    expect(result.now).toBeUndefined();
  });

  it('operation is visible to policy functions via getOption', async () => {
    const config = nameStep('filter', {
      policy: {
        maxAttempts: (ctx) => (ctx.operation === 'filter' ? 5 : 3),
      },
    });
    const result = await getOption('maxAttempts', config, 3);
    expect(result).toBe(5);
  });

  it('composed operation is visible to nested policy functions', async () => {
    const config = nameStep(
      'score',
      nameStep('document-shrink', {
        policy: {
          maxAttempts: (ctx) => {
            if (ctx.operation === 'document-shrink/score') return 2;
            if (ctx.operation === 'document-shrink') return 5;
            return 3;
          },
        },
      })
    );
    const result = await getOption('maxAttempts', config, 3);
    expect(result).toBe(2);
  });
});

describe('initChain', () => {
  it('adds now timestamp', async () => {
    const { config } = await initChain('filter', {});
    expect(config.now).toBeInstanceOf(Date);
  });

  it('preserves caller-provided now', async () => {
    const custom = new Date('2020-01-01');
    const { config } = await initChain('filter', { now: custom });
    expect(config.now).toBe(custom);
  });

  it('sets operation on config', async () => {
    const { config } = await initChain('filter', {});
    expect(config.operation).toBe('filter');
  });

  it('resolves options from spec', async () => {
    const { config, strictness } = await initChain(
      'filter',
      { strictness: 'high' },
      {
        strictness: 'med',
      }
    );
    expect(strictness).toBe('high');
    expect(config.operation).toBe('filter');
  });
});

describe('getOption', () => {
  it('returns value from async policy function', async () => {
    const options = {
      policy: { protection: async () => 'redact' },
    };
    const result = await getOption('protection', options, 'depersonalize');
    expect(result).toBe('redact');
  });

  it('returns value from sync policy function', async () => {
    const options = {
      policy: { protection: () => 'redact' },
    };
    const result = await getOption('protection', options, 'depersonalize');
    expect(result).toBe('redact');
  });

  it('returns options[name] when no functions', async () => {
    const options = { protection: 'redact' };
    const result = await getOption('protection', options, 'depersonalize');
    expect(result).toBe('redact');
  });

  it('returns fallback when nothing set', async () => {
    const result = await getOption('protection', {}, 'depersonalize');
    expect(result).toBe('depersonalize');
  });

  it('policy takes precedence over options[name]', async () => {
    const options = {
      policy: { protection: () => 'policy-value' },
      protection: 'direct-value',
    };
    const result = await getOption('protection', options, 'fallback');
    expect(result).toBe('policy-value');
  });

  it('catches async function errors, returns fallback', async () => {
    const options = {
      policy: {
        protection: async () => {
          throw new Error('service unavailable');
        },
      },
    };
    const result = await getOption('protection', options, 'depersonalize');
    expect(result).toBe('depersonalize');
  });

  it('catches sync function errors, returns fallback', async () => {
    const options = {
      policy: {
        protection: () => {
          throw new Error('boom');
        },
      },
    };
    const result = await getOption('protection', options, 'depersonalize');
    expect(result).toBe('depersonalize');
  });

  it('returns fallback when async function returns undefined', async () => {
    const options = {
      policy: { threshold: async () => undefined },
    };
    const result = await getOption('threshold', options, 0.5);
    expect(result).toBe(0.5);
  });

  it('returns fallback when sync function returns undefined', async () => {
    const options = {
      policy: { threshold: () => undefined },
    };
    const result = await getOption('threshold', options, 0.5);
    expect(result).toBe(0.5);
  });

  it('passes context object and { logger } to async function', async () => {
    const logger = { info: vi.fn() };
    const options = {
      operation: 'filter',
      logger,
      policy: {
        protection: async (ctx, { logger: receivedLogger }) => {
          expect(ctx).toEqual({ operation: 'filter' });
          expect(receivedLogger).toBe(logger);
          return 'redact';
        },
      },
    };
    const result = await getOption('protection', options, 'depersonalize');
    expect(result).toBe('redact');
  });

  it('passes context object and { logger } to sync function', async () => {
    const logger = { info: vi.fn() };
    const options = {
      operation: 'filter',
      logger,
      policy: {
        protection: (ctx, { logger: receivedLogger }) => {
          expect(ctx).toEqual({ operation: 'filter' });
          expect(receivedLogger).toBe(logger);
          return 'redact';
        },
      },
    };
    const result = await getOption('protection', options, 'depersonalize');
    expect(result).toBe('redact');
  });

  it('falls through to direct when policy key is not a function', async () => {
    const options = {
      policy: { protection: 'not-a-function' },
      protection: 'direct-value',
    };
    const result = await getOption('protection', options, 'fallback');
    expect(result).toBe('direct-value');
  });
});

describe('withPolicy', () => {
  it('creates a tagged marker object with __policy and fn', () => {
    const fn = (v) => v;
    const marker = withPolicy(fn);
    expect(marker.__policy).toBe(true);
    expect(marker.fn).toBe(fn);
  });

  it('marker is distinguishable from a plain object with same keys', () => {
    const plain = { __policy: false, fn: () => {} };
    const marker = withPolicy(() => {});
    expect(plain.__policy).toBe(false);
    expect(marker.__policy).toBe(true);
  });

  it('stores override keys when provided', () => {
    const marker = withPolicy((v) => v, ['extremeK', 'iterations']);
    expect(marker.overrides).toEqual(['extremeK', 'iterations']);
  });

  it('omits overrides property when not provided', () => {
    const marker = withPolicy((v) => v);
    expect(marker).not.toHaveProperty('overrides');
  });
});

describe('getOptions', () => {
  it('resolves plain fallbacks for all entries', async () => {
    const result = await getOptions(
      {},
      {
        llm: undefined,
        maxAttempts: 3,
        retryDelay: 1000,
      }
    );
    expect(result).toEqual({ llm: undefined, maxAttempts: 3, retryDelay: 1000 });
  });

  it('resolves withPolicy entries via withPolicy()', async () => {
    const mapCompression = (v) => {
      if (v === undefined) return 0.3;
      return { low: 0.45, high: 0.15 }[v] ?? 0.3;
    };
    const result = await getOptions(
      { compression: 'high' },
      {
        compression: withPolicy(mapCompression),
        maxAttempts: 3,
      }
    );
    expect(result).toEqual({ compression: 0.15, maxAttempts: 3 });
  });

  it('resolves withPolicy entry with default when option absent', async () => {
    const mapCompression = (v) => (v === undefined ? 0.3 : v);
    const result = await getOptions(
      {},
      {
        compression: withPolicy(mapCompression),
      }
    );
    expect(result).toEqual({ compression: 0.3 });
  });

  it('respects policy for plain entries', async () => {
    const config = nameStep('filter', {
      policy: {
        maxAttempts: (ctx) => (ctx.operation === 'filter' ? 5 : 3),
      },
    });
    const result = await getOptions(config, { maxAttempts: 3 });
    expect(result.maxAttempts).toBe(5);
  });

  it('respects async policy for plain entries', async () => {
    const config = {
      policy: { llm: async () => ({ fast: true }) },
    };
    const result = await getOptions(config, { llm: undefined });
    expect(result.llm).toEqual({ fast: true });
  });

  it('respects policy for withPolicy entries', async () => {
    const mapper = (v) => (v ?? 'default').toUpperCase();
    const config = nameStep('test', {
      policy: {
        mode: (ctx) => (ctx.operation === 'test' ? 'fast' : undefined),
      },
    });
    const result = await getOptions(config, { mode: withPolicy(mapper) });
    expect(result.mode).toBe('FAST');
  });

  it('returns direct config values when no resolver functions', async () => {
    const config = { llm: { fast: true }, maxAttempts: 5 };
    const result = await getOptions(config, { llm: undefined, maxAttempts: 3 });
    expect(result).toEqual({ llm: { fast: true }, maxAttempts: 5 });
  });

  it('auto-resolves override sub-keys from withPolicy', async () => {
    const mapEffort = (v) => {
      if (v === undefined) return { iterations: 1, extremeK: 10, selectBottom: false };
      return (
        {
          low: { iterations: 1, extremeK: 5, selectBottom: false },
          high: { iterations: 3, extremeK: 20, selectBottom: true },
        }[v] ?? { iterations: 1, extremeK: 10, selectBottom: false }
      );
    };
    const config = { effort: 'high' };
    const result = await getOptions(config, {
      effort: withPolicy(mapEffort, ['iterations', 'extremeK', 'selectBottom']),
    });
    // Parent key excluded from result — only flattened sub-keys
    expect(result).not.toHaveProperty('effort');
    expect(result.iterations).toBe(3);
    expect(result.extremeK).toBe(20);
    expect(result.selectBottom).toBe(true);
  });

  it('override sub-keys prefer direct config over mapper output', async () => {
    const mapEffort = (v) => {
      if (v === undefined) return { iterations: 1, extremeK: 10 };
      return { low: { iterations: 1, extremeK: 5 } }[v] ?? { iterations: 1, extremeK: 10 };
    };
    const config = { effort: 'low', extremeK: 99 };
    const result = await getOptions(config, {
      effort: withPolicy(mapEffort, ['iterations', 'extremeK']),
    });
    expect(result).not.toHaveProperty('effort');
    expect(result.iterations).toBe(1); // from mapper, no direct override
    expect(result.extremeK).toBe(99); // direct config wins over mapper's 5
  });

  it('override sub-keys respect policy functions', async () => {
    const mapEffort = (_v) => ({ iterations: 1, extremeK: 10 });
    const config = nameStep('sort', {
      effort: 'low',
      policy: {
        extremeK: (ctx) => (ctx.operation === 'sort' ? 42 : 10),
      },
    });
    const result = await getOptions(config, {
      effort: withPolicy(mapEffort, ['iterations', 'extremeK']),
    });
    expect(result.extremeK).toBe(42); // policy wins
    expect(result.iterations).toBe(1); // mapper fallback
  });

  it('withPolicy without overrides returns mapped value under parent key', async () => {
    const mapCompression = (v) => (v === undefined ? 0.3 : ({ low: 0.45, high: 0.15 }[v] ?? 0.3));
    const result = await getOptions(
      { compression: 'low' },
      { compression: withPolicy(mapCompression) }
    );
    expect(result.compression).toBe(0.45);
  });

  it('handles mixed plain and withPolicy entries', async () => {
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
    const result = await getOptions(config, {
      llm: undefined,
      strictness: withPolicy(mapStrictness),
      maxAttempts: 3,
      retryDelay: 1000,
    });
    expect(result.llm).toBe('fast');
    expect(result.strictness).toEqual({ guidance: 'include', errorPosture: 'resilient' });
    expect(result.maxAttempts).toBe(5);
    expect(result.retryDelay).toBe(1000);
  });
});

describe('config pipeline integration', () => {
  it('static value on config survives getOptions', async () => {
    const config = { temperature: 0.7 };
    const result = await getOptions(config, { temperature: 0.5 });
    expect(result.temperature).toBe(0.7);
  });

  it('policy sync function resolves per operation', async () => {
    const config = nameStep('filter', {
      policy: {
        temperature: (ctx) => (ctx.operation === 'filter' ? 0.2 : 0.8),
      },
    });
    const result = await getOptions(config, { temperature: 0.5 });
    expect(result.temperature).toBe(0.2);
  });

  it('policy async function resolves per operation', async () => {
    const config = nameStep('score', {
      policy: {
        temperature: async (ctx) => (ctx.operation === 'score' ? 0.1 : 0.9),
      },
    });
    const result = await getOptions(config, { temperature: 0.5 });
    expect(result.temperature).toBe(0.1);
  });

  it('policy mapper + individual override: override wins', async () => {
    const mapEffort = (v) => {
      if (v === undefined) return { iterations: 1, extremeK: 10 };
      return (
        { low: { iterations: 1, extremeK: 5 }, high: { iterations: 2, extremeK: 15 } }[v] ?? {
          iterations: 1,
          extremeK: 10,
        }
      );
    };
    const config = nameStep('sort', { effort: 'low', extremeK: 99 });
    const { effort } = await getOptions(config, { effort: withPolicy(mapEffort) });
    const extremeK = await getOption('extremeK', config, effort.extremeK);
    expect(extremeK).toBe(99); // explicit override wins over mapper output
  });

  it('nested operation scoping reaches correct context', async () => {
    const config = nameStep(
      'score',
      nameStep('document-shrink', {
        policy: {
          maxAttempts: (ctx) => {
            if (ctx.operation === 'document-shrink/score') return 7;
            if (ctx.operation === 'document-shrink') return 3;
            return 1;
          },
        },
      })
    );
    const result = await getOptions(config, { maxAttempts: 1 });
    expect(result.maxAttempts).toBe(7);
  });

  it('type preservation: numbers stay numbers', async () => {
    const config = { temperature: 0.7, maxAttempts: 5 };
    const result = await getOptions(config, { temperature: 0.5, maxAttempts: 3 });
    expect(typeof result.temperature).toBe('number');
    expect(typeof result.maxAttempts).toBe('number');
    expect(result.temperature).toBe(0.7);
    expect(result.maxAttempts).toBe(5);
  });

  it('type preservation: booleans stay booleans', async () => {
    const config = { validate: false };
    const result = await getOptions(config, { validate: true });
    expect(typeof result.validate).toBe('boolean');
    expect(result.validate).toBe(false);
  });

  it('type preservation: objects are not coerced', async () => {
    const format = { type: 'json_schema', json_schema: { name: 'test' } };
    const config = { response_format: format };
    const result = await getOptions(config, { response_format: undefined });
    expect(result.response_format).toBe(format); // same reference
  });

  it('withPolicy passes resolved value through mapper', async () => {
    const mapDouble = (v) => (v ?? 1) * 2;
    const config = { factor: 5 };
    const result = await getOptions(config, { factor: withPolicy(mapDouble) });
    expect(result.factor).toBe(10);
  });

  it('withPolicy with undefined uses mapper default', async () => {
    const mapDouble = (v) => (v ?? 1) * 2;
    const result = await getOptions({}, { factor: withPolicy(mapDouble) });
    expect(result.factor).toBe(2); // (1) * 2
  });

  it('policy function error falls back gracefully in getOptions', async () => {
    const config = {
      policy: {
        temperature: () => {
          throw new Error('boom');
        },
      },
    };
    const result = await getOptions(config, { temperature: 0.5 });
    expect(result.temperature).toBe(0.5); // fallback
  });
});
