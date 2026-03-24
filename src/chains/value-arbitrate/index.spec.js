import { describe, it, expect, vi, beforeEach } from 'vitest';
import valueArbitrate from './index.js';
import callLlm from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(),
}));

vi.mock('../../lib/retry/index.js', () => ({
  default: vi.fn(async (fn) => fn()),
}));

const VALUES = ['minimal', 'standard', 'strict', 'maximum'];

const signal = (name, value, strictness, extras = {}) => ({
  name,
  value: typeof value === 'function' ? value : () => value,
  strictness,
  ...extras,
});

beforeEach(() => {
  vi.resetAllMocks();
  retry.mockImplementation(async (fn) => fn());
});

describe('valueArbitrate', () => {
  describe('must-floor enforcement', () => {
    it('returns the must value when a single must is the only signal', async () => {
      const result = await valueArbitrate([signal('legal-floor', 'standard', 'must')], {}, VALUES);

      expect(result).toBe('standard');
      expect(callLlm).not.toHaveBeenCalled();
    });

    it('takes the most restrictive must when multiple musts disagree', async () => {
      const result = await valueArbitrate(
        [signal('legal-floor', 'standard', 'must'), signal('compliance', 'strict', 'must')],
        {},
        VALUES
      );

      expect(result).toBe('strict');
      expect(callLlm).not.toHaveBeenCalled();
    });

    it('returns the most restrictive value when must is at the maximum', async () => {
      const result = await valueArbitrate([signal('lockdown', 'maximum', 'must')], {}, VALUES);

      expect(result).toBe('maximum');
      expect(callLlm).not.toHaveBeenCalled();
    });

    it('eliminates candidates below the must-floor before may-mediation', async () => {
      const result = await valueArbitrate(
        [
          signal('legal-floor', 'standard', 'must'),
          signal('product', 'minimal', 'may', { weight: 0.5 }),
          signal('safety', 'strict', 'may', { weight: 0.8 }),
        ],
        {},
        VALUES
      );

      // product's minimal is below the floor — only safety's strict is viable among mays
      // single viable may returns deterministically (no AI call)
      expect(result).toBe('strict');
      expect(callLlm).not.toHaveBeenCalled();
    });
  });

  describe('may-mediation', () => {
    it('returns the agreed value when all mays agree (no AI call)', async () => {
      const result = await valueArbitrate(
        [
          signal('product', 'standard', 'may', { weight: 0.3 }),
          signal('safety', 'standard', 'may', { weight: 0.7 }),
        ],
        {},
        VALUES
      );

      expect(result).toBe('standard');
      expect(callLlm).not.toHaveBeenCalled();
    });

    it('calls AI to mediate when mays disagree', async () => {
      callLlm.mockResolvedValueOnce('standard');

      const result = await valueArbitrate(
        [
          signal('product', 'minimal', 'may', {
            weight: 0.3,
            prompt: 'lighter touch for engaged users',
          }),
          signal('safety', 'standard', 'may', {
            weight: 0.7,
            prompt: 'elevated risk for flagged segments',
          }),
        ],
        {},
        VALUES
      );

      expect(result).toBe('standard');
      expect(callLlm).toHaveBeenCalledTimes(1);

      const promptArg = callLlm.mock.calls[0][0];
      expect(promptArg).toContain('product');
      expect(promptArg).toContain('safety');
      expect(promptArg).toContain('lighter touch');
      expect(promptArg).toContain('elevated risk');
      expect(promptArg).toContain('0.3');
      expect(promptArg).toContain('0.7');
    });

    it('includes weights and prompt context in mediation prompt', async () => {
      callLlm.mockResolvedValueOnce('strict');

      await valueArbitrate(
        [
          signal('a', 'standard', 'may', { weight: 0.4, prompt: 'context-a' }),
          signal('b', 'strict', 'may', { weight: 0.6, prompt: 'context-b' }),
        ],
        {},
        VALUES
      );

      const promptArg = callLlm.mock.calls[0][0];
      expect(promptArg).toContain('weight: 0.4');
      expect(promptArg).toContain('weight: 0.6');
      expect(promptArg).toContain('context-a');
      expect(promptArg).toContain('context-b');
    });
  });

  describe('combined must + may', () => {
    it('applies must-floor then mediates remaining mays', async () => {
      callLlm.mockResolvedValueOnce('strict');

      const result = await valueArbitrate(
        [
          signal('legal-floor', 'standard', 'must'),
          signal('product', 'minimal', 'may', { weight: 0.3 }),
          signal('safety', 'strict', 'may', { weight: 0.6 }),
        ],
        {},
        VALUES
      );

      // product's minimal is below floor — only safety's strict is viable among mays
      // But standard and maximum are also candidates from the floor
      expect(VALUES.indexOf(result)).toBeGreaterThanOrEqual(VALUES.indexOf('standard'));
    });

    it('skips AI when must-floor leaves only one candidate', async () => {
      const result = await valueArbitrate(
        [
          signal('compliance', 'maximum', 'must'),
          signal('product', 'minimal', 'may'),
          signal('safety', 'standard', 'may'),
        ],
        {},
        VALUES
      );

      expect(result).toBe('maximum');
      expect(callLlm).not.toHaveBeenCalled();
    });
  });

  describe('signal evaluation', () => {
    it('evaluates signal value functions concurrently with the context', async () => {
      const ctx = { kind: 'tenant', key: 'org-123', plan: 'enterprise' };
      const valueFnA = vi.fn().mockResolvedValue('standard');
      const valueFnB = vi.fn().mockResolvedValue('standard');

      await valueArbitrate(
        [signal('a', valueFnA, 'may'), signal('b', valueFnB, 'may')],
        ctx,
        VALUES
      );

      expect(valueFnA).toHaveBeenCalledWith(ctx);
      expect(valueFnB).toHaveBeenCalledWith(ctx);
    });

    it('handles async signal value functions', async () => {
      const slowSignal = signal(
        'slow',
        () => new Promise((resolve) => setTimeout(() => resolve('strict'), 10)),
        'must'
      );

      const result = await valueArbitrate([slowSignal], {}, VALUES);

      expect(result).toBe('strict');
    });
  });

  describe('deterministic fast path', () => {
    it('returns the floor value when no mays exist', async () => {
      const result = await valueArbitrate([signal('legal', 'standard', 'must')], {}, VALUES);

      expect(result).toBe('standard');
      expect(callLlm).not.toHaveBeenCalled();
    });

    it('returns first candidate when no mays have opinions in candidate space', async () => {
      const result = await valueArbitrate(
        [signal('legal', 'strict', 'must'), signal('product', 'minimal', 'may')],
        {},
        VALUES
      );

      // minimal is below the strict floor, so no viable mays
      // returns the floor (strict)
      expect(result).toBe('strict');
      expect(callLlm).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('throws when signals array is empty', async () => {
      await expect(valueArbitrate([], {}, VALUES)).rejects.toThrow(
        'valueArbitrate requires at least one signal'
      );
    });

    it('throws when values array is empty', async () => {
      await expect(valueArbitrate([signal('a', 'x', 'may')], {}, [])).rejects.toThrow(
        'valueArbitrate requires at least one value'
      );
    });

    it('handles a single value in the values array', async () => {
      const result = await valueArbitrate([signal('only', 'locked', 'must')], {}, ['locked']);

      expect(result).toBe('locked');
    });

    it('falls back to first candidate when AI returns unexpected value', async () => {
      callLlm.mockResolvedValueOnce('nonsense');

      const result = await valueArbitrate(
        [signal('a', 'minimal', 'may'), signal('b', 'standard', 'may')],
        {},
        VALUES
      );

      expect(result).toBe('minimal');
    });

    it('works with numeric values', async () => {
      const numValues = [100, 500, 1000, 5000];

      const result = await valueArbitrate([signal('plan-limit', 1000, 'must')], {}, numValues);

      expect(result).toBe(1000);
      expect(callLlm).not.toHaveBeenCalled();
    });

    it('handles must value not in the values array gracefully', async () => {
      // If a must returns a value not in the array, floor index is -1
      // so all values remain candidates
      callLlm.mockResolvedValueOnce('standard');

      const result = await valueArbitrate(
        [signal('bogus-must', 'unknown', 'must'), signal('preference', 'standard', 'may')],
        {},
        VALUES
      );

      // No floor applied since the must value isn't in the ordered list
      expect(result).toBe('standard');
    });
  });

  describe('config threading', () => {
    it('passes config through to callLlm via retry', async () => {
      callLlm.mockResolvedValueOnce('standard');

      await valueArbitrate(
        [signal('a', 'minimal', 'may'), signal('b', 'standard', 'may')],
        {},
        VALUES,
        { llm: 'reasoning' }
      );

      expect(retry).toHaveBeenCalledTimes(1);
      const retryOpts = retry.mock.calls[0][1];
      expect(retryOpts.label).toBe('value-arbitrate');
      expect(retryOpts.config).toBeDefined();
    });

    it('passes instruction to mediation prompt', async () => {
      callLlm.mockResolvedValueOnce('strict');

      await valueArbitrate(
        [signal('a', 'standard', 'may'), signal('b', 'strict', 'may')],
        {},
        VALUES,
        { instruction: 'Prefer stricter values in uncertain conditions' }
      );

      const promptArg = callLlm.mock.calls[0][0];
      expect(promptArg).toContain('Prefer stricter values in uncertain conditions');
    });
  });

  describe('response_format', () => {
    it('sends a JSON schema constraining to candidate values', async () => {
      callLlm.mockResolvedValueOnce('strict');

      await valueArbitrate(
        [
          signal('legal', 'standard', 'must'),
          signal('a', 'strict', 'may'),
          signal('b', 'maximum', 'may'),
        ],
        {},
        VALUES
      );

      const configArg = callLlm.mock.calls[0][1];
      const schema = configArg.response_format.json_schema.schema;
      expect(schema.properties.value.enum).toEqual(['standard', 'strict', 'maximum']);
    });
  });
});
