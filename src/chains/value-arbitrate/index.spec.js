import { vi, beforeEach, expect } from 'vitest';
import valueArbitrate from './index.js';
import callLlm from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import { runTable, equals, all, throws } from '../../lib/examples-runner/index.js';

vi.mock('../../lib/llm/index.js', () => ({
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
  default: vi.fn(),
}));

vi.mock('../../lib/retry/index.js', () => ({ default: vi.fn(async (fn) => fn()) }));

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

const expectNoLlm = () => () => expect(callLlm).not.toHaveBeenCalled();

// ─── single-value: must-floor enforcement ────────────────────────────────

runTable({
  describe: 'valueArbitrate — must-floor enforcement',
  examples: [
    {
      name: 'returns the must value when a single must is the only signal',
      inputs: { signals: [signal('legal-floor', 'standard', 'must')] },
      check: all(equals('standard'), expectNoLlm()),
    },
    {
      name: 'takes the most restrictive must when multiple musts disagree',
      inputs: {
        signals: [
          signal('legal-floor', 'standard', 'must'),
          signal('compliance', 'strict', 'must'),
        ],
      },
      check: all(equals('strict'), expectNoLlm()),
    },
    {
      name: 'returns the most restrictive value when must is at the maximum',
      inputs: { signals: [signal('lockdown', 'maximum', 'must')] },
      check: all(equals('maximum'), expectNoLlm()),
    },
    {
      name: 'eliminates candidates below the must-floor before may-mediation',
      inputs: {
        signals: [
          signal('legal-floor', 'standard', 'must'),
          signal('product', 'minimal', 'may', { weight: 0.5 }),
          signal('safety', 'strict', 'may', { weight: 0.8 }),
        ],
      },
      check: all(equals('strict'), expectNoLlm()),
    },
  ],
  process: ({ signals }) => valueArbitrate(signals, {}, VALUES),
});

// ─── may-mediation ───────────────────────────────────────────────────────

runTable({
  describe: 'valueArbitrate — may-mediation',
  examples: [
    {
      name: 'returns the agreed value when all mays agree (no AI call)',
      inputs: {
        signals: [
          signal('product', 'standard', 'may', { weight: 0.3 }),
          signal('safety', 'standard', 'may', { weight: 0.7 }),
        ],
      },
      check: all(equals('standard'), expectNoLlm()),
    },
    {
      name: 'calls AI to mediate when mays disagree',
      inputs: {
        signals: [
          signal('product', 'minimal', 'may', {
            weight: 0.3,
            prompt: 'lighter touch for engaged users',
          }),
          signal('safety', 'standard', 'may', {
            weight: 0.7,
            prompt: 'elevated risk for flagged segments',
          }),
        ],
        preMock: () => callLlm.mockResolvedValueOnce('standard'),
      },
      check: all(equals('standard'), () => {
        expect(callLlm).toHaveBeenCalledTimes(1);
        const promptArg = callLlm.mock.calls[0][0];
        expect(promptArg).toContain('product');
        expect(promptArg).toContain('safety');
        expect(promptArg).toContain('lighter touch');
        expect(promptArg).toContain('elevated risk');
        expect(promptArg).toContain('0.3');
        expect(promptArg).toContain('0.7');
      }),
    },
    {
      name: 'includes weights and prompt context in mediation prompt',
      inputs: {
        signals: [
          signal('a', 'standard', 'may', { weight: 0.4, prompt: 'context-a' }),
          signal('b', 'strict', 'may', { weight: 0.6, prompt: 'context-b' }),
        ],
        preMock: () => callLlm.mockResolvedValueOnce('strict'),
      },
      check: () => {
        const promptArg = callLlm.mock.calls[0][0];
        expect(promptArg).toContain('weight: 0.4');
        expect(promptArg).toContain('weight: 0.6');
        expect(promptArg).toContain('context-a');
        expect(promptArg).toContain('context-b');
      },
    },
  ],
  process: async ({ signals, preMock }) => {
    if (preMock) preMock();
    return valueArbitrate(signals, {}, VALUES);
  },
});

// ─── combined must + may ────────────────────────────────────────────────

