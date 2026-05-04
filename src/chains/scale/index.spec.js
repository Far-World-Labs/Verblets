import { vi, beforeEach, expect } from 'vitest';
import scaleItem, { scaleSpec, scaleInstructions, mapScale, mapScaleParallel } from './index.js';
import llm from '../../lib/llm/index.js';
import map from '../map/index.js';
import { runTable } from '../../lib/examples-runner/index.js';

vi.mock('../../lib/llm/index.js', async (importOriginal) => ({
  ...(await importOriginal()),
  default: vi.fn(),
}));

vi.mock('../map/index.js', () => ({ default: vi.fn() }));

vi.mock('../../lib/parallel-batch/index.js', () => ({
  default: vi.fn(async (items, processor) => {
    for (let i = 0; i < items.length; i++) await processor(items[i], i);
  }),
}));

beforeEach(() => vi.clearAllMocks());

const mockSpec = { domain: 'd', range: 'r', mapping: 'm' };

// ─── scaleItem ───────────────────────────────────────────────────────────

runTable({
  describe: 'scaleItem',
  examples: [
    {
      name: 'scales a numeric value with spec generation',
      inputs: {
        item: { stars: 3 },
        instructions: 'sample mapping',
        mocks: [{ domain: 'stars 1-5', range: '0-100 quality', mapping: 'linear' }, 50],
        want: 50,
        wantNthCalls: {
          1: { contains: '<scaling-instructions>', system: 'scale specification generator' },
          2: { contains: '<scale-specification>' },
        },
      },
    },
    {
      name: 'handles text input',
      inputs: {
        item: 'excellent',
        instructions: 'Map sentiment words to a 0-100 scale',
        mocks: [{ domain: 'sentiment words', range: '0-100', mapping: 'sentiment mapping' }, 75],
        want: 75,
      },
    },
    {
      name: 'throws when LLM returns object output (schema declares number|string)',
      inputs: {
        item: 'very important task',
        instructions: 'Categorize and provide confidence',
        mocks: [
          {
            domain: 'task descriptions',
            range: 'confidence and category',
            mapping: 'categorization',
          },
          { confidence: 0.8, category: 'high' },
        ],
        throws: /expected number or string/,
      },
    },
    {
      name: 'serializes object inputs into the prompt',
      inputs: {
        item: { nested: { value: 123 }, array: [1, 2, 3] },
        instructions: 'Scale complex objects',
        mocks: [
          { domain: 'complex objects', range: 'scaled values', mapping: 'object scaling' },
          30,
        ],
        wantPromptContains: '<item>',
      },
    },
    {
      name: 'skips spec generation when spec provided via instruction bundle',
      inputs: {
        item: 4,
        instructions: { text: 'Scale this', spec: mockSpec },
        mocks: [75],
        want: 75,
        wantLlmCalls: 1,
        wantPromptContains: '<scale-specification>',
      },
    },
  ],
  process: async ({ item, instructions, mocks }) => {
    for (const m of mocks) vi.mocked(llm).mockResolvedValueOnce(m);
    return scaleItem(item, instructions);
  },
  expects: ({ result, error, inputs }) => {
    if ('throws' in inputs) {
      expect(error?.message).toMatch(inputs.throws);
      return;
    }
    if (error) throw error;
    if ('want' in inputs) expect(result).toEqual(inputs.want);
    if ('wantLlmCalls' in inputs) expect(llm).toHaveBeenCalledTimes(inputs.wantLlmCalls);
    if ('wantPromptContains' in inputs) {
      expect(llm).toHaveBeenCalledWith(
        expect.stringContaining(inputs.wantPromptContains),
        expect.any(Object)
      );
    }
    if (inputs.wantNthCalls) {
      for (const [n, spec] of Object.entries(inputs.wantNthCalls)) {
        const matchers = [expect.stringContaining(spec.contains)];
        const optMatcher = spec.system
          ? expect.objectContaining({
              systemPrompt: expect.stringContaining(spec.system),
            })
          : expect.any(Object);
        expect(llm).toHaveBeenNthCalledWith(Number(n), ...matchers, optMatcher);
      }
    }
  },
});

