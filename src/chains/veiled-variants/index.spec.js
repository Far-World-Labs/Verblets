import { vi, expect } from 'vitest';
import { runTable } from '../../lib/examples-runner/index.js';

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(),
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
}));

vi.mock('../../lib/retry/index.js', () => ({ default: vi.fn(async (fn) => fn()) }));

import veiledVariants from './index.js';
import callLlm from '../../lib/llm/index.js';

runTable({
  describe: 'veiledVariants',
  examples: [
    {
      name: 'returns 15 masked queries from 3 framing strategies',
      inputs: {
        intent: 'secret',
        mock: () => {
          let call = 0;
          callLlm.mockImplementation(() => {
            call += 1;
            if (call === 1) return ['s1', 's2', 's3', 's4', 's5'];
            if (call === 2) return ['c1', 'c2', 'c3', 'c4', 'c5'];
            return ['w1', 'w2', 'w3', 'w4', 'w5'];
          });
        },
        want: [
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
        wantLlmCalls: 3,
        wantEveryPromptContains: '<intent>',
      },
    },
    {
      name: 'uses only 1 strategy with coverage low',
      inputs: {
        intent: 'secret',
        options: { coverage: 'low' },
        mock: () => {
          callLlm.mockClear();
          callLlm.mockResolvedValue(['v1', 'v2', 'v3']);
        },
        wantLength: 3,
        wantLlmCalls: 1,
      },
    },
    {
      name: 'generates more variants per strategy with coverage high',
      inputs: {
        intent: 'secret',
        options: { coverage: 'high' },
        mock: () => {
          callLlm.mockClear();
          callLlm.mockResolvedValue(['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8']);
        },
        wantLength: 24,
        wantLlmCalls: 3,
        wantEveryPromptMatches: /\b8\b/,
      },
    },
    {
      name: 'allows explicit strategies to override coverage',
      inputs: {
        intent: 'secret',
        options: { coverage: 'low', strategies: ['causal', 'softCover'] },
        mock: () => {
          callLlm.mockClear();
          callLlm.mockResolvedValue(['v1', 'v2', 'v3']);
        },
        wantLlmCalls: 2,
      },
    },
  ],
  process: async ({ intent, options, mock }) => {
    if (mock) mock();
    return veiledVariants(intent, options);
  },
  expects: ({ result, inputs }) => {
    if ('want' in inputs) expect(result).toEqual(inputs.want);
    if ('wantLength' in inputs) expect(result).toHaveLength(inputs.wantLength);
    if ('wantLlmCalls' in inputs) expect(callLlm).toHaveBeenCalledTimes(inputs.wantLlmCalls);
    if (inputs.wantEveryPromptContains) {
      for (const [prompt] of callLlm.mock.calls) {
        expect(prompt).toContain(inputs.wantEveryPromptContains);
      }
    }
    if (inputs.wantEveryPromptMatches) {
      for (const [prompt] of callLlm.mock.calls) {
        expect(prompt).toMatch(inputs.wantEveryPromptMatches);
      }
    }
  },
});