runTable({
  describe: 'valueArbitrate — combined must + may',
  examples: [
    {
      name: 'applies must-floor then mediates remaining mays',
      inputs: {
        signals: [
          signal('legal-floor', 'standard', 'must'),
          signal('product', 'minimal', 'may', { weight: 0.3 }),
          signal('safety', 'strict', 'may', { weight: 0.6 }),
        ],
        preMock: () => callLlm.mockResolvedValueOnce('strict'),
      },
      check: ({ result }) =>
        expect(VALUES.indexOf(result)).toBeGreaterThanOrEqual(VALUES.indexOf('standard')),
    },
    {
      name: 'skips AI when must-floor leaves only one candidate',
      inputs: {
        signals: [
          signal('compliance', 'maximum', 'must'),
          signal('product', 'minimal', 'may'),
          signal('safety', 'standard', 'may'),
        ],
      },
      check: all(equals('maximum'), expectNoLlm()),
    },
  ],
  process: async ({ signals, preMock }) => {
    if (preMock) preMock();
    return valueArbitrate(signals, {}, VALUES);
  },
});

// ─── signal evaluation ──────────────────────────────────────────────────

runTable({
  describe: 'valueArbitrate — signal evaluation',
  examples: [
    {
      name: 'evaluates signal value functions concurrently with the context',
      inputs: {
        ctx: { kind: 'tenant', key: 'org-123', plan: 'enterprise' },
        makeSignals: () => {
          const valueFnA = vi.fn().mockResolvedValue('standard');
          const valueFnB = vi.fn().mockResolvedValue('standard');
          return {
            signals: [signal('a', valueFnA, 'may'), signal('b', valueFnB, 'may')],
            valueFnA,
            valueFnB,
          };
        },
      },
      check: ({ result }) => {
        expect(result.valueFnA).toHaveBeenCalledWith(result.ctx);
        expect(result.valueFnB).toHaveBeenCalledWith(result.ctx);
      },
    },
    {
      name: 'handles async signal value functions',
      inputs: {
        makeSignals: () => ({
          signals: [
            signal(
              'slow',
              () => new Promise((resolve) => setTimeout(() => resolve('strict'), 10)),
              'must'
            ),
          ],
        }),
      },
      check: ({ result }) => expect(result.value).toBe('strict'),
    },
  ],
  process: async ({ ctx = {}, makeSignals }) => {
    const built = makeSignals();
    const value = await valueArbitrate(built.signals, ctx, VALUES);
    return { ...built, ctx, value };
  },
});

// ─── deterministic fast path ─────────────────────────────────────────────

runTable({
  describe: 'valueArbitrate — deterministic fast path',
  examples: [
    {
      name: 'returns the floor value when no mays exist',
      inputs: { signals: [signal('legal', 'standard', 'must')] },
      check: all(equals('standard'), expectNoLlm()),
    },
    {
      name: 'returns first candidate when no mays have opinions in candidate space',
      inputs: {
        signals: [signal('legal', 'strict', 'must'), signal('product', 'minimal', 'may')],
      },
      check: all(equals('strict'), expectNoLlm()),
    },
  ],
  process: ({ signals }) => valueArbitrate(signals, {}, VALUES),
});

// ─── edge cases ─────────────────────────────────────────────────────────

runTable({
  describe: 'valueArbitrate — edge cases',
  examples: [
    {
      name: 'throws when signals array is empty',
      inputs: { signals: [], values: VALUES },
      check: throws(/valueArbitrate requires at least one signal/),
    },
    {
      name: 'throws when values array is empty',
      inputs: { signals: [signal('a', 'x', 'may')], values: [] },
      check: throws(/valueArbitrate requires at least one value/),
    },
    {
      name: 'handles a single value in the values array',
      inputs: {
        signals: [signal('only', 'locked', 'must')],
        values: ['locked'],
      },
      check: equals('locked'),
    },
    {
      name: 'throws when AI returns a value not in the candidates',
      inputs: {
        signals: [signal('a', 'minimal', 'may'), signal('b', 'standard', 'may')],
        values: VALUES,
        preMock: () => callLlm.mockResolvedValue('nonsense'),
      },
      check: throws(/not in candidates/),
    },
    {
      name: 'works with numeric values',
      inputs: {
        signals: [signal('plan-limit', 1000, 'must')],
        values: [100, 500, 1000, 5000],
      },
      check: all(equals(1000), expectNoLlm()),
    },
    {
      name: 'throws when a must signal resolves to a value not in the values array',
      inputs: {
        signals: [signal('bogus-must', 'unknown', 'must'), signal('preference', 'standard', 'may')],
        values: VALUES,
      },
      check: throws(/not in values/),
    },
  ],
  process: async ({ signals, values, preMock }) => {
    if (preMock) preMock();
    return valueArbitrate(signals, {}, values);
  },
});

