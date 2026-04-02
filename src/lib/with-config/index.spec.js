import { describe, it, expect } from 'vitest';
import withConfig from './index.js';

const base = { modelService: 'ms', getRedis: 'redis' };

describe('withConfig', () => {
  describe('regular functions', () => {
    it('merges config into existing last object arg', () => {
      const fn = (a, b, config) => config;
      const bound = withConfig(base, fn);
      const result = bound('x', 'y', { batchSize: 5 });
      expect(result).toEqual({ modelService: 'ms', getRedis: 'redis', batchSize: 5 });
    });

    it('appends config when no object arg is present', () => {
      const fn = (a, config) => config;
      const bound = withConfig(base, fn);
      const result = bound('hello');
      expect(result).toEqual({ modelService: 'ms', getRedis: 'redis' });
    });

    it('user config overrides base config', () => {
      const fn = (text, config) => config;
      const bound = withConfig(base, fn);
      const result = bound('x', { modelService: 'custom', extra: true });
      expect(result.modelService).toBe('custom');
      expect(result.getRedis).toBe('redis');
      expect(result.extra).toBe(true);
    });

    it('does not treat arrays as config objects', () => {
      const fn = (list, config) => config;
      const bound = withConfig(base, fn);
      const result = bound(['a', 'b']);
      expect(result).toEqual({ modelService: 'ms', getRedis: 'redis' });
    });

    it('does not treat Dates as config objects', () => {
      const fn = (date, config) => config;
      const bound = withConfig(base, fn);
      const result = bound(new Date());
      expect(result).toEqual({ modelService: 'ms', getRedis: 'redis' });
    });

    it('preserves function name', () => {
      function myFilter(list, instructions, config) {
        return config;
      }
      const bound = withConfig(base, myFilter);
      expect(bound.name).toBe('myFilter');
    });
  });

  describe('variadic functions (fn.length === 0)', () => {
    it('passes through without wrapping', () => {
      const pipe =
        (...fns) =>
        (x) =>
          fns.reduce((acc, f) => f(acc), x);
      const result = withConfig(base, pipe);
      expect(result).toBe(pipe);
    });

    it('passes through no-arg functions', () => {
      const warmup = () => 'ready';
      const result = withConfig(base, warmup);
      expect(result).toBe(warmup);
    });
  });

  describe('classes', () => {
    it('creates a subclass that merges config into constructor', () => {
      class MyChain {
        constructor(text, options = {}) {
          this.text = text;
          this.options = options;
        }
      }
      const Bound = withConfig(base, MyChain);
      const instance = new Bound('hello', { temperature: 0.5 });
      expect(instance.text).toBe('hello');
      expect(instance.options.modelService).toBe('ms');
      expect(instance.options.temperature).toBe(0.5);
    });

    it('appends config when constructor has no object arg', () => {
      class MyChain {
        constructor(text, config) {
          this.text = text;
          this.config = config;
        }
      }
      const Bound = withConfig(base, MyChain);
      const instance = new Bound('hello');
      expect(instance.config).toEqual({ modelService: 'ms', getRedis: 'redis' });
    });

    it('preserves class name', () => {
      class SummaryMap {
        constructor(opts) {
          this.opts = opts;
        }
      }
      const Bound = withConfig(base, SummaryMap);
      expect(Bound.name).toBe('SummaryMap');
    });

    it('preserves instanceof', () => {
      class MyChain {
        constructor(opts) {
          this.opts = opts;
        }
      }
      const Bound = withConfig(base, MyChain);
      const instance = new Bound({});
      expect(instance).toBeInstanceOf(MyChain);
    });
  });

  describe('static methods', () => {
    it('copies and wraps static methods', () => {
      function filter(list, instructions, config) {
        return config;
      }
      filter.with = function (criteria, config) {
        return config;
      };
      const bound = withConfig(base, filter);
      expect(typeof bound.with).toBe('function');
      const result = bound.with('keep short', { extra: true });
      expect(result.modelService).toBe('ms');
      expect(result.extra).toBe(true);
    });

    it('copies non-function static properties as-is', () => {
      function scale(list, config) {
        return config;
      }
      scale.MODES = ['linear', 'log'];
      const bound = withConfig(base, scale);
      expect(bound.MODES).toEqual(['linear', 'log']);
    });
  });

  describe('non-functions', () => {
    it('passes through strings', () => {
      expect(withConfig(base, 'hello')).toBe('hello');
    });

    it('passes through objects', () => {
      const obj = { a: 1 };
      expect(withConfig(base, obj)).toBe(obj);
    });

    it('passes through undefined', () => {
      expect(withConfig(base, undefined)).toBeUndefined();
    });
  });
});
