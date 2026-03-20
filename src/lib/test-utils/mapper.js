import { describe, expect, it } from 'vitest';

/**
 * Test a mapper function that converts 'low'|'med'|'high' → object.
 *
 * Asserts:
 * - All levels produce objects with identical key sets
 * - undefined returns a defined object (default)
 * - Raw objects pass through unchanged (power-consumer pattern)
 * - Unknown strings fall back to the default
 *
 * @param {string} name - Describe block label (e.g. 'mapEffort')
 * @param {Function} mapFn - The mapper under test
 * @param {Object} [options]
 * @param {Function} [options.extra] - Receives (mapFn, describe, it, expect) for additional tests
 */
export function testObjectMapper(name, mapFn, { extra } = {}) {
  describe(name, () => {
    it('all levels return same shape', () => {
      const keys = ['low', 'med', 'high'].map((l) => Object.keys(mapFn(l)).sort());
      expect(keys[0]).toEqual(keys[1]);
      expect(keys[1]).toEqual(keys[2]);
    });

    it('undefined returns default', () => {
      expect(mapFn(undefined)).toBeDefined();
      expect(typeof mapFn(undefined)).toBe('object');
    });

    it('passes through object for power consumers', () => {
      const custom = { a: 1, b: 2 };
      expect(mapFn(custom)).toBe(custom);
    });

    it('unknown string falls back to default', () => {
      expect(mapFn('zzz')).toEqual(mapFn(undefined));
    });

    if (extra) extra(mapFn, { describe, it, expect });
  });
}

/**
 * Test a mapper function that converts 'low'|'med'|'high' → number.
 *
 * Asserts:
 * - All levels produce distinct numeric values
 * - undefined returns a defined value (default)
 * - Raw numbers pass through unchanged
 * - Unknown strings fall back to the default
 *
 * @param {string} name - Describe block label (e.g. 'mapCompression')
 * @param {Function} mapFn - The mapper under test
 * @param {Object} [options]
 * @param {'asc'|'desc'} [options.order] - If set, asserts low < med < high ('asc') or high < med < low ('desc')
 * @param {Function} [options.extra] - Receives (mapFn, {describe, it, expect}) for additional tests
 */
export function testNumericMapper(name, mapFn, { order, extra } = {}) {
  describe(name, () => {
    it('produces distinct values across levels', () => {
      const values = ['low', 'med', 'high'].map(mapFn);
      expect(new Set(values).size).toBe(3);
    });

    it('undefined returns default', () => {
      expect(mapFn(undefined)).toBeDefined();
    });

    it('passes through raw numbers', () => {
      expect(mapFn(0.42)).toBe(0.42);
    });

    it('unknown string falls back to default', () => {
      expect(mapFn('zzz')).toBe(mapFn(undefined));
    });

    if (order === 'asc') {
      it('low < med < high', () => {
        expect(mapFn('low')).toBeLessThan(mapFn('med'));
        expect(mapFn('med')).toBeLessThan(mapFn('high'));
      });
    }

    if (order === 'desc') {
      it('high < med < low', () => {
        expect(mapFn('high')).toBeLessThan(mapFn('med'));
        expect(mapFn('med')).toBeLessThan(mapFn('low'));
      });
    }

    if (extra) extra(mapFn, { describe, it, expect });
  });
}

/**
 * Test a mapper function that converts 'low'|'med'|'high' → string|undefined.
 * Used for prompt-shaping options (divergence, creativity, tolerance, etc.)
 *
 * Asserts:
 * - Known levels produce distinct defined values
 * - undefined returns undefined (no default guidance)
 * - Unknown strings return undefined (no fallback)
 * - Raw strings pass through unchanged
 *
 * @param {string} name - Describe block label (e.g. 'mapDivergence')
 * @param {Function} mapFn - The mapper under test
 * @param {Object} [options]
 * @param {string[]} [options.levels] - Override level names (default: ['low', 'med', 'high'])
 * @param {Function} [options.extra] - Receives (mapFn, {describe, it, expect}) for additional tests
 */
export function testStringMapper(name, mapFn, { levels = ['low', 'med', 'high'], extra } = {}) {
  describe(name, () => {
    it('produces distinct values for known levels', () => {
      const values = levels.map(mapFn).filter((v) => v !== undefined);
      expect(new Set(values).size).toBe(values.length);
    });

    it('undefined returns undefined', () => {
      expect(mapFn(undefined)).toBeUndefined();
    });

    it('unknown string returns undefined', () => {
      expect(mapFn('zzz')).toBeUndefined();
    });

    if (extra) extra(mapFn, { describe, it, expect });
  });
}

/**
 * Test a mapper function that converts 'low'|'med'|'high' → enum string (always defined).
 * Used for validating mappers (anchoring, canonicalization with defined default).
 *
 * Asserts:
 * - All levels produce distinct defined values
 * - undefined returns a defined default
 * - Unknown strings fall back to the default
 *
 * @param {string} name - Describe block label (e.g. 'mapAnchoring')
 * @param {Function} mapFn - The mapper under test
 * @param {Object} [options]
 * @param {Function} [options.extra] - Receives (mapFn, {describe, it, expect}) for additional tests
 */
export function testEnumMapper(name, mapFn, { extra } = {}) {
  describe(name, () => {
    it('produces distinct values across levels', () => {
      const values = ['low', 'med', 'high'].map(mapFn);
      expect(new Set(values).size).toBe(3);
    });

    it('undefined returns default', () => {
      expect(mapFn(undefined)).toBeDefined();
    });

    it('unknown string falls back to default', () => {
      expect(mapFn('zzz')).toBe(mapFn(undefined));
    });

    if (extra) extra(mapFn, { describe, it, expect });
  });
}
