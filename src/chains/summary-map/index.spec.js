import { describe, expect, it, vi } from 'vitest';
import pave from '../../lib/pave/index.js';
import SummaryMap from './index.js';
import chatGPT from '../../lib/chatgpt/index.js';

vi.mock('../../services/llm-model/index.js', () => ({
  default: {
    negotiateModel: vi.fn().mockReturnValue('fastGood'),
    getModel: vi.fn().mockReturnValue({
      tokenizer: (text) => text.split(' '),
    }),
  },
}));

vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn().mockImplementation((text) => {
    if (/Pursuant to the adjudication/.test(text)) {
      return '01234567890123456789012345678901234567890123456789';
    }
    if (/rabin_karp_search/.test(text)) {
      return '0123456789012345678901234';
    }
    return 'undefined';
  }),
}));

const legalText =
  'Pursuant to the adjudication of a force majeure clause within the context of contractual';

const codeText = `import numpy as np

def rabin_karp_search(pattern, text, prime=101):
`;

const examples = [
  {
    name: 'Basic usage',
    inputs: {
      targetTokens: 100,
      keys: [
        { key: 'example.text', value: legalText, weight: 1, type: 'text' },
        { key: 'example.code', value: codeText, weight: 0.5, type: 'code' },
      ],
    },
    wants: [
      { key: 'example.text', resultLength: 50, budget: [60, 80] },
      { key: 'example.code', resultLength: 25, budget: [20, 40] },
    ],
  },
  {
    name: 'Model options and privacy',
    inputs: {
      targetTokens: 50,
      modelOptions: { modelName: 'fastGood' },
      keys: [
        {
          key: 'example.text',
          value: legalText,
          weight: 1,
          type: 'text',
          privacy: { blacklist: 'names' },
        },
        { key: 'example.code', value: codeText, weight: 0.5, type: 'code' },
      ],
    },
    wants: [
      { key: 'example.text', resultLength: 50 },
      { key: 'example.code', resultLength: 25 },
    ],
  },
];

describe('Summary map', () => {
  examples.forEach((example) => {
    it(example.name, async () => {
      vi.clearAllMocks();
      const map = new SummaryMap({
        targetTokens: example.inputs.targetTokens,
        ...(example.inputs.modelOptions && { modelOptions: example.inputs.modelOptions }),
      });

      for (const input of example.inputs.keys) {
        map.set(input.key, input);
      }

      const entries = Array.from(await map.entries());
      const result = entries.reduce((acc, [k, v]) => pave(acc, k, v), {});

      for (const want of example.wants) {
        let value = result;

        // Navigate the result object using the key segments
        for (const keySegment of want.key.split('.')) {
          value = value[keySegment];
        }

        expect(typeof value).toBe('string');

        // Check if the length of the value is within the expected range
        expect(value.length).toBeLessThanOrEqual(want.resultLength);

        if (want.budget) {
          const { budgets } = map.calculateBudgets();
          const found = budgets.find((b) => b.key === want.key);
          expect(found.budget).gt(want.budget[0]);
          expect(found.budget).lt(want.budget[1]);
        }
      }

      if (example.name === 'Model options and privacy') {
        const callWithPrivacy = chatGPT.mock.calls.find(
          (c) => c[1]?.modelOptions?.modelName === 'privacy'
        );
        expect(callWithPrivacy).toBeTruthy();
      }
    });
  });
});