// ─── scaleSpec ───────────────────────────────────────────────────────────

runTable({
  describe: 'scaleSpec',
  examples: [
    {
      name: 'generates a scale specification',
      inputs: {
        prompt: 'Convert temperatures',
        mock: () =>
          vi.mocked(llm).mockResolvedValue({
            domain: 'Complete domain',
            range: 'Complete range',
            mapping: 'Complete mapping',
          }),
        want: {
          domain: 'Complete domain',
          range: 'Complete range',
          mapping: 'Complete mapping',
        },
        wantPromptContains: 'Analyze these scaling instructions',
        wantSystemContains: 'scale specification generator',
      },
    },
  ],
  process: async ({ prompt, mock }) => {
    if (mock) mock();
    return scaleSpec(prompt);
  },
  expects: ({ result, inputs }) => {
    expect(result).toEqual(inputs.want);
    expect(llm).toHaveBeenCalledWith(
      expect.stringContaining(inputs.wantPromptContains),
      expect.objectContaining({
        systemPrompt: expect.stringContaining(inputs.wantSystemContains),
      })
    );
  },
});

// ─── scaleInstructions ───────────────────────────────────────────────────

runTable({
  describe: 'scaleInstructions',
  examples: [
    {
      name: 'returns an instruction bundle with spec',
      inputs: {
        spec: { domain: 'test', range: 'test', mapping: 'test' },
        wantTextContains: 'scale specification',
      },
    },
    {
      name: 'passes through additional context keys',
      inputs: { spec: 'spec', domain: 'temperature', want: { domain: 'temperature' } },
    },
  ],
  process: (params) => scaleInstructions(params),
  expects: ({ result, inputs }) => {
    if (inputs.wantTextContains) {
      expect(result.text).toContain(inputs.wantTextContains);
      expect(result.spec).toBe(inputs.spec);
    }
    if ('want' in inputs) expect(result).toMatchObject(inputs.want);
  },
});

// ─── mapScale (batched) ──────────────────────────────────────────────────

runTable({
  describe: 'mapScale',
  examples: [
    {
      name: 'generates spec once and routes through the map chain',
      inputs: {
        list: [1, 2, 3],
        instructions: 'scale 1-3 to 0-30',
        mock: () => {
          vi.mocked(llm).mockResolvedValueOnce(mockSpec);
          vi.mocked(map).mockResolvedValueOnce([10, 20, 30]);
        },
        want: [10, 20, 30],
        wantLlmCalls: 1,
        wantMapCalls: 1,
        wantMapInstructionsContains: '<scale-specification>',
      },
    },
    {
      name: 'skips spec generation when spec is in the bundle',
      inputs: {
        list: [1, 2],
        instructions: { text: 'ignored', spec: mockSpec },
        mock: () => vi.mocked(map).mockResolvedValueOnce([5, 7]),
        want: [5, 7],
        wantLlmCalls: 0,
      },
    },
    {
      name: 'reports partial outcome when some slots fail',
      inputs: {
        list: [1, 2, 3],
        instructions: { text: 'x', spec: mockSpec },
        withEvents: true,
        mock: () => vi.mocked(map).mockResolvedValueOnce([10, undefined, 30]),
        wantOutcome: 'partial',
        wantFailedItems: 1,
      },
    },
    {
      name: 'serializes object items into strings before dispatch',
      inputs: {
        list: [{ a: 1 }, 'plain'],
        instructions: { text: 'x', spec: mockSpec },
        mock: () => vi.mocked(map).mockResolvedValueOnce([1, 2]),
        wantMapList: ['{"a":1}', 'plain'],
      },
    },
  ],
  process: async ({ list, instructions, mock, withEvents }) => {
    if (mock) mock();
    if (withEvents) {
      const events = [];
      const value = await mapScale(list, instructions, { onProgress: (e) => events.push(e) });
      return { value, events };
    }
    return mapScale(list, instructions);
  },
  expects: ({ result, inputs }) => {
    if ('want' in inputs) expect(result).toEqual(inputs.want);
    if ('wantLlmCalls' in inputs) expect(llm).toHaveBeenCalledTimes(inputs.wantLlmCalls);
    if ('wantMapCalls' in inputs) expect(map).toHaveBeenCalledTimes(inputs.wantMapCalls);
    if (inputs.wantMapInstructionsContains) {
      expect(vi.mocked(map).mock.calls[0][1]).toContain(inputs.wantMapInstructionsContains);
    }
    if (inputs.wantOutcome) {
      const complete = result.events.find((e) => e.event === 'chain:complete');
      expect(complete.outcome).toBe(inputs.wantOutcome);
      if ('wantFailedItems' in inputs) {
        expect(complete.failedItems).toBe(inputs.wantFailedItems);
      }
    }
    if (inputs.wantMapList) {
      expect(vi.mocked(map).mock.calls[0][0]).toEqual(inputs.wantMapList);
    }
  },
});

