import { describe, expect, it, vi } from 'vitest';
import pave from '../../lib/pave/index.js';
import SummaryMap, { mapSummaryDetail } from './index.js';
import llm from '../../lib/llm/index.js';

vi.mock('../../services/llm-model/index.js', () => ({
  default: {
    negotiateModel: vi.fn().mockReturnValue('fastGood'),
    getBestPublicModel: vi.fn().mockReturnValue({
      name: 'fastGood',
      tokenizer: (text) => text.split(' '),
      maxContextWindow: 128000,
      maxOutputTokens: 16384,
      toTokens(text) {
        return this.tokenizer(text);
      },
      budgetTokens(text, { completionMax = Infinity } = {}) {
        const prompt = this.toTokens(text).length;
        const total = this.maxContextWindow;
        const completion = Math.min(Math.min(total - prompt, this.maxOutputTokens), completionMax);
        return {
          completion,
          prompt,
          total,
        };
      },
    }),
    getModel: vi.fn().mockReturnValue({
      name: 'fastGood',
      tokenizer: (text) => text.split(' '),
      maxContextWindow: 128000,
      maxOutputTokens: 16384,
      toTokens(text) {
        return this.tokenizer(text);
      },
      budgetTokens(text, { completionMax = Infinity } = {}) {
        const prompt = this.toTokens(text).length;
        const total = this.maxContextWindow;
        const completion = Math.min(Math.min(total - prompt, this.maxOutputTokens), completionMax);
        return {
          completion,
          prompt,
          total,
        };
      },
    }),
  },
}));

vi.mock('../../lib/llm/index.js', () => ({
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
    name: 'Model options and sensitivity',
    inputs: {
      targetTokens: 50,
      modelOptions: { modelName: 'fastGood' },
      keys: [
        {
          key: 'example.text',
          value: legalText,
          weight: 1,
          type: 'text',
          sensitivity: { blacklist: 'names' },
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

      if (example.name === 'Model options and sensitivity') {
        const callWithSensitive = llm.mock.calls.find(
          (c) => c[1]?.modelOptions?.sensitive === true
        );
        expect(callWithSensitive).toBeTruthy();
      }
    });
  });

  it('get() returns summarized value for a key that was set', async () => {
    vi.clearAllMocks();
    const map = new SummaryMap({ targetTokens: 100 });
    map.set('example.text', { key: 'example.text', value: legalText, weight: 1, type: 'text' });

    const result = await map.get('example.text');

    expect(result).not.toBeNull();
    expect(typeof result).toBe('string');
  });

  it('get() returns null for a key that was never set', async () => {
    const map = new SummaryMap({ targetTokens: 100 });

    const result = map.get('nonexistent');

    expect(result).toBeNull();
  });
});

describe('mapSummaryDetail', () => {
  it('returns 0.3 for undefined', () => {
    expect(mapSummaryDetail(undefined)).toBe(0.3);
  });

  it('returns 0.4 for low', () => {
    expect(mapSummaryDetail('low')).toBe(0.4);
  });

  it('returns 0.2 for high', () => {
    expect(mapSummaryDetail('high')).toBe(0.2);
  });

  it('passes through a number', () => {
    expect(mapSummaryDetail(0.35)).toBe(0.35);
  });

  it('returns 0.3 for unknown string', () => {
    expect(mapSummaryDetail('medium')).toBe(0.3);
  });
});
