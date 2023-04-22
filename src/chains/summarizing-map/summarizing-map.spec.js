import { describe, expect, it, vi } from 'vitest';

import SummarizingMap from './index.js';

vi.mock('../../lib/openai/completions.js', () => ({
  default: vi.fn().mockImplementation((text) => {
    if (/Pursuant to the adjudication/.test(text)) {
      return '01234567890123456789012345678901234567890123456789';
    } else if (/rabin_karp_search/.test(text)) {
      return '0123456789012345678901234'
    } else {
      return 'undefined';
    }
  }),
}));

const legalText = `Pursuant to the adjudication of a force majeure clause within the context of contractual`

const codeText = `import numpy as np

def rabin_karp_search(pattern, text, prime=101):
`;

const examples = [
  {
    name: 'Basic usage',
    inputs: {
      targetTokenSize: 100,
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
];

describe('Summarizing map', () => {
  examples.forEach((example) => {
    it(example.name, async () => {
      const map = new SummarizingMap(example.inputs.targetTokenSize, example.inputs.model);

      for (const input of example.inputs.keys) {
        map.set(input);
      }

      const result = await map.getAll();

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
          const found = budgets.find(b => b.key === want.key);
          expect(found.budget).gt(want.budget[0]);
          expect(found.budget).lt(want.budget[1]);
        }
      }
    });
  });
});