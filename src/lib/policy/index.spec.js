import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { evaluatePolicy, tracePolicy, tracePolicies } from './index.js';

describe('policy tracing', () => {
  let errorSpy;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  const context = { operation: 'test-chain/score' };
  const deps = { logger: undefined };

  describe('evaluatePolicy', () => {
    it('invokes the policy function and returns its value', async () => {
      const fn = vi.fn().mockResolvedValue('high');

      const result = await evaluatePolicy('thoroughness', fn, context, deps);

      expect(fn).toHaveBeenCalledWith(context, deps);
      expect(result).toBe('high');
    });

    it('returns fallback when policy function returns undefined', async () => {
      const fn = vi.fn().mockResolvedValue(undefined);

      const result = await evaluatePolicy('thoroughness', fn, context, deps, 'medium');

      expect(result).toBe('medium');
    });

    it('returns policy value over fallback when policy returns a value', async () => {
      const fn = vi.fn().mockResolvedValue('low');

      const result = await evaluatePolicy('thoroughness', fn, context, deps, 'medium');

      expect(result).toBe('low');
    });

    it('handles sync policy functions transparently', async () => {
      const fn = vi.fn().mockReturnValue('sync-value');

      const result = await evaluatePolicy('mode', fn, context, deps);

      expect(result).toBe('sync-value');
    });

    it('emits debug traces when VERBLETS_DEBUG is enabled', async () => {
      vi.stubEnv('VERBLETS_DEBUG', 'true');
      const fn = vi.fn().mockResolvedValue('high');

      await evaluatePolicy('thoroughness', fn, context, deps, 'medium');

      expect(errorSpy).toHaveBeenCalledWith('[policy]', 'invoke', 'thoroughness', {
        operation: 'test-chain/score',
      });
      expect(errorSpy).toHaveBeenCalledWith('[policy]', 'result', 'thoroughness', {
        operation: 'test-chain/score',
        raw: 'high',
        fallback: 'medium',
        value: 'high',
      });
    });

    it('emits no debug output when VERBLETS_DEBUG is disabled', async () => {
      delete process.env.VERBLETS_DEBUG;
      const fn = vi.fn().mockResolvedValue('high');

      await evaluatePolicy('thoroughness', fn, context, deps);

      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('traces the fallback path when policy returns undefined', async () => {
      vi.stubEnv('VERBLETS_DEBUG', 'true');
      const fn = vi.fn().mockResolvedValue(undefined);

      await evaluatePolicy('depth', fn, context, deps, 3);

      expect(errorSpy).toHaveBeenCalledWith('[policy]', 'result', 'depth', {
        operation: 'test-chain/score',
        raw: undefined,
        fallback: 3,
        value: 3,
      });
    });

    it('propagates errors from the policy function', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('provider down'));

      await expect(evaluatePolicy('mode', fn, context, deps)).rejects.toThrow('provider down');
    });
  });

  describe('tracePolicy', () => {
    it('returns a function that delegates to the original', async () => {
      const fn = vi.fn().mockResolvedValue(42);
      const traced = tracePolicy('score', fn);

      const result = await traced(context, deps);

      expect(fn).toHaveBeenCalledWith(context, deps);
      expect(result).toBe(42);
    });

    it('sets displayName for debuggability', () => {
      const traced = tracePolicy('score', () => {});

      expect(traced.displayName).toBe('traced(score)');
    });

    it('emits invoke and result traces when debug is enabled', async () => {
      vi.stubEnv('VERBLETS_DEBUG', 'true');
      const fn = vi.fn().mockResolvedValue('detailed');
      const traced = tracePolicy('analysisDepth', fn);

      await traced(context, deps);

      expect(errorSpy).toHaveBeenCalledWith('[policy]', 'invoke', 'analysisDepth', {
        operation: 'test-chain/score',
      });
      expect(errorSpy).toHaveBeenCalledWith('[policy]', 'result', 'analysisDepth', {
        operation: 'test-chain/score',
        result: 'detailed',
      });
    });

    it('emits nothing when debug is disabled', async () => {
      delete process.env.VERBLETS_DEBUG;
      const fn = vi.fn().mockResolvedValue('detailed');
      const traced = tracePolicy('analysisDepth', fn);

      await traced(context, deps);

      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('propagates errors without swallowing them', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('boom'));
      const traced = tracePolicy('score', fn);

      await expect(traced(context, deps)).rejects.toThrow('boom');
    });
  });

  describe('tracePolicies', () => {
    it('wraps function entries with tracing', async () => {
      const fn = vi.fn().mockResolvedValue('value');
      const map = tracePolicies({ thoroughness: fn });

      expect(typeof map.thoroughness).toBe('function');
      expect(map.thoroughness.displayName).toBe('traced(thoroughness)');

      const result = await map.thoroughness(context, deps);
      expect(fn).toHaveBeenCalledWith(context, deps);
      expect(result).toBe('value');
    });

    it('preserves non-function entries as-is', () => {
      const map = tracePolicies({ staticOption: 'keep-me', count: 7 });

      expect(map.staticOption).toBe('keep-me');
      expect(map.count).toBe(7);
    });

    it('returns undefined for falsy input', () => {
      expect(tracePolicies(undefined)).toBe(undefined);
      expect(tracePolicies(0)).toBe(undefined);
      expect(tracePolicies('')).toBe(undefined);
    });

    it('emits a summary trace when debug is enabled', () => {
      vi.stubEnv('VERBLETS_DEBUG', 'true');
      tracePolicies({
        thoroughness: () => 'high',
        depth: () => 3,
        staticVal: 'unchanged',
      });

      expect(errorSpy).toHaveBeenCalledWith('[policy]', 'wrapped', 3, 'policies', {
        names: ['thoroughness', 'depth', 'staticVal'],
      });
    });

    it('emits no summary when debug is disabled', () => {
      delete process.env.VERBLETS_DEBUG;
      tracePolicies({ thoroughness: () => 'high' });

      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('wraps multiple functions independently', async () => {
      vi.stubEnv('VERBLETS_DEBUG', 'true');
      const fnA = vi.fn().mockResolvedValue('a');
      const fnB = vi.fn().mockResolvedValue('b');
      const map = tracePolicies({ alpha: fnA, beta: fnB });

      await map.alpha(context, deps);
      await map.beta(context, deps);

      const invokeCallNames = errorSpy.mock.calls.filter((c) => c[1] === 'invoke').map((c) => c[2]);

      expect(invokeCallNames).toEqual(['alpha', 'beta']);
    });
  });
});