// ─── config threading + responseFormat ──────────────────────────────────

runTable({
  describe: 'valueArbitrate — config threading',
  examples: [
    {
      name: 'passes config through to callLlm via retry',
      inputs: {
        signals: [signal('a', 'minimal', 'may'), signal('b', 'standard', 'may')],
        config: { llm: 'reasoning' },
        preMock: () => callLlm.mockResolvedValueOnce('standard'),
      },
      check: () => {
        expect(retry).toHaveBeenCalledTimes(1);
        const opts = retry.mock.calls[0][1];
        expect(opts.label).toBe('value-arbitrate');
        expect(opts.config).toBeDefined();
      },
    },
    {
      name: 'passes instruction to mediation prompt',
      inputs: {
        signals: [signal('a', 'standard', 'may'), signal('b', 'strict', 'may')],
        config: { instruction: 'Prefer stricter values in uncertain conditions' },
        preMock: () => callLlm.mockResolvedValueOnce('strict'),
      },
      check: () =>
        expect(callLlm.mock.calls[0][0]).toContain(
          'Prefer stricter values in uncertain conditions'
        ),
    },
    {
      name: 'sends a JSON schema constraining to candidate values',
      inputs: {
        signals: [
          signal('legal', 'standard', 'must'),
          signal('a', 'strict', 'may'),
          signal('b', 'maximum', 'may'),
        ],
        preMock: () => callLlm.mockResolvedValueOnce('strict'),
      },
      check: () => {
        const config = callLlm.mock.calls[0][1];
        expect(config.responseFormat.json_schema.schema.properties.value.enum).toEqual([
          'standard',
          'strict',
          'maximum',
        ]);
      },
    },
  ],
  process: async ({ signals, config, preMock }) => {
    if (preMock) preMock();
    return valueArbitrate(signals, {}, VALUES, config);
  },
});

// ─── multi-value: per-dimension must enforcement ────────────────────────

const DIMS = [
  { name: 'verification', values: ['light', 'standard', 'thorough', 'maximum'] },
  { name: 'logging', values: ['minimal', 'verbose', 'full'] },
];

runTable({
  describe: 'valueArbitrate (multi) — per-dimension must enforcement',
  examples: [
    {
      name: 'enforces must-floor independently per dimension',
      inputs: {
        signals: [signal('compliance', { verification: 'standard', logging: 'verbose' }, 'must')],
      },
      check: all(equals(['standard', 'verbose']), expectNoLlm()),
    },
    {
      name: 'takes most restrictive must per dimension when musts disagree',
      inputs: {
        signals: [
          signal('legal', { verification: 'standard', logging: 'verbose' }, 'must'),
          signal('compliance', { verification: 'thorough', logging: 'verbose' }, 'must'),
        ],
      },
      check: all(equals(['thorough', 'verbose']), expectNoLlm()),
    },
    {
      name: 'returns most restrictive value when must is at the maximum per dimension',
      inputs: {
        signals: [signal('lockdown', { verification: 'maximum', logging: 'full' }, 'must')],
      },
      check: all(equals(['maximum', 'full']), expectNoLlm()),
    },
  ],
  process: ({ signals }) => valueArbitrate(signals, {}, DIMS),
});

// ─── multi-value: may-mediation across dimensions ───────────────────────

