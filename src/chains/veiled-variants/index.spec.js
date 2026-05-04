import { vi, beforeEach, expect } from 'vitest';
import { runTable, applyMocks } from '../../lib/examples-runner/index.js';

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(),
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
}));

vi.mock('../../lib/retry/index.js', () => ({ default: vi.fn(async (fn) => fn()) }));

import veiledVariants from './index.js';
import callLlm from '../../lib/llm/index.js';

beforeEach(() => vi.resetAllMocks());

runTable({
  describe: 'veiledVariants',
  examples: [
    {
      name: 'returns 15 masked queries from 3 framing strategies',
      inputs: { intent: 'secret' },
      mocks: {
        callLlm: [
          ['s1', 's2', 's3', 's4', 's5'],
          ['c1', 'c2', 'c3', 'c4', 'c5'],
          ['w1', 'w2', 'w3', 'w4', 'w5'],
        ],
      },
      want: {
        value: [
          's1',
          's2',
          's3',
          's4',
          's5',
          'c1',
          'c2',
          'c3',
          'c4',
          'c5',
          'w1',
          'w2',
          'w3',
          'w4',
          'w5',
        ],
        llmCalls: 3,
        everyPromptContains: '<intent>',
      },
    },
    {
      name: 'uses only 1 strategy with coverage low',
      inputs: { intent: 'secret', options: { coverage: 'low' } },
      mocks: { callLlm: [['v1', 'v2', 'v3']] },
      want: { length: 3, llmCalls: 1 },
    },
    {
      name: 'generates more variants per strategy with coverage high',
      inputs: { intent: 'secret', options: { coverage: 'high' } },
      mocks: {
        callLlm: [
          ['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8'],
          ['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8'],
          ['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8'],
        ],
      },
      want: { length: 24, llmCalls: 3, everyPromptMatches: /\b8\b/ },
    },
    {
      name: 'allows explicit strategies to override coverage',
      inputs: {
        intent: 'secret',
        options: { coverage: 'low', strategies: ['causal', 'softCover'] },
      },
      mocks: {
        callLlm: [
          ['v1', 'v2', 'v3'],
          ['v1', 'v2', 'v3'],
        ],
      },
      want: { llmCalls: 2 },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { callLlm });
    return veiledVariants(inputs.intent, inputs.options);
  },
  expects: ({ result, want }) => {
    if ('value' in want) expect(result).toEqual(want.value);
    if ('length' in want) expect(result).toHaveLength(want.length);
    if ('llmCalls' in want) expect(callLlm).toHaveBeenCalledTimes(want.llmCalls);
    if (want.everyPromptContains) {
      for (const [prompt] of callLlm.mock.calls) {
        expect(prompt).toContain(want.everyPromptContains);
      }
    }
    if (want.everyPromptMatches) {
      for (const [prompt] of callLlm.mock.calls) {
        expect(prompt).toMatch(want.everyPromptMatches);
      }
    }
  },
});
