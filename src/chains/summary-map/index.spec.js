import { vi, expect } from 'vitest';
import pave from '../../lib/pave/index.js';
import SummaryMap from './index.js';
import llm from '../../lib/llm/index.js';
import { runTable } from '../../lib/examples-runner/index.js';

vi.mock('../../services/llm-model/index.js', () => {
  const modelStub = {
    name: 'test-model',
    tokenizer: (text) => text.split(' '),
    maxContextWindow: 128000,
    maxOutputTokens: 16384,
    maxTokens: 16384,
    toTokens(text) {
      return this.tokenizer(text);
    },
    budgetTokens(text, { completionMax = Infinity } = {}) {
      const prompt = this.toTokens(text).length;
      const total = this.maxContextWindow;
      const completion = Math.min(Math.min(total - prompt, this.maxOutputTokens), completionMax);
      return { completion, prompt, total };
    },
  };
  return {
    default: {
      negotiateModel: vi.fn().mockReturnValue({ name: 'test-model' }),
      getBestPublicModel: vi.fn().mockReturnValue(modelStub),
      getModel: vi.fn().mockReturnValue(modelStub),
    },
  };
});

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn().mockImplementation((text) => {
    if (/Pursuant to the adjudication/.test(text)) {
      return '01234567890123456789012345678901234567890123456789';
    }
    if (/rabin_karp_search/.test(text)) return '0123456789012345678901234';
    return 'undefined';
  }),
}));

const legalText =
  'Pursuant to the adjudication of a force majeure clause within the context of contractual';

const codeText = `import numpy as np

def rabin_karp_search(pattern, text, prime=101):
`;

// ─── SummaryMap (parametric scenarios) ────────────────────────────────────

const summaryExamples = [
  {
    name: 'Basic usage',
    inputs: {
      targetTokens: 100,
      keys: [
        { key: 'example.text', value: legalText, weight: 1, type: 'text' },
        { key: 'example.code', value: codeText, weight: 0.5, type: 'code' },
      ],
      wants: [
        { key: 'example.text', resultLength: 50, budget: [60, 80] },
        { key: 'example.code', resultLength: 25, budget: [20, 40] },
      ],
    },
    check: ({ result }) => assertScenario(result),
  },
  {
    name: 'Model options and sensitivity',
    inputs: {
      targetTokens: 50,
      llmConfig: { fast: true, good: true },
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
      wants: [
        { key: 'example.text', resultLength: 50 },
        { key: 'example.code', resultLength: 25 },
      ],
      assertSensitive: true,
    },
    check: ({ result, inputs }) => {
      assertScenario(result);
      if (inputs.assertSensitive) {
        const sensitiveCall = llm.mock.calls.find((c) => c[1]?.sensitive === true);
        expect(sensitiveCall).toBeTruthy();
      }
    },
  },
];

function assertScenario({ tree, wants, map }) {
  for (const want of wants) {
    let value = tree;
    for (const seg of want.key.split('.')) value = value[seg];
    expect(typeof value).toBe('string');
    expect(value.length).toBeLessThanOrEqual(want.resultLength);
    if (want.budget) {
      const { budgets } = map.calculateBudgets();
      const found = budgets.find((b) => b.key === want.key);
      expect(found.budget).gt(want.budget[0]);
      expect(found.budget).lt(want.budget[1]);
    }
  }
}

runTable({
  describe: 'Summary map',
  examples: summaryExamples,
  process: async ({ targetTokens, llmConfig, keys, wants }) => {
    vi.clearAllMocks();
    const map = new SummaryMap({
      targetTokens,
      ...(llmConfig && { llm: llmConfig }),
    });
    for (const entry of keys) map.set(entry.key, entry);
    const entries = Array.from(await map.entries());
    const tree = entries.reduce((acc, [k, v]) => pave(acc, k, v), {});
    return { tree, wants, map };
  },
});

// ─── single-method behaviors ──────────────────────────────────────────────

runTable({
  describe: 'SummaryMap — single-method behaviors',
  examples: [
    {
      name: 'get() returns summarized value for a key that was set',
      inputs: {},
      check: async () => {
        vi.clearAllMocks();
        const map = new SummaryMap({ targetTokens: 100 });
        map.set('example.text', {
          key: 'example.text',
          value: legalText,
          weight: 1,
          type: 'text',
        });
        const result = await map.get('example.text');
        expect(result).not.toBeNull();
        expect(typeof result).toBe('string');
      },
    },
    {
      name: 'get() returns undefined for a key that was never set',
      inputs: {},
      check: () => {
        const map = new SummaryMap({ targetTokens: 100 });
        expect(map.get('nonexistent')).toBeUndefined();
      },
    },
    {
      name: 'build() assembles cached entries as XML context',
      inputs: {},
      check: async () => {
        vi.clearAllMocks();
        const map = new SummaryMap({ targetTokens: 100 });
        map.set('knowledge', { key: 'knowledge', value: legalText, weight: 1, type: 'text' });
        map.set('code', { key: 'code', value: codeText, weight: 0.5, type: 'code' });
        const result = await map.build();
        expect(result).toContain('<knowledge>');
        expect(result).toContain('</knowledge>');
        expect(result).toContain('<code>');
        expect(result).toContain('</code>');
        expect(result).toMatch(/<\/code>\n\n<knowledge>/);
      },
    },
    {
      name: 'buildStale() returns empty string before cache fill',
      inputs: {},
      check: () => {
        const map = new SummaryMap({ targetTokens: 100 });
        map.set('a', { key: 'a', value: 'text', weight: 1 });
        expect(map.buildStale()).toBe('');
      },
    },
  ],
  process: () => undefined,
});