runTable({
  describe: 'valueArbitrate (multi) — may-mediation across dimensions',
  examples: [
    {
      name: 'returns agreed values without AI when all mays agree per dimension',
      inputs: {
        signals: [
          signal('product', { verification: 'standard', logging: 'verbose' }, 'may', {
            weight: 0.3,
          }),
          signal('safety', { verification: 'standard', logging: 'verbose' }, 'may', {
            weight: 0.7,
          }),
        ],
      },
      check: all(equals(['standard', 'verbose']), expectNoLlm()),
    },
    {
      name: 'calls AI to mediate when mays disagree across dimensions',
      inputs: {
        signals: [
          signal('product', { verification: 'light', logging: 'minimal' }, 'may', {
            weight: 0.3,
            prompt: 'minimize friction for trial users',
          }),
          signal('safety', { verification: 'standard', logging: 'verbose' }, 'may', {
            weight: 0.7,
            prompt: 'elevated risk segment',
          }),
        ],
        preMock: () =>
          callLlm.mockResolvedValueOnce({ verification: 'standard', logging: 'verbose' }),
      },
      check: all(equals(['standard', 'verbose']), () => {
        expect(callLlm).toHaveBeenCalledTimes(1);
        const prompt = callLlm.mock.calls[0][0];
        expect(prompt).toContain('DIMENSION "verification"');
        expect(prompt).toContain('DIMENSION "logging"');
        expect(prompt).toContain('minimize friction');
        expect(prompt).toContain('elevated risk');
      }),
    },
    {
      name: 'only mediates dimensions that actually disagree',
      inputs: {
        signals: [
          signal('product', { verification: 'standard', logging: 'minimal' }, 'may', {
            weight: 0.4,
          }),
          signal('safety', { verification: 'standard', logging: 'verbose' }, 'may', {
            weight: 0.6,
          }),
        ],
        preMock: () => callLlm.mockResolvedValueOnce({ logging: 'verbose' }),
      },
      check: all(equals(['standard', 'verbose']), () => {
        expect(callLlm).toHaveBeenCalledTimes(1);
        const schema = callLlm.mock.calls[0][1].responseFormat.json_schema.schema;
        expect(schema.properties).toHaveProperty('logging');
        expect(schema.properties).not.toHaveProperty('verification');
        expect(schema.required).toEqual(['logging']);
      }),
    },
    {
      name: 'includes weights and prompts in multi-dimension mediation prompt',
      inputs: {
        signals: [
          signal('a', { verification: 'light', logging: 'minimal' }, 'may', {
            weight: 0.3,
            prompt: 'context-a',
          }),
          signal('b', { verification: 'standard', logging: 'verbose' }, 'may', {
            weight: 0.7,
            prompt: 'context-b',
          }),
        ],
        preMock: () =>
          callLlm.mockResolvedValueOnce({ verification: 'standard', logging: 'verbose' }),
      },
      check: () => {
        const prompt = callLlm.mock.calls[0][0];
        expect(prompt).toContain('weight: 0.3');
        expect(prompt).toContain('weight: 0.7');
        expect(prompt).toContain('context-a');
        expect(prompt).toContain('context-b');
      },
    },
  ],
  process: async ({ signals, preMock }) => {
    if (preMock) preMock();
    return valueArbitrate(signals, {}, DIMS);
  },
});

// ─── multi-value: combined must + may ───────────────────────────────────

runTable({
  describe: 'valueArbitrate (multi) — combined must + may across dimensions',
  examples: [
    {
      name: 'applies must-floor then mediates remaining mays per dimension',
      inputs: {
        signals: [
          signal('legal', { verification: 'standard', logging: 'verbose' }, 'must'),
          signal('product', { verification: 'light', logging: 'verbose' }, 'may', {
            weight: 0.3,
          }),
          signal('safety', { verification: 'thorough', logging: 'verbose' }, 'may', {
            weight: 0.7,
          }),
        ],
        preMock: () => callLlm.mockResolvedValueOnce({ verification: 'thorough' }),
      },
      check: ({ result }) => {
        expect(result[1]).toBe('verbose');
        expect(DIMS[0].values.indexOf(result[0])).toBeGreaterThanOrEqual(
          DIMS[0].values.indexOf('standard')
        );
      },
    },
    {
      name: 'skips AI when must-floor leaves one candidate per dimension',
      inputs: {
        signals: [
          signal('lockdown', { verification: 'maximum', logging: 'full' }, 'must'),
          signal('product', { verification: 'light', logging: 'minimal' }, 'may'),
        ],
      },
      check: all(equals(['maximum', 'full']), expectNoLlm()),
    },
  ],
  process: async ({ signals, preMock }) => {
    if (preMock) preMock();
    return valueArbitrate(signals, {}, DIMS);
  },
});

// ─── multi-value: cross-value constraints ───────────────────────────────

