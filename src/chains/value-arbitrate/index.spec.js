import { vi, beforeEach, expect } from 'vitest';
import valueArbitrate from './index.js';
import callLlm from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import { runTable } from '../../lib/examples-runner/index.js';

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

const checkValue = (result, want) => {
  if ('value' in want) expect(result).toEqual(want.value);
  if (want.noLlm) expect(callLlm).not.toHaveBeenCalled();
};

runTable({
  describe: 'valueArbitrate — must-floor enforcement',
  examples: [
    {
      name: 'returns the must value when a single must is the only signal',
      inputs: { signals: [signal('legal-floor', 'standard', 'must')] },
      want: { value: 'standard', noLlm: true },
    },
    {
      name: 'takes the most restrictive must when multiple musts disagree',
      inputs: {
        signals: [
          signal('legal-floor', 'standard', 'must'),
          signal('compliance', 'strict', 'must'),
        ],
      },
      want: { value: 'strict', noLlm: true },
    },
    {
      name: 'returns the most restrictive value when must is at the maximum',
      inputs: { signals: [signal('lockdown', 'maximum', 'must')] },
      want: { value: 'maximum', noLlm: true },
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
      want: { value: 'strict', noLlm: true },
    },
  ],
  process: ({ inputs }) => valueArbitrate(inputs.signals, {}, VALUES),
  expects: ({ result, want }) => checkValue(result, want),
});

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
      want: { value: 'standard', noLlm: true },
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
        setupMock: () => callLlm.mockResolvedValueOnce('standard'),
      },
      want: {
        value: 'standard',
        llmCalls: 1,
        promptContains: ['product', 'safety', 'lighter touch', 'elevated risk', '0.3', '0.7'],
      },
    },
    {
      name: 'includes weights and prompt context in mediation prompt',
      inputs: {
        signals: [
          signal('a', 'standard', 'may', { weight: 0.4, prompt: 'context-a' }),
          signal('b', 'strict', 'may', { weight: 0.6, prompt: 'context-b' }),
        ],
        setupMock: () => callLlm.mockResolvedValueOnce('strict'),
      },
      want: { promptContains: ['weight: 0.4', 'weight: 0.6', 'context-a', 'context-b'] },
    },
  ],
  process: async ({ inputs }) => {
    inputs.setupMock?.();
    return valueArbitrate(inputs.signals, {}, VALUES);
  },
  expects: ({ result, want }) => {
    if ('value' in want) expect(result).toEqual(want.value);
    if ('llmCalls' in want) expect(callLlm).toHaveBeenCalledTimes(want.llmCalls);
    if (want.promptContains) {
      const prompt = callLlm.mock.calls[0][0];
      for (const fragment of want.promptContains) expect(prompt).toContain(fragment);
    }
  },
});

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
        setupMock: () => callLlm.mockResolvedValueOnce('strict'),
      },
      want: { atLeastStandard: true },
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
      want: { value: 'maximum', noLlm: true },
    },
  ],
  process: async ({ inputs }) => {
    inputs.setupMock?.();
    return valueArbitrate(inputs.signals, {}, VALUES);
  },
  expects: ({ result, want }) => {
    if ('value' in want) expect(result).toEqual(want.value);
    if (want.noLlm) expect(callLlm).not.toHaveBeenCalled();
    if (want.atLeastStandard) {
      expect(VALUES.indexOf(result)).toBeGreaterThanOrEqual(VALUES.indexOf('standard'));
    }
  },
});

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
      want: { signalsCalledWithCtx: true },
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
      want: { value: 'strict' },
    },
  ],
  process: async ({ inputs }) => {
    const built = inputs.makeSignals();
    const ctx = inputs.ctx ?? {};
    const value = await valueArbitrate(built.signals, ctx, VALUES);
    return { ...built, ctx, value };
  },
  expects: ({ result, want }) => {
    if (want.signalsCalledWithCtx) {
      expect(result.valueFnA).toHaveBeenCalledWith(result.ctx);
      expect(result.valueFnB).toHaveBeenCalledWith(result.ctx);
    }
    if ('value' in want) expect(result.value).toBe(want.value);
  },
});

runTable({
  describe: 'valueArbitrate — deterministic fast path',
  examples: [
    {
      name: 'returns the floor value when no mays exist',
      inputs: { signals: [signal('legal', 'standard', 'must')] },
      want: { value: 'standard', noLlm: true },
    },
    {
      name: 'returns first candidate when no mays have opinions in candidate space',
      inputs: {
        signals: [signal('legal', 'strict', 'must'), signal('product', 'minimal', 'may')],
      },
      want: { value: 'strict', noLlm: true },
    },
  ],
  process: ({ inputs }) => valueArbitrate(inputs.signals, {}, VALUES),
  expects: ({ result, want }) => checkValue(result, want),
});