// ─── mapScaleParallel ────────────────────────────────────────────────────

runTable({
  describe: 'mapScaleParallel',
  examples: [
    {
      name: 'runs scaleItem per item with one shared spec',
      inputs: {
        list: [1, 2, 3],
        instructions: 'scale 1-3 to 0-30',
        mocks: [mockSpec, 10, 20, 30],
        want: [10, 20, 30],
        wantLlmCalls: 4,
      },
    },
    {
      name: 'skips spec generation when bundled',
      inputs: {
        list: [1, 2],
        instructions: { text: 'x', spec: mockSpec },
        mocks: [5, 7],
        want: [5, 7],
        wantLlmCalls: 2,
      },
    },
    {
      name: 'reports partial outcome when an item fails',
      inputs: {
        list: [1, 2],
        instructions: { text: 'x', spec: mockSpec },
        mocks: [10],
        reject: new Error('boom'),
        options: { maxAttempts: 1 },
        withEvents: true,
        wantValue: [10, undefined],
        wantOutcome: 'partial',
      },
    },
    {
      name: 'throws when every item fails',
      inputs: {
        list: [1, 2],
        instructions: { text: 'x', spec: mockSpec },
        mock: () => vi.mocked(llm).mockRejectedValue(new Error('boom')),
        options: { maxAttempts: 1 },
        throws: /all 2 items failed to scale/,
      },
    },
  ],
  process: async ({ list, instructions, mocks, reject, mock, options, withEvents }) => {
    if (mock) mock();
    if (mocks) {
      for (const m of mocks) vi.mocked(llm).mockResolvedValueOnce(m);
      if (reject) vi.mocked(llm).mockRejectedValueOnce(reject);
    }
    if (withEvents) {
      const events = [];
      const value = await mapScaleParallel(list, instructions, {
        ...options,
        onProgress: (e) => events.push(e),
      });
      return { value, events };
    }
    return mapScaleParallel(list, instructions, options);
  },
  expects: ({ result, error, inputs }) => {
    if ('throws' in inputs) {
      expect(error?.message).toMatch(inputs.throws);
      return;
    }
    if (error) throw error;
    if ('want' in inputs) expect(result).toEqual(inputs.want);
    if ('wantLlmCalls' in inputs) expect(llm).toHaveBeenCalledTimes(inputs.wantLlmCalls);
    if (inputs.wantValue) {
      expect(result.value[0]).toBe(inputs.wantValue[0]);
      expect(result.value[1]).toBeUndefined();
    }
    if (inputs.wantOutcome) {
      const complete = result.events.find(
        (e) => e.event === 'chain:complete' && e.step === 'scale:parallel'
      );
      expect(complete.outcome).toBe(inputs.wantOutcome);
    }
  },
});