runTable({
  describe: 'valueArbitrate (multi) — cross-value constraints',
  examples: [
    {
      name: 'raises floor on a dimension when constraint triggers',
      inputs: {
        signals: [signal('compliance', { verification: 'thorough', logging: 'minimal' }, 'must')],
        config: {
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
        },
      },
      check: all(equals(['thorough', 'verbose']), expectNoLlm()),
    },
    {
      name: 'does not raise floor when constraint does not trigger',
      inputs: {
        signals: [signal('compliance', { verification: 'light', logging: 'minimal' }, 'must')],
        config: {
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
        },
      },
      check: all(equals(['light', 'minimal']), expectNoLlm()),
    },
    {
      name: 'ignores constraint that requires value below existing must-floor',
      inputs: {
        signals: [signal('lockdown', { verification: 'maximum', logging: 'full' }, 'must')],
        config: {
          constraints: [{ name: 'reduce-logging', enforce: () => ({ logging: 'minimal' }) }],
        },
      },
      check: all(equals(['maximum', 'full']), expectNoLlm()),
    },
    {
      name: 'preserves existing selection when constraint raises floor below it',
      inputs: {
        signals: [
          signal('compliance', { verification: 'thorough' }, 'must'),
          signal('observability', { logging: 'full' }, 'must'),
        ],
        config: {
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
        },
      },
      check: equals(['thorough', 'full']),
    },
    {
      name: 'applies multiple constraints in sequence',
      inputs: {
        useThreeDims: true,
        signals: [
          signal(
            'base',
            { verification: 'standard', logging: 'minimal', retention: '30d' },
            'must'
          ),
        ],
        config: {
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
        },
      },
      check: all(equals(['standard', 'verbose', '90d']), expectNoLlm()),
    },
  ],
  process: async ({ signals, config, useThreeDims }) => {
    const dims = useThreeDims
      ? [
          { name: 'verification', values: ['light', 'standard', 'thorough', 'maximum'] },
          { name: 'logging', values: ['minimal', 'verbose', 'full'] },
          { name: 'retention', values: ['7d', '30d', '90d', '365d'] },
        ]
      : DIMS;
    return valueArbitrate(signals, {}, dims, config);
  },
});

// ─── multi-value: partial signals ───────────────────────────────────────

runTable({
  describe: 'valueArbitrate (multi) — partial signals',
  examples: [
    {
      name: 'handles signals that only have opinions on some dimensions',
      inputs: {
        signals: [
          signal('compliance', { verification: 'standard' }, 'must'),
          signal('observability', { logging: 'verbose' }, 'must'),
        ],
      },
      check: all(equals(['standard', 'verbose']), expectNoLlm()),
    },
    {
      name: 'uses full candidate range for dimensions with no signals',
      inputs: {
        signals: [
          signal('compliance', { verification: 'standard' }, 'must'),
          signal('a', { logging: 'minimal' }, 'may'),
          signal('b', { logging: 'verbose' }, 'may'),
        ],
        preMock: () => callLlm.mockResolvedValueOnce({ logging: 'verbose' }),
      },
      check: ({ result }) => {
        expect(result[0]).toBe('standard');
        expect(result[1]).toBe('verbose');
      },
    },
  ],
  process: async ({ signals, preMock }) => {
    if (preMock) preMock();
    return valueArbitrate(signals, {}, DIMS);
  },
});

// ─── multi-value: signal evaluation + edge cases ────────────────────────

runTable({
  describe: 'valueArbitrate (multi) — signal evaluation',
  examples: [
    {
      name: 'evaluates multi-value signal functions concurrently with context',
      inputs: {
        ctx: { kind: 'tenant', key: 'org-123' },
        makeSignals: () => {
          const valueFnA = vi
            .fn()
            .mockResolvedValue({ verification: 'standard', logging: 'verbose' });
          const valueFnB = vi
            .fn()
            .mockResolvedValue({ verification: 'standard', logging: 'verbose' });
          return {
            signals: [signal('a', valueFnA, 'may'), signal('b', valueFnB, 'may')],
            valueFnA,
            valueFnB,
          };
        },
      },
      check: ({ result }) => {
        expect(result.valueFnA).toHaveBeenCalledWith(result.ctx);
        expect(result.valueFnB).toHaveBeenCalledWith(result.ctx);
      },
    },
  ],
  process: async ({ ctx, makeSignals }) => {
    const built = makeSignals();
    await valueArbitrate(built.signals, ctx, DIMS);
    return { ...built, ctx };
  },
});

