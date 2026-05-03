import { vi, expect } from 'vitest';
import { runTable, equals, length, all } from '../../lib/examples-runner/index.js';

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
        preMock: () => {
          let call = 0;
          callLlm.mockImplementation(() => {
            call += 1;
            if (call === 1) return ['s1', 's2', 's3', 's4', 's5'];
            if (call === 2) return ['c1', 'c2', 'c3', 'c4', 'c5'];
            return ['w1', 'w2', 'w3', 'w4', 'w5'];
          });
        },
      },
      check: all(
        equals([
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
        ]),
        () => {
          expect(callLlm).toHaveBeenCalledTimes(3);
          for (const [prompt] of callLlm.mock.calls) {
            expect(prompt).toContain('<intent>');
          }
        }
      ),
    },
    {
      name: 'uses only 1 strategy with coverage low',
      inputs: {
        intent: 'secret',
        options: { coverage: 'low' },
        preMock: () => {
          callLlm.mockClear();
          callLlm.mockResolvedValue(['v1', 'v2', 'v3']);
        },
      },
      check: all(length(3), () => expect(callLlm).toHaveBeenCalledTimes(1)),
    },
    {
      name: 'generates more variants per strategy with coverage high',
      inputs: {
        intent: 'secret',
        options: { coverage: 'high' },
        preMock: () => {
          callLlm.mockClear();
          callLlm.mockResolvedValue(['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8']);
        },
      },
      check: all(length(24), () => {
        expect(callLlm).toHaveBeenCalledTimes(3);
        for (const [prompt] of callLlm.mock.calls) {
          expect(prompt).toMatch(/\b8\b/);
        }
      }),
    },
    {
      name: 'allows explicit strategies to override coverage',
      inputs: {
        intent: 'secret',
        options: { coverage: 'low', strategies: ['causal', 'softCover'] },
        preMock: () => {
          callLlm.mockClear();
          callLlm.mockResolvedValue(['v1', 'v2', 'v3']);
        },
      },
      check: () => expect(callLlm).toHaveBeenCalledTimes(2),
    },
  ],
  process: async ({ intent, options, preMock }) => {
    if (preMock) preMock();
    return veiledVariants(intent, options);
  },
});
