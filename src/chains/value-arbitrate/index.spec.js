import { describe, it, expect, vi, beforeEach } from 'vitest';
import valueArbitrate from './index.js';
import callLlm from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';

vi.mock('../../lib/llm/index.js', () => ({
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
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

  describe('responseFormat', () => {
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
      const schema = configArg.responseFormat.json_schema.schema;
      expect(schema.properties.value.enum).toEqual(['standard', 'strict', 'maximum']);
    });
  });

  describe('multi-value arbitration', () => {
    const DIMS = [
      { name: 'verification', values: ['light', 'standard', 'thorough', 'maximum'] },
      { name: 'logging', values: ['minimal', 'verbose', 'full'] },
    ];

    describe('per-dimension must enforcement', () => {
      it('enforces must-floor independently per dimension', async () => {
        const result = await valueArbitrate(
          [signal('compliance', { verification: 'standard', logging: 'verbose' }, 'must')],
          {},
          DIMS
        );

        expect(result).toEqual(['standard', 'verbose']);
        expect(callLlm).not.toHaveBeenCalled();
      });

      it('takes most restrictive must per dimension when musts disagree', async () => {
        const result = await valueArbitrate(
          [
            signal('legal', { verification: 'standard', logging: 'verbose' }, 'must'),
            signal('compliance', { verification: 'thorough', logging: 'verbose' }, 'must'),
          ],
          {},
          DIMS
        );

        expect(result).toEqual(['thorough', 'verbose']);
        expect(callLlm).not.toHaveBeenCalled();
      });

      it('returns most restrictive value when must is at the maximum per dimension', async () => {
        const result = await valueArbitrate(
          [signal('lockdown', { verification: 'maximum', logging: 'full' }, 'must')],
          {},
          DIMS
        );

        expect(result).toEqual(['maximum', 'full']);
        expect(callLlm).not.toHaveBeenCalled();
      });
    });

    describe('may-mediation across dimensions', () => {
      it('returns agreed values without AI when all mays agree per dimension', async () => {
        const result = await valueArbitrate(
          [
            signal('product', { verification: 'standard', logging: 'verbose' }, 'may', {
              weight: 0.3,
            }),
            signal('safety', { verification: 'standard', logging: 'verbose' }, 'may', {
              weight: 0.7,
            }),
          ],
          {},
          DIMS
        );

        expect(result).toEqual(['standard', 'verbose']);
        expect(callLlm).not.toHaveBeenCalled();
      });

      it('calls AI to mediate when mays disagree across dimensions', async () => {
        callLlm.mockResolvedValueOnce({ verification: 'standard', logging: 'verbose' });

        const result = await valueArbitrate(
          [
            signal('product', { verification: 'light', logging: 'minimal' }, 'may', {
              weight: 0.3,
              prompt: 'minimize friction for trial users',
            }),
            signal('safety', { verification: 'standard', logging: 'verbose' }, 'may', {
              weight: 0.7,
              prompt: 'elevated risk segment',
            }),
          ],
          {},
          DIMS
        );

        expect(result).toEqual(['standard', 'verbose']);
        expect(callLlm).toHaveBeenCalledTimes(1);

        const promptArg = callLlm.mock.calls[0][0];
        expect(promptArg).toContain('DIMENSION "verification"');
        expect(promptArg).toContain('DIMENSION "logging"');
        expect(promptArg).toContain('minimize friction');
        expect(promptArg).toContain('elevated risk');
      });

      it('only mediates dimensions that actually disagree', async () => {
        callLlm.mockResolvedValueOnce({ logging: 'verbose' });

        const result = await valueArbitrate(
          [
            signal('product', { verification: 'standard', logging: 'minimal' }, 'may', {
              weight: 0.4,
            }),
            signal('safety', { verification: 'standard', logging: 'verbose' }, 'may', {
              weight: 0.6,
            }),
          ],
          {},
          DIMS
        );

        expect(result).toEqual(['standard', 'verbose']);
        expect(callLlm).toHaveBeenCalledTimes(1);

        const configArg = callLlm.mock.calls[0][1];
        const schema = configArg.responseFormat.json_schema.schema;
        expect(schema.properties).toHaveProperty('logging');
        expect(schema.properties).not.toHaveProperty('verification');
        expect(schema.required).toEqual(['logging']);
      });

      it('includes weights and prompts in multi-dimension mediation prompt', async () => {
        callLlm.mockResolvedValueOnce({ verification: 'standard', logging: 'verbose' });

        await valueArbitrate(
          [
            signal('a', { verification: 'light', logging: 'minimal' }, 'may', {
              weight: 0.3,
              prompt: 'context-a',
            }),
            signal('b', { verification: 'standard', logging: 'verbose' }, 'may', {
              weight: 0.7,
              prompt: 'context-b',
            }),
          ],
          {},
          DIMS
        );

        const promptArg = callLlm.mock.calls[0][0];
        expect(promptArg).toContain('weight: 0.3');
        expect(promptArg).toContain('weight: 0.7');
        expect(promptArg).toContain('context-a');
        expect(promptArg).toContain('context-b');
      });
    });

    describe('combined must + may across dimensions', () => {
      it('applies must-floor then mediates remaining mays per dimension', async () => {
        callLlm.mockResolvedValueOnce({ verification: 'thorough' });

        const result = await valueArbitrate(
          [
            signal('legal', { verification: 'standard', logging: 'verbose' }, 'must'),
            signal('product', { verification: 'light', logging: 'verbose' }, 'may', {
              weight: 0.3,
            }),
            signal('safety', { verification: 'thorough', logging: 'verbose' }, 'may', {
              weight: 0.7,
            }),
          ],
          {},
          DIMS
        );

        // logging: both mays agree on verbose (above floor) → deterministic
        expect(result[1]).toBe('verbose');
        // verification: product's light is below floor, safety's thorough is viable
        // but standard and maximum are also candidates — AI mediates among candidates
        expect(DIMS[0].values.indexOf(result[0])).toBeGreaterThanOrEqual(
          DIMS[0].values.indexOf('standard')
        );
      });

      it('skips AI when must-floor leaves one candidate per dimension', async () => {
        const result = await valueArbitrate(
          [
            signal('lockdown', { verification: 'maximum', logging: 'full' }, 'must'),
            signal('product', { verification: 'light', logging: 'minimal' }, 'may'),
          ],
          {},
          DIMS
        );

        expect(result).toEqual(['maximum', 'full']);
        expect(callLlm).not.toHaveBeenCalled();
      });
    });

    describe('cross-value constraints', () => {
      it('raises floor on a dimension when constraint triggers', async () => {
        const result = await valueArbitrate(
          [signal('compliance', { verification: 'thorough', logging: 'minimal' }, 'must')],
          {},
          DIMS,
          {
            constraints: [
              {
                name: 'high-verification-needs-logging',
                enforce: (selections) => {
                  if (['thorough', 'maximum'].includes(selections.verification)) {
                    return { logging: 'verbose' };
                  }
                },
              },
            ],
          }
        );

        expect(result).toEqual(['thorough', 'verbose']);
        expect(callLlm).not.toHaveBeenCalled();
      });

      it('does not raise floor when constraint does not trigger', async () => {
        const result = await valueArbitrate(
          [signal('compliance', { verification: 'light', logging: 'minimal' }, 'must')],
          {},
          DIMS,
          {
            constraints: [
              {
                name: 'high-verification-needs-logging',
                enforce: (selections) => {
                  if (['thorough', 'maximum'].includes(selections.verification)) {
                    return { logging: 'verbose' };
                  }
                },
              },
            ],
          }
        );

        expect(result).toEqual(['light', 'minimal']);
        expect(callLlm).not.toHaveBeenCalled();
      });

      it('ignores constraint that requires value below existing must-floor', async () => {
        const result = await valueArbitrate(
          [signal('lockdown', { verification: 'maximum', logging: 'full' }, 'must')],
          {},
          DIMS,
          {
            constraints: [
              {
                name: 'reduce-logging',
                enforce: () => ({ logging: 'minimal' }),
              },
            ],
          }
        );

        expect(result).toEqual(['maximum', 'full']);
        expect(callLlm).not.toHaveBeenCalled();
      });

      it('preserves existing selection when constraint raises floor below it', async () => {
        const result = await valueArbitrate(
          [
            signal('compliance', { verification: 'thorough' }, 'must'),
            signal('observability', { logging: 'full' }, 'must'),
          ],
          {},
          DIMS,
          {
            constraints: [
              {
                name: 'high-verification-needs-logging',
                enforce: (selections) => {
                  if (selections.verification === 'thorough') {
                    return { logging: 'verbose' };
                  }
                },
              },
            ],
          }
        );

        // logging must-floor is already at 'full' (more restrictive than 'verbose')
        // constraint requires 'verbose' which is below 'full', so no change
        expect(result).toEqual(['thorough', 'full']);
      });

      it('applies multiple constraints in sequence', async () => {
        const result = await valueArbitrate(
          [
            signal(
              'base',
              { verification: 'standard', logging: 'minimal', retention: '30d' },
              'must'
            ),
          ],
          {},
          [
            { name: 'verification', values: ['light', 'standard', 'thorough', 'maximum'] },
            { name: 'logging', values: ['minimal', 'verbose', 'full'] },
            { name: 'retention', values: ['7d', '30d', '90d', '365d'] },
          ],
          {
            constraints: [
              {
                name: 'standard-needs-verbose',
                enforce: (selections) => {
                  if (selections.verification === 'standard') {
                    return { logging: 'verbose' };
                  }
                },
              },
              {
                name: 'verbose-logging-needs-retention',
                enforce: (selections) => {
                  if (selections.logging === 'verbose') {
                    return { retention: '90d' };
                  }
                },
              },
            ],
          }
        );

        expect(result).toEqual(['standard', 'verbose', '90d']);
        expect(callLlm).not.toHaveBeenCalled();
      });
    });

    describe('partial signals', () => {
      it('handles signals that only have opinions on some dimensions', async () => {
        const result = await valueArbitrate(
          [
            signal('compliance', { verification: 'standard' }, 'must'),
            signal('observability', { logging: 'verbose' }, 'must'),
          ],
          {},
          DIMS
        );

        expect(result).toEqual(['standard', 'verbose']);
        expect(callLlm).not.toHaveBeenCalled();
      });

      it('uses full candidate range for dimensions with no signals', async () => {
        callLlm.mockResolvedValueOnce({ logging: 'verbose' });

        const result = await valueArbitrate(
          [
            signal('compliance', { verification: 'standard' }, 'must'),
            signal('a', { logging: 'minimal' }, 'may'),
            signal('b', { logging: 'verbose' }, 'may'),
          ],
          {},
          DIMS
        );

        // verification: only must, no mays → deterministic at floor
        // logging: mays disagree → AI mediates
        expect(result[0]).toBe('standard');
        expect(result[1]).toBe('verbose');
      });
    });

    describe('signal evaluation', () => {
      it('evaluates multi-value signal functions concurrently with context', async () => {
        const ctx = { kind: 'tenant', key: 'org-123' };
        const valueFnA = vi
          .fn()
          .mockResolvedValue({ verification: 'standard', logging: 'verbose' });
        const valueFnB = vi
          .fn()
          .mockResolvedValue({ verification: 'standard', logging: 'verbose' });

        await valueArbitrate(
          [signal('a', valueFnA, 'may'), signal('b', valueFnB, 'may')],
          ctx,
          DIMS
        );

        expect(valueFnA).toHaveBeenCalledWith(ctx);
        expect(valueFnB).toHaveBeenCalledWith(ctx);
      });
    });

    describe('edge cases', () => {
      it('falls back to first candidate per dimension when AI returns unexpected values', async () => {
        callLlm.mockResolvedValueOnce({ verification: 'nonsense', logging: 'garbage' });

        const result = await valueArbitrate(
          [
            signal('a', { verification: 'light', logging: 'minimal' }, 'may'),
            signal('b', { verification: 'standard', logging: 'verbose' }, 'may'),
          ],
          {},
          DIMS
        );

        expect(result).toEqual(['light', 'minimal']);
      });

      it('works with numeric dimension values', async () => {
        const numDims = [
          { name: 'concurrency', values: [1, 5, 10, 50] },
          { name: 'timeout', values: [1000, 5000, 30000] },
        ];

        const result = await valueArbitrate(
          [signal('plan-limit', { concurrency: 10, timeout: 5000 }, 'must')],
          {},
          numDims
        );

        expect(result).toEqual([10, 5000]);
        expect(callLlm).not.toHaveBeenCalled();
      });

      it('returns array of selected values in dimension order', async () => {
        const threeDims = [
          { name: 'alpha', values: ['a1', 'a2', 'a3'] },
          { name: 'beta', values: ['b1', 'b2', 'b3'] },
          { name: 'gamma', values: ['g1', 'g2', 'g3'] },
        ];

        const result = await valueArbitrate(
          [signal('s', { alpha: 'a2', beta: 'b1', gamma: 'g3' }, 'must')],
          {},
          threeDims
        );

        expect(result).toEqual(['a2', 'b1', 'g3']);
      });
    });

    describe('config threading', () => {
      it('passes config through to callLlm in multi-value mode', async () => {
        callLlm.mockResolvedValueOnce({ verification: 'standard', logging: 'verbose' });

        await valueArbitrate(
          [
            signal('a', { verification: 'light', logging: 'minimal' }, 'may'),
            signal('b', { verification: 'standard', logging: 'verbose' }, 'may'),
          ],
          {},
          DIMS,
          { llm: 'reasoning' }
        );

        expect(retry).toHaveBeenCalledTimes(1);
        const retryOpts = retry.mock.calls[0][1];
        expect(retryOpts.label).toBe('value-arbitrate');
        expect(retryOpts.config).toBeDefined();
      });

      it('passes instruction to multi-dimension mediation prompt', async () => {
        callLlm.mockResolvedValueOnce({ verification: 'standard', logging: 'verbose' });

        await valueArbitrate(
          [
            signal('a', { verification: 'light', logging: 'minimal' }, 'may'),
            signal('b', { verification: 'standard', logging: 'verbose' }, 'may'),
          ],
          {},
          DIMS,
          { instruction: 'Prefer stricter values in uncertain conditions' }
        );

        const promptArg = callLlm.mock.calls[0][0];
        expect(promptArg).toContain('Prefer stricter values in uncertain conditions');
      });
    });

    describe('responseFormat', () => {
      it('sends a JSON schema with per-dimension enum constraints', async () => {
        callLlm.mockResolvedValueOnce({ verification: 'thorough', logging: 'verbose' });

        await valueArbitrate(
          [
            signal('legal', { verification: 'standard', logging: 'verbose' }, 'must'),
            signal('a', { verification: 'thorough', logging: 'full' }, 'may'),
            signal('b', { verification: 'maximum', logging: 'verbose' }, 'may'),
          ],
          {},
          DIMS
        );

        const configArg = callLlm.mock.calls[0][1];
        const schema = configArg.responseFormat.json_schema.schema;
        expect(schema.properties.verification.enum).toEqual(['standard', 'thorough', 'maximum']);
        expect(schema.properties.logging.enum).toEqual(['verbose', 'full']);
        expect(configArg.responseFormat.json_schema.name).toBe('value_arbitrate_multi');
      });
    });
  });
});