runTable({
  describe: 'valueArbitrate (multi) — edge cases',
  examples: [
    {
      name: 'throws when AI returns a value not in any dimension candidates',
      inputs: {
        signals: [
          signal('a', { verification: 'light', logging: 'minimal' }, 'may'),
          signal('b', { verification: 'standard', logging: 'verbose' }, 'may'),
        ],
        dims: DIMS,
        preMock: () => callLlm.mockResolvedValue({ verification: 'nonsense', logging: 'garbage' }),
      },
      check: throws(/not in candidates/),
    },
    {
      name: 'works with numeric dimension values',
      inputs: {
        signals: [signal('plan-limit', { concurrency: 10, timeout: 5000 }, 'must')],
        dims: [
          { name: 'concurrency', values: [1, 5, 10, 50] },
          { name: 'timeout', values: [1000, 5000, 30000] },
        ],
      },
      check: all(equals([10, 5000]), expectNoLlm()),
    },
    {
      name: 'returns array of selected values in dimension order',
      inputs: {
        signals: [signal('s', { alpha: 'a2', beta: 'b1', gamma: 'g3' }, 'must')],
        dims: [
          { name: 'alpha', values: ['a1', 'a2', 'a3'] },
          { name: 'beta', values: ['b1', 'b2', 'b3'] },
          { name: 'gamma', values: ['g1', 'g2', 'g3'] },
        ],
      },
      check: equals(['a2', 'b1', 'g3']),
    },
  ],
  process: async ({ signals, dims, preMock }) => {
    if (preMock) preMock();
    return valueArbitrate(signals, {}, dims);
  },
});

// ─── multi-value: config threading + responseFormat ─────────────────────

runTable({
  describe: 'valueArbitrate (multi) — config threading',
  examples: [
    {
      name: 'passes config through to callLlm in multi-value mode',
      inputs: {
        signals: [
          signal('a', { verification: 'light', logging: 'minimal' }, 'may'),
          signal('b', { verification: 'standard', logging: 'verbose' }, 'may'),
        ],
        config: { llm: 'reasoning' },
        preMock: () =>
          callLlm.mockResolvedValueOnce({ verification: 'standard', logging: 'verbose' }),
      },
      check: () => {
        expect(retry).toHaveBeenCalledTimes(1);
        const opts = retry.mock.calls[0][1];
        expect(opts.label).toBe('value-arbitrate');
        expect(opts.config).toBeDefined();
      },
    },
    {
      name: 'passes instruction to multi-dimension mediation prompt',
      inputs: {
        signals: [
          signal('a', { verification: 'light', logging: 'minimal' }, 'may'),
          signal('b', { verification: 'standard', logging: 'verbose' }, 'may'),
        ],
        config: { instruction: 'Prefer stricter values in uncertain conditions' },
        preMock: () =>
          callLlm.mockResolvedValueOnce({ verification: 'standard', logging: 'verbose' }),
      },
      check: () =>
        expect(callLlm.mock.calls[0][0]).toContain(
          'Prefer stricter values in uncertain conditions'
        ),
    },
    {
      name: 'sends a JSON schema with per-dimension enum constraints',
      inputs: {
        signals: [
          signal('legal', { verification: 'standard', logging: 'verbose' }, 'must'),
          signal('a', { verification: 'thorough', logging: 'full' }, 'may'),
          signal('b', { verification: 'maximum', logging: 'verbose' }, 'may'),
        ],
        preMock: () =>
          callLlm.mockResolvedValueOnce({ verification: 'thorough', logging: 'verbose' }),
      },
      check: () => {
        const config = callLlm.mock.calls[0][1];
        const schema = config.responseFormat.json_schema.schema;
        expect(schema.properties.verification.enum).toEqual(['standard', 'thorough', 'maximum']);
        expect(schema.properties.logging.enum).toEqual(['verbose', 'full']);
        expect(config.responseFormat.json_schema.name).toBe('value_arbitrate_multi');
      },
    },
  ],
  process: async ({ signals, config, preMock }) => {
    if (preMock) preMock();
    return valueArbitrate(signals, {}, DIMS, config);
  },
});
