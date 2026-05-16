import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TelemetryEvent, OptionSource, ChainEvent } from '../progress/constants.js';

vi.mock('../config/index.js', () => ({
  get: vi.fn(),
  validate: vi.fn(() => []),
}));

vi.mock('../version/index.js', () => ({
  default: '1.0.0-test',
}));

const { get: configGet } = await import('../config/index.js');

const {
  createContextBuilder,
  observeApplication,
  observeProviders,
  nameStep,
  getOption,
  getOptionDetail,
  getOptions,
  withPolicy,
  createProgressEmitter,
  descriptorToSchema,
} = await import('./index.js');

describe('lib/context', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createContextBuilder', () => {
    it('builds empty context when no kinds are set', () => {
      const ctx = createContextBuilder().build();
      expect(ctx).toEqual({});
    });

    it('accumulates application and providers via fluent chaining', () => {
      const builder = createContextBuilder();
      builder
        .setApplication({ environment: 'production', version: '2.0.0' })
        .setProviders({ openai: true, anthropic: false });
      const ctx = builder.build();
      expect(ctx.application).toEqual({
        key: 'default',
        environment: 'production',
        version: '2.0.0',
      });
      expect(ctx.providers).toEqual({ key: 'default', openai: true, anthropic: false });
    });

    it('withRequest returns new builder carrying long-lived kinds', () => {
      const builder = createContextBuilder();
      builder.setApplication({ environment: 'test' });
      const derived = builder.withRequest({ domain: 'medical' });
      const ctx = derived.build();
      expect(ctx.application.environment).toBe('test');
      expect(ctx.request.domain).toBe('medical');
      expect(ctx.request.key).toBe('default');
    });

    it('withContent copies arrays and does not mutate original builder', () => {
      const tags = ['pii', 'medical'];
      const builder = createContextBuilder();
      const derived = builder.withContent({ tags });
      expect(builder.build().content).toBeUndefined();
      const ctx = derived.build();
      expect(ctx.content.tags).toEqual(['pii', 'medical']);
      expect(ctx.content.tags).not.toBe(tags);
    });

    it('build produces deeply frozen snapshot', () => {
      const builder = createContextBuilder();
      builder.setApplication({ environment: 'test' });
      const ctx = builder.withContent({ categories: ['a', 'b'] }).build();
      expect(Object.isFrozen(ctx)).toBe(true);
      expect(Object.isFrozen(ctx.application)).toBe(true);
      expect(Object.isFrozen(ctx.content)).toBe(true);
      expect(Object.isFrozen(ctx.content.categories)).toBe(true);
    });

    it('independent snapshots from same builder do not interfere', () => {
      const builder = createContextBuilder();
      builder.setApplication({ environment: 'dev' });
      const snap1 = builder.build();
      builder.setApplication({ environment: 'prod' });
      const snap2 = builder.build();
      expect(snap1.application.environment).toBe('dev');
      expect(snap2.application.environment).toBe('prod');
    });

    it('omits unset kinds from snapshot', () => {
      const builder = createContextBuilder();
      builder.setProviders({ openai: true });
      const ctx = builder.build();
      expect(Object.keys(ctx)).toEqual(['providers']);
    });

    it('multiple withRequest calls from same builder are independent', () => {
      const builder = createContextBuilder();
      builder.setApplication({ environment: 'prod' });
      const medical = builder.withRequest({ domain: 'medical' });
      const financial = builder.withRequest({ domain: 'financial' });
      expect(medical.build().request.domain).toBe('medical');
      expect(financial.build().request.domain).toBe('financial');
    });
  });

  describe('observeApplication', () => {
    it('returns environment from NODE_ENV with default key', () => {
      configGet.mockImplementation((key) => (key === 'NODE_ENV' ? 'staging' : undefined));
      const result = observeApplication();
      expect(result).toMatchObject({ key: 'default', environment: 'staging' });
    });

    it('defaults environment to development when NODE_ENV absent', () => {
      configGet.mockReturnValue(undefined);
      const result = observeApplication();
      expect(result.environment).toBe('development');
    });

    it('defaults environment to development when NODE_ENV is empty string', () => {
      configGet.mockImplementation((key) => (key === 'NODE_ENV' ? '' : undefined));
      const result = observeApplication();
      expect(result.environment).toBe('development');
    });

    it('includes library version', () => {
      configGet.mockReturnValue(undefined);
      const result = observeApplication();
      expect(result.version).toBe('1.0.0-test');
    });
  });

  describe('observeProviders', () => {
    it('detects presence of provider API keys', () => {
      configGet.mockImplementation((key) => {
        const env = {
          OPENAI_API_KEY: 'sk-test',
          ANTHROPIC_API_KEY: 'sk-ant',
          OPENWEBUI_API_KEY: undefined,
          REDIS_HOST: 'localhost',
        };
        return env[key];
      });
      const result = observeProviders();
      expect(result.openai).toBe(true);
      expect(result.anthropic).toBe(true);
      expect(result.openwebui).toBe(false);
      expect(result.embeddingAvailable).toBe(false);
      expect(result.redisConfigured).toBe(true);
      expect(result.key).toBe('default');
    });

    it('derives embeddingAvailable from openwebui key', () => {
      configGet.mockImplementation((key) => (key === 'OPENWEBUI_API_KEY' ? 'sk-owui' : undefined));
      const result = observeProviders();
      expect(result.openwebui).toBe(true);
      expect(result.embeddingAvailable).toBe(true);
    });

    it('all providers false when no keys configured', () => {
      configGet.mockReturnValue(undefined);
      const result = observeProviders();
      expect(result.openai).toBe(false);
      expect(result.anthropic).toBe(false);
      expect(result.openwebui).toBe(false);
      expect(result.embeddingAvailable).toBe(false);
      expect(result.redisConfigured).toBe(false);
    });
  });

  describe('nameStep', () => {
    it('sets operation from step name', () => {
      const config = nameStep('classify', {});
      expect(config.operation).toBe('classify');
    });

    it('composes parent/child operation path', () => {
      const parent = nameStep('pipeline', {});
      const child = nameStep('extract', parent);
      expect(child.operation).toBe('pipeline/extract');
    });

    it('composes three levels deep', () => {
      const a = nameStep('pipeline', {});
      const b = nameStep('stage', a);
      const c = nameStep('substep', b);
      expect(c.operation).toBe('pipeline/stage/substep');
    });

    it('generates traceId on first call and propagates to descendants', () => {
      const root = nameStep('root', {});
      expect(root.traceId).toBeDefined();
      expect(root.traceId).toHaveLength(32);
      const child = nameStep('child', root);
      expect(child.traceId).toBe(root.traceId);
    });

    it('generates unique spanId per step', () => {
      const root = nameStep('root', {});
      const child = nameStep('child', root);
      expect(root.spanId).toBeDefined();
      expect(child.spanId).toBeDefined();
      expect(root.spanId).not.toBe(child.spanId);
      expect(root.spanId).toHaveLength(16);
    });

    it('sets parentSpanId from caller spanId', () => {
      const parent = nameStep('parent', {});
      const child = nameStep('child', parent);
      expect(child.parentSpanId).toBe(parent.spanId);
    });

    it('root step has undefined parentSpanId', () => {
      const root = nameStep('root', {});
      expect(root.parentSpanId).toBeUndefined();
    });

    it('sets now timestamp on first call and preserves existing', () => {
      const first = nameStep('a', {});
      expect(first.now).toBeInstanceOf(Date);
      const second = nameStep('b', first);
      expect(second.now).toBe(first.now);
    });

    it('preserves caller-provided now', () => {
      const custom = new Date('2025-01-01');
      const result = nameStep('step', { now: custom });
      expect(result.now).toBe(custom);
    });

    it('does not mutate original config', () => {
      const original = { llm: 'fast' };
      nameStep('step', original);
      expect(original.operation).toBeUndefined();
      expect(original.traceId).toBeUndefined();
    });

    it('preserves all config keys', () => {
      const onProgress = () => {};
      const config = { llm: { fast: true }, maxAttempts: 5, onProgress };
      const result = nameStep('step', config);
      expect(result.llm).toEqual({ fast: true });
      expect(result.maxAttempts).toBe(5);
      expect(result.onProgress).toBe(onProgress);
    });
  });

  describe('getOption', () => {
    it('resolves from policy function over direct config', async () => {
      const config = {
        policy: { temperature: () => 0.2 },
        temperature: 0.8,
      };
      expect(await getOption('temperature', config, 0.5)).toBe(0.2);
    });

    it('resolves from direct config when no policy', async () => {
      expect(await getOption('temperature', { temperature: 0.7 }, 0.5)).toBe(0.7);
    });

    it('resolves to fallback when nothing set', async () => {
      expect(await getOption('temperature', {}, 0.5)).toBe(0.5);
    });

    it('awaits async policy function', async () => {
      const config = {
        policy: { mode: async () => 'turbo' },
      };
      expect(await getOption('mode', config, 'normal')).toBe('turbo');
    });

    it('falls back when policy returns undefined', async () => {
      const config = {
        policy: { retries: () => undefined },
      };
      expect(await getOption('retries', config, 3)).toBe(3);
    });

    it('passes operation context and logger to policy function', async () => {
      const logger = { warn: vi.fn() };
      const spy = vi.fn().mockReturnValue(42);
      const config = nameStep('score', { logger, policy: { k: spy } });
      await getOption('k', config, 10);
      expect(spy).toHaveBeenCalledWith({ operation: 'score' }, { logger });
    });

    it('propagates policy errors', async () => {
      const config = {
        policy: {
          bad: () => {
            throw new Error('fail');
          },
        },
      };
      await expect(getOption('bad', config, 'safe')).rejects.toThrow('fail');
    });

    it('propagates async policy errors', async () => {
      const config = {
        policy: {
          bad: async () => {
            throw new Error('async fail');
          },
        },
      };
      await expect(getOption('bad', config, 'safe')).rejects.toThrow('async fail');
    });

    it('skips non-function policy entries and falls through to direct', async () => {
      const config = {
        policy: { mode: 'not-a-function' },
        mode: 'direct',
      };
      expect(await getOption('mode', config, 'fallback')).toBe('direct');
    });

    it('operation context reflects composed path', async () => {
      const spy = vi.fn().mockReturnValue('ok');
      const config = nameStep('inner', nameStep('outer', { policy: { x: spy } }));
      await getOption('x', config, 'default');
      expect(spy).toHaveBeenCalledWith({ operation: 'outer/inner' }, expect.any(Object));
    });
  });

  describe('getOptionDetail', () => {
    it('returns value and detail with policy source', async () => {
      const config = nameStep('extract', {
        policy: { depth: () => 'deep' },
      });
      const { value, detail } = await getOptionDetail('depth', config, 'shallow');
      expect(value).toBe('deep');
      expect(detail.source).toBe(OptionSource.policy);
      expect(detail.option).toBe('depth');
      expect(detail.operation).toBe('extract');
      expect(detail.policyReturned).toBe('deep');
    });

    it('reports config source when no policy', async () => {
      const config = nameStep('classify', { depth: 'medium' });
      const { value, detail } = await getOptionDetail('depth', config, 'shallow');
      expect(value).toBe('medium');
      expect(detail.source).toBe(OptionSource.config);
    });

    it('reports fallback source when nothing set', async () => {
      const config = nameStep('list', {});
      const { value, detail } = await getOptionDetail('depth', config, 'shallow');
      expect(value).toBe('shallow');
      expect(detail.source).toBe(OptionSource.fallback);
    });

    it('emits option:resolve telemetry event via onProgress', async () => {
      const events = [];
      const config = nameStep('score', {
        depth: 'high',
        onProgress: (e) => events.push(e),
      });
      await getOptionDetail('depth', config, 'low');
      const resolve = events.find((e) => e.event === TelemetryEvent.optionResolve);
      expect(resolve).toBeDefined();
      expect(resolve.source).toBe(OptionSource.config);
      expect(resolve.value).toBe('high');
      expect(resolve.operation).toBe('score');
    });

    it('falls back when policy returns undefined and reports policyReturned', async () => {
      const config = nameStep('step', {
        policy: { x: () => undefined },
      });
      const { value, detail } = await getOptionDetail('x', config, 42);
      expect(value).toBe(42);
      expect(detail.source).toBe(OptionSource.policy);
      expect(detail.policyReturned).toBe(undefined);
    });

    it('handles async policy functions', async () => {
      const config = nameStep('filter', {
        policy: {
          depth: async () => {
            await new Promise((r) => setTimeout(r, 5));
            return 'deep';
          },
        },
      });
      const { value, detail } = await getOptionDetail('depth', config, 'shallow');
      expect(value).toBe('deep');
      expect(detail.source).toBe(OptionSource.policy);
    });

    it('propagates policy errors', async () => {
      const config = nameStep('step', {
        policy: {
          x: () => {
            throw new Error('provider down');
          },
        },
      });
      await expect(getOptionDetail('x', config, 'safe')).rejects.toThrow('provider down');
    });
  });

  describe('withPolicy', () => {
    it('creates marker with __policy flag and mapper function', () => {
      const mapper = (v) => v * 2;
      const marker = withPolicy(mapper);
      expect(marker.__policy).toBe(true);
      expect(marker.fn).toBe(mapper);
    });

    it('includes overrides when provided', () => {
      const marker = withPolicy((v) => v, ['queryExpansion', 'llmScoring']);
      expect(marker.overrides).toEqual(['queryExpansion', 'llmScoring']);
    });

    it('omits overrides when not provided', () => {
      const marker = withPolicy((v) => v);
      expect(marker).not.toHaveProperty('overrides');
    });

    it('is distinguishable from plain objects', () => {
      const plain = { __policy: false, fn: () => {} };
      const marker = withPolicy(() => {});
      expect(plain.__policy).toBe(false);
      expect(marker.__policy).toBe(true);
    });
  });

  describe('getOptions', () => {
    it('batch resolves plain fallbacks', async () => {
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

    it('direct config values override fallbacks', async () => {
      const config = { maxAttempts: 7, temperature: 0.9 };
      const result = await getOptions(config, {
        maxAttempts: 3,
        temperature: 0.5,
        retryDelay: 1000,
      });
      expect(result.maxAttempts).toBe(7);
      expect(result.temperature).toBe(0.9);
      expect(result.retryDelay).toBe(1000);
    });

    it('withPolicy maps resolved value through mapper', async () => {
      const mapRanking = (v) => ({ low: 0.3, high: 0.9 })[v] ?? 0.6;
      const result = await getOptions({ ranking: 'high' }, { ranking: withPolicy(mapRanking) });
      expect(result.ranking).toBe(0.9);
    });

    it('withPolicy uses mapper default when option absent', async () => {
      const mapRanking = (v) => (v === undefined ? 0.6 : v);
      const result = await getOptions({}, { ranking: withPolicy(mapRanking) });
      expect(result.ranking).toBe(0.6);
    });

    it('withPolicy overrides flatten sub-keys and exclude parent', async () => {
      const mapThoroughness = (v) => {
        const presets = {
          low: { queryExpansion: false, llmScoring: false },
          high: { queryExpansion: true, llmScoring: true },
        };
        return presets[v] ?? { queryExpansion: false, llmScoring: false };
      };
      const result = await getOptions(
        { thoroughness: 'high' },
        { thoroughness: withPolicy(mapThoroughness, ['queryExpansion', 'llmScoring']) }
      );
      expect(result).not.toHaveProperty('thoroughness');
      expect(result.queryExpansion).toBe(true);
      expect(result.llmScoring).toBe(true);
    });

    it('direct config overrides win over mapper output for sub-keys', async () => {
      const mapThoroughness = (v) => ({
        queryExpansion: v === 'high',
        llmScoring: v === 'high',
      });
      const config = { thoroughness: 'high', queryExpansion: false };
      const result = await getOptions(config, {
        thoroughness: withPolicy(mapThoroughness, ['queryExpansion', 'llmScoring']),
      });
      expect(result.queryExpansion).toBe(false);
      expect(result.llmScoring).toBe(true);
    });

    it('policy functions on sub-keys take precedence over mapper', async () => {
      const mapEffort = () => ({ iterations: 1, extremeK: 10 });
      const config = nameStep('sort', {
        policy: { extremeK: () => 99 },
      });
      const result = await getOptions(config, {
        effort: withPolicy(mapEffort, ['iterations', 'extremeK']),
      });
      expect(result.extremeK).toBe(99);
      expect(result.iterations).toBe(1);
    });

    it('handles mixed plain and withPolicy entries', async () => {
      const mapMode = (v) => (v ?? 'balanced').toUpperCase();
      const config = { mode: 'fast', maxAttempts: 5 };
      const result = await getOptions(config, {
        mode: withPolicy(mapMode),
        maxAttempts: 3,
        retryDelay: 1000,
      });
      expect(result.mode).toBe('FAST');
      expect(result.maxAttempts).toBe(5);
      expect(result.retryDelay).toBe(1000);
    });

    it('respects policy channel for plain entries', async () => {
      const config = nameStep('filter', {
        policy: { maxAttempts: (ctx) => (ctx.operation === 'filter' ? 7 : 3) },
      });
      const result = await getOptions(config, { maxAttempts: 3 });
      expect(result.maxAttempts).toBe(7);
    });

    it('respects async policy for plain entries', async () => {
      const config = {
        policy: { llm: async () => ({ fast: true }) },
      };
      const result = await getOptions(config, { llm: undefined });
      expect(result.llm).toEqual({ fast: true });
    });

    it('propagates policy errors', async () => {
      const config = {
        policy: {
          x: () => {
            throw new Error('broken');
          },
        },
      };
      await expect(getOptions(config, { x: 0 })).rejects.toThrow('broken');
    });

    it('type preservation: numbers stay numbers, booleans stay booleans', async () => {
      const config = { temperature: 0.7, validate: false };
      const result = await getOptions(config, { temperature: 0.5, validate: true });
      expect(typeof result.temperature).toBe('number');
      expect(result.temperature).toBe(0.7);
      expect(typeof result.validate).toBe('boolean');
      expect(result.validate).toBe(false);
    });

    it('type preservation: objects pass through by reference', async () => {
      const format = { type: 'json_schema', json_schema: { name: 'test' } };
      const config = { responseFormat: format };
      const result = await getOptions(config, { responseFormat: undefined });
      expect(result.responseFormat).toBe(format);
    });
  });

  describe('descriptorToSchema', () => {
    it('converts a single descriptor to JSON Schema responseFormat', () => {
      const schema = descriptorToSchema({
        sentiment: {
          attribute: 'sentiment',
          values: ['positive', 'neutral', 'negative'],
          instruction: 'Classify the sentiment of the text',
        },
      });
      expect(schema.type).toBe('json_schema');
      expect(schema.json_schema.name).toBe('context_population');
      const props = schema.json_schema.schema.properties;
      expect(props.sentiment.type).toBe('string');
      expect(props.sentiment.enum).toEqual(['positive', 'neutral', 'negative']);
      expect(props.sentiment.description).toBe('Classify the sentiment of the text');
      expect(schema.json_schema.schema.required).toEqual(['sentiment']);
      expect(schema.json_schema.schema.additionalProperties).toBe(false);
    });

    it('converts multiple descriptors into multi-property schema', () => {
      const schema = descriptorToSchema({
        urgency: {
          attribute: 'urgency',
          values: ['low', 'medium', 'high'],
          instruction: 'How urgent',
        },
        topic: {
          attribute: 'topic',
          values: ['billing', 'technical', 'general'],
          instruction: 'Classify topic',
        },
      });
      const keys = Object.keys(schema.json_schema.schema.properties);
      expect(keys).toEqual(['urgency', 'topic']);
      expect(schema.json_schema.schema.required).toEqual(['urgency', 'topic']);
    });

    it('accepts a custom schema name', () => {
      const schema = descriptorToSchema({}, 'ticket_classification');
      expect(schema.json_schema.name).toBe('ticket_classification');
    });

    it('handles empty descriptors', () => {
      const schema = descriptorToSchema({});
      expect(schema.json_schema.schema.properties).toEqual({});
      expect(schema.json_schema.schema.required).toEqual([]);
    });
  });

  describe('createProgressEmitter', () => {
    it('is re-exported from progress module and callable', () => {
      expect(typeof createProgressEmitter).toBe('function');
    });

    it('emits start and complete lifecycle events', () => {
      const events = [];
      const emitter = createProgressEmitter('test-op', (e) => events.push(e), {
        operation: 'parent/test-op',
        now: new Date(),
      });
      emitter.start();
      emitter.complete({ items: 10 });
      const start = events.find((e) => e.event === ChainEvent.start);
      const complete = events.find((e) => e.event === ChainEvent.complete);
      expect(start).toBeDefined();
      expect(start.step).toBe('test-op');
      expect(complete).toBeDefined();
      expect(complete.step).toBe('test-op');
      expect(complete.items).toBe(10);
      expect(typeof complete.durationMs).toBe('number');
    });

    it('emits error event with message and type', () => {
      const events = [];
      const emitter = createProgressEmitter('failing', (e) => events.push(e));
      const err = new TypeError('bad input');
      emitter.error(err);
      const errorEvt = events.find((e) => e.event === ChainEvent.error);
      expect(errorEvt).toBeDefined();
      expect(errorEvt.error).toEqual({ message: 'bad input', type: 'TypeError' });
    });

    it('batch tracker increments processed count', () => {
      const events = [];
      const emitter = createProgressEmitter('batch-op', (e) => events.push(e));
      const done = emitter.batch(10);
      done(3);
      done(2);
      expect(done.count).toBe(5);
    });

    it('silently no-ops when callback is undefined', () => {
      const emitter = createProgressEmitter('silent', undefined);
      expect(() => {
        emitter.start();
        emitter.metrics({ event: 'test' });
        emitter.complete();
      }).not.toThrow();
    });
  });

  describe('chain lifecycle integration', () => {
    it('nameStep -> createProgressEmitter -> getOptions -> complete', async () => {
      const events = [];
      const config = {
        onProgress: (e) => events.push(e),
        compression: 'high',
        policy: {
          maxAttempts: (ctx) => (ctx.operation === 'summarize' ? 5 : 3),
        },
      };

      const runConfig = nameStep('summarize', config);
      expect(runConfig.operation).toBe('summarize');
      expect(runConfig.traceId).toBeDefined();

      const emitter = createProgressEmitter('summarize', runConfig.onProgress, runConfig);
      emitter.start();

      const mapCompression = (v) => ({ low: 0.5, high: 0.15 })[v] ?? 0.3;
      const opts = await getOptions(runConfig, {
        compression: withPolicy(mapCompression),
        maxAttempts: 3,
      });
      expect(opts.compression).toBe(0.15);
      expect(opts.maxAttempts).toBe(5);

      emitter.complete({ processedTokens: 1200 });

      const start = events.find((e) => e.event === ChainEvent.start);
      const complete = events.find((e) => e.event === ChainEvent.complete);
      expect(start).toBeDefined();
      expect(complete).toBeDefined();
      expect(complete.processedTokens).toBe(1200);
    });

    it('nested steps propagate trace context through the hierarchy', async () => {
      const parentConfig = nameStep('pipeline', {});
      const childConfig = nameStep('extract', parentConfig);
      const grandchild = nameStep('parse', childConfig);

      expect(grandchild.operation).toBe('pipeline/extract/parse');
      expect(grandchild.traceId).toBe(parentConfig.traceId);
      expect(grandchild.parentSpanId).toBe(childConfig.spanId);
      expect(grandchild.spanId).not.toBe(childConfig.spanId);
      expect(grandchild.now).toBe(parentConfig.now);
    });

    it('context builder output feeds into option resolution via config', async () => {
      const builder = createContextBuilder();
      builder.setApplication({ environment: 'production' });
      const ctx = builder.withRequest({ domain: 'medical' }).build();

      const config = nameStep('classify', {
        context: ctx,
        policy: {
          strictness: ({ operation }) => (operation === 'classify' ? 'high' : 'low'),
        },
      });

      const opts = await getOptions(config, { strictness: 'medium' });
      expect(opts.strictness).toBe('high');
      expect(config.context.request.domain).toBe('medical');
    });

    it('getOptionDetail emits telemetry through the same onProgress stream', async () => {
      const events = [];
      const onProgress = (e) => events.push(e);
      const config = nameStep('analyze', {
        onProgress,
        depth: 'deep',
      });

      const emitter = createProgressEmitter('analyze', onProgress, config);
      emitter.start();

      const { value } = await getOptionDetail('depth', config, 'shallow');
      expect(value).toBe('deep');

      emitter.complete();

      const lifecycle = events.filter(
        (e) => e.event === ChainEvent.start || e.event === ChainEvent.complete
      );
      const optionResolve = events.filter((e) => e.event === TelemetryEvent.optionResolve);
      expect(lifecycle).toHaveLength(2);
      expect(optionResolve).toHaveLength(1);
      expect(optionResolve[0].source).toBe(OptionSource.config);
    });
  });
});