runTable({
  describe: 'valueArbitrate — edge cases',
  examples: [
    {
      name: 'throws when signals array is empty',
      inputs: { signals: [], values: VALUES },
      want: { throws: /valueArbitrate requires at least one signal/ },
    },
    {
      name: 'throws when values array is empty',
      inputs: { signals: [signal('a', 'x', 'may')], values: [] },
      want: { throws: /valueArbitrate requires at least one value/ },
    },
    {
      name: 'handles a single value in the values array',
      inputs: { signals: [signal('only', 'locked', 'must')], values: ['locked'] },
      want: { value: 'locked' },
    },
    {
      name: 'throws when AI returns a value not in the candidates',
      inputs: {
        signals: [signal('a', 'minimal', 'may'), signal('b', 'standard', 'may')],
        values: VALUES,
        setupMock: () => callLlm.mockResolvedValue('nonsense'),
      },
      want: { throws: /not in candidates/ },
    },
    {
      name: 'works with numeric values',
      inputs: {
        signals: [signal('plan-limit', 1000, 'must')],
        values: [100, 500, 1000, 5000],
      },
      want: { value: 1000, noLlm: true },
    },
    {
      name: 'throws when a must signal resolves to a value not in the values array',
      inputs: {
        signals: [signal('bogus-must', 'unknown', 'must'), signal('preference', 'standard', 'may')],
        values: VALUES,
      },
      want: { throws: /not in values/ },
    },
  ],
  process: async ({ inputs }) => {
    inputs.setupMock?.();
    return valueArbitrate(inputs.signals, {}, inputs.values);
  },
  expects: ({ result, error, want }) => {
    if (want.throws) {
      expect(error?.message).toMatch(want.throws);
      return;
    }
    if (error) throw error;
    checkValue(result, want);
  },
});

