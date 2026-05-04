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

// ─── SummaryMap (parametric scenarios) ──────────────────────────────────

runTable({
  describe: 'Summary map',
  examples: [
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
        wantSensitiveCall: true,
      },
    },
  ],
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
  expects: ({ result, inputs }) => {
    for (const want of result.wants) {
      let value = result.tree;
      for (const seg of want.key.split('.')) value = value[seg];
      expect(typeof value).toBe('string');
      expect(value.length).toBeLessThanOrEqual(want.resultLength);
      if (want.budget) {
        const { budgets } = result.map.calculateBudgets();
        const found = budgets.find((b) => b.key === want.key);
        expect(found.budget).gt(want.budget[0]);
        expect(found.budget).lt(want.budget[1]);
      }
    }
    if (inputs.wantSensitiveCall) {
      const sensitiveCall = llm.mock.calls.find((c) => c[1]?.sensitive === true);
      expect(sensitiveCall).toBeTruthy();
    }
  },
});

// ─── single-method behaviors (different vocabularies — split into rows
// that each declare their own check via control flag) ──────────────────

runTable({
  describe: 'SummaryMap — single-method behaviors',
  examples: [
    { name: 'get() returns summarized value for a key that was set', inputs: { case: 'getSet' } },
    {
      name: 'get() returns undefined for a key that was never set',
      inputs: { case: 'getMissing' },
    },
    { name: 'build() assembles cached entries as XML context', inputs: { case: 'build' } },
    {
      name: 'buildStale() returns empty string before cache fill',
      inputs: { case: 'buildStale' },
    },
  ],
  process: async ({ case: caseName }) => {
    vi.clearAllMocks();
    if (caseName === 'getSet') {
      const map = new SummaryMap({ targetTokens: 100 });
      map.set('example.text', { key: 'example.text', value: legalText, weight: 1, type: 'text' });
      return { case: caseName, value: await map.get('example.text') };
    }
    if (caseName === 'getMissing') {
      const map = new SummaryMap({ targetTokens: 100 });
      return { case: caseName, value: map.get('nonexistent') };
    }
    if (caseName === 'build') {
      const map = new SummaryMap({ targetTokens: 100 });
      map.set('knowledge', { key: 'knowledge', value: legalText, weight: 1, type: 'text' });
      map.set('code', { key: 'code', value: codeText, weight: 0.5, type: 'code' });
      return { case: caseName, value: await map.build() };
    }
    if (caseName === 'buildStale') {
      const map = new SummaryMap({ targetTokens: 100 });
      map.set('a', { key: 'a', value: 'text', weight: 1 });
      return { case: caseName, value: map.buildStale() };
    }
    return undefined;
  },
  expects: ({ result }) => {
    if (result.case === 'getSet') {
      expect(result.value).not.toBeNull();
      expect(typeof result.value).toBe('string');
    } else if (result.case === 'getMissing') {
      expect(result.value).toBeUndefined();
    } else if (result.case === 'build') {
      expect(result.value).toContain('<knowledge>');
      expect(result.value).toContain('</knowledge>');
      expect(result.value).toContain('<code>');
      expect(result.value).toContain('</code>');
      expect(result.value).toMatch(/<\/code>\n\n<knowledge>/);
    } else if (result.case === 'buildStale') {
      expect(result.value).toBe('');
    }
  },
});