runTable({
  describe: 'valueArbitrate — config threading',
  examples: [
    {
      name: 'passes config through to callLlm via retry',
      inputs: {
        signals: [signal('a', 'minimal', 'may'), signal('b', 'standard', 'may')],
        config: { llm: 'reasoning' },
        setupMock: () => callLlm.mockResolvedValueOnce('standard'),
      },
      want: { retryCalled: true, retryLabel: 'value-arbitrate' },
    },
    {
      name: 'passes instruction to mediation prompt',
      inputs: {
        signals: [signal('a', 'standard', 'may'), signal('b', 'strict', 'may')],
        config: { instruction: 'Prefer stricter values in uncertain conditions' },
        setupMock: () => callLlm.mockResolvedValueOnce('strict'),
      },
      want: { promptContains: 'Prefer stricter values in uncertain conditions' },
    },
    {
      name: 'sends a JSON schema constraining to candidate values',
      inputs: {
        signals: [
          signal('legal', 'standard', 'must'),
          signal('a', 'strict', 'may'),
          signal('b', 'maximum', 'may'),
        ],
        setupMock: () => callLlm.mockResolvedValueOnce('strict'),
      },
      want: { schemaEnum: ['standard', 'strict', 'maximum'] },
    },
  ],
  process: async ({ inputs }) => {
    inputs.setupMock?.();
    return valueArbitrate(inputs.signals, {}, VALUES, inputs.config);
  },
  expects: ({ want }) => {
    if (want.retryCalled) {
      expect(retry).toHaveBeenCalledTimes(1);
      const opts = retry.mock.calls[0][1];
      expect(opts.label).toBe(want.retryLabel);
      expect(opts.config).toBeDefined();
    }
    if (want.promptContains) {
      expect(callLlm.mock.calls[0][0]).toContain(want.promptContains);
    }
    if (want.schemaEnum) {
      const config = callLlm.mock.calls[0][1];
      expect(config.responseFormat.json_schema.schema.properties.value.enum).toEqual(
        want.schemaEnum
      );
    }
  },
});

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
      want: { value: ['standard', 'verbose'], noLlm: true },
    },
    {
      name: 'takes most restrictive must per dimension when musts disagree',
      inputs: {
        signals: [
          signal('legal', { verification: 'standard', logging: 'verbose' }, 'must'),
          signal('compliance', { verification: 'thorough', logging: 'verbose' }, 'must'),
        ],
      },
      want: { value: ['thorough', 'verbose'], noLlm: true },
    },
    {
      name: 'returns most restrictive value when must is at the maximum per dimension',
      inputs: {
        signals: [signal('lockdown', { verification: 'maximum', logging: 'full' }, 'must')],
      },
      want: { value: ['maximum', 'full'], noLlm: true },
    },
  ],
  process: ({ inputs }) => valueArbitrate(inputs.signals, {}, DIMS),
  expects: ({ result, want }) => checkValue(result, want),
});

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
      want: { value: ['standard', 'verbose'], noLlm: true },
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
        setupMock: () =>
          callLlm.mockResolvedValueOnce({ verification: 'standard', logging: 'verbose' }),
      },
      want: {
        value: ['standard', 'verbose'],
        llmCalls: 1,
        promptContains: [
          'DIMENSION "verification"',
          'DIMENSION "logging"',
          'minimize friction',
          'elevated risk',
        ],
      },
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
        setupMock: () => callLlm.mockResolvedValueOnce({ logging: 'verbose' }),
      },
      want: {
        value: ['standard', 'verbose'],
        llmCalls: 1,
        schemaHasLogging: true,
        schemaNoVerification: true,
      },
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
        setupMock: () =>
          callLlm.mockResolvedValueOnce({ verification: 'standard', logging: 'verbose' }),
      },
      want: { promptContains: ['weight: 0.3', 'weight: 0.7', 'context-a', 'context-b'] },
    },
  ],
  process: async ({ inputs }) => {
    inputs.setupMock?.();
    return valueArbitrate(inputs.signals, {}, DIMS);
  },
  expects: ({ result, want }) => {
    if ('value' in want) expect(result).toEqual(want.value);
    if ('llmCalls' in want) expect(callLlm).toHaveBeenCalledTimes(want.llmCalls);
    if (want.promptContains) {
      const prompt = callLlm.mock.calls[0][0];
      for (const fragment of want.promptContains) expect(prompt).toContain(fragment);
    }
    if (want.schemaHasLogging) {
      const schema = callLlm.mock.calls[0][1].responseFormat.json_schema.schema;
      expect(schema.properties).toHaveProperty('logging');
      expect(schema.required).toEqual(['logging']);
    }
    if (want.schemaNoVerification) {
      const schema = callLlm.mock.calls[0][1].responseFormat.json_schema.schema;
      expect(schema.properties).not.toHaveProperty('verification');
    }
  },
});

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
        setupMock: () => callLlm.mockResolvedValueOnce({ verification: 'thorough' }),
      },
      want: { secondVerbose: true, firstAtLeastStandard: true },
    },
    {
      name: 'skips AI when must-floor leaves one candidate per dimension',
      inputs: {
        signals: [
          signal('lockdown', { verification: 'maximum', logging: 'full' }, 'must'),
          signal('product', { verification: 'light', logging: 'minimal' }, 'may'),
        ],
      },
      want: { value: ['maximum', 'full'], noLlm: true },
    },
  ],
  process: async ({ inputs }) => {
    inputs.setupMock?.();
    return valueArbitrate(inputs.signals, {}, DIMS);
  },
  expects: ({ result, want }) => {
    if ('value' in want) expect(result).toEqual(want.value);
    if (want.noLlm) expect(callLlm).not.toHaveBeenCalled();
    if (want.secondVerbose) expect(result[1]).toBe('verbose');
    if (want.firstAtLeastStandard) {
      expect(DIMS[0].values.indexOf(result[0])).toBeGreaterThanOrEqual(
        DIMS[0].values.indexOf('standard')
      );
    }
  },
});

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
      want: { value: ['thorough', 'verbose'], noLlm: true },
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
      want: { value: ['light', 'minimal'], noLlm: true },
    },
    {
      name: 'ignores constraint that requires value below existing must-floor',
      inputs: {
        signals: [signal('lockdown', { verification: 'maximum', logging: 'full' }, 'must')],
        config: {
          constraints: [{ name: 'reduce-logging', enforce: () => ({ logging: 'minimal' }) }],
        },
      },
      want: { value: ['maximum', 'full'], noLlm: true },
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
      want: { value: ['thorough', 'full'] },
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
      want: { value: ['standard', 'verbose', '90d'], noLlm: true },
    },
  ],
  process: async ({ inputs }) => {
    const dims = inputs.useThreeDims
      ? [
          { name: 'verification', values: ['light', 'standard', 'thorough', 'maximum'] },
          { name: 'logging', values: ['minimal', 'verbose', 'full'] },
          { name: 'retention', values: ['7d', '30d', '90d', '365d'] },
        ]
      : DIMS;
    return valueArbitrate(inputs.signals, {}, dims, inputs.config);
  },
  expects: ({ result, want }) => checkValue(result, want),
});

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
      want: { value: ['standard', 'verbose'], noLlm: true },
    },
    {
      name: 'uses full candidate range for dimensions with no signals',
      inputs: {
        signals: [
          signal('compliance', { verification: 'standard' }, 'must'),
          signal('a', { logging: 'minimal' }, 'may'),
          signal('b', { logging: 'verbose' }, 'may'),
        ],
        setupMock: () => callLlm.mockResolvedValueOnce({ logging: 'verbose' }),
      },
      want: { positions: { 0: 'standard', 1: 'verbose' } },
    },
  ],
  process: async ({ inputs }) => {
    inputs.setupMock?.();
    return valueArbitrate(inputs.signals, {}, DIMS);
  },
  expects: ({ result, want }) => {
    if ('value' in want) expect(result).toEqual(want.value);
    if (want.noLlm) expect(callLlm).not.toHaveBeenCalled();
    if (want.positions) {
      for (const [idx, value] of Object.entries(want.positions)) {
        expect(result[Number(idx)]).toBe(value);
      }
    }
  },
});

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
      want: { signalsCalledWithCtx: true },
    },
  ],
  process: async ({ inputs }) => {
    const built = inputs.makeSignals();
    await valueArbitrate(built.signals, inputs.ctx, DIMS);
    return { ...built, ctx: inputs.ctx };
  },
  expects: ({ result, want }) => {
    if (want.signalsCalledWithCtx) {
      expect(result.valueFnA).toHaveBeenCalledWith(result.ctx);
      expect(result.valueFnB).toHaveBeenCalledWith(result.ctx);
    }
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
        setupMock: () =>
          callLlm.mockResolvedValue({ verification: 'nonsense', logging: 'garbage' }),
      },
      want: { throws: /not in candidates/ },
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
      want: { value: [10, 5000], noLlm: true },
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
      want: { value: ['a2', 'b1', 'g3'] },
    },
  ],
  process: async ({ inputs }) => {
    inputs.setupMock?.();
    return valueArbitrate(inputs.signals, {}, inputs.dims);
  },
  expects: ({ result, error, want }) => {
    if (want.throws) {
      expect(error?.message).toMatch(want.throws);
      return;
    }
    if (error) throw error;
    checkValue(result, want);
  },
});

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
        setupMock: () =>
          callLlm.mockResolvedValueOnce({ verification: 'standard', logging: 'verbose' }),
      },
      want: { retryCalled: true, retryLabel: 'value-arbitrate' },
    },
    {
      name: 'passes instruction to multi-dimension mediation prompt',
      inputs: {
        signals: [
          signal('a', { verification: 'light', logging: 'minimal' }, 'may'),
          signal('b', { verification: 'standard', logging: 'verbose' }, 'may'),
        ],
        config: { instruction: 'Prefer stricter values in uncertain conditions' },
        setupMock: () =>
          callLlm.mockResolvedValueOnce({ verification: 'standard', logging: 'verbose' }),
      },
      want: { promptContains: 'Prefer stricter values in uncertain conditions' },
    },
    {
      name: 'sends a JSON schema with per-dimension enum constraints',
      inputs: {
        signals: [
          signal('legal', { verification: 'standard', logging: 'verbose' }, 'must'),
          signal('a', { verification: 'thorough', logging: 'full' }, 'may'),
          signal('b', { verification: 'maximum', logging: 'verbose' }, 'may'),
        ],
        setupMock: () =>
          callLlm.mockResolvedValueOnce({ verification: 'thorough', logging: 'verbose' }),
      },
      want: {
        verificationEnum: ['standard', 'thorough', 'maximum'],
        loggingEnum: ['verbose', 'full'],
        schemaName: 'value_arbitrate_multi',
      },
    },
  ],
  process: async ({ inputs }) => {
    inputs.setupMock?.();
    return valueArbitrate(inputs.signals, {}, DIMS, inputs.config);
  },
  expects: ({ want }) => {
    if (want.retryCalled) {
      expect(retry).toHaveBeenCalledTimes(1);
      const opts = retry.mock.calls[0][1];
      expect(opts.label).toBe(want.retryLabel);
      expect(opts.config).toBeDefined();
    }
    if (want.promptContains) {
      expect(callLlm.mock.calls[0][0]).toContain(want.promptContains);
    }
    if (want.verificationEnum) {
      const config = callLlm.mock.calls[0][1];
      const schema = config.responseFormat.json_schema.schema;
      expect(schema.properties.verification.enum).toEqual(want.verificationEnum);
      expect(schema.properties.logging.enum).toEqual(want.loggingEnum);
      expect(config.responseFormat.json_schema.name).toBe(want.schemaName);
    }
  },
});
