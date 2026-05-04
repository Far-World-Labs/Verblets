import { vi, beforeEach, expect } from 'vitest';
import scaleItem, { scaleSpec, scaleInstructions, mapScale, mapScaleParallel } from './index.js';
import llm from '../../lib/llm/index.js';
import map from '../map/index.js';
import { runTable, applyMocks } from '../../lib/examples-runner/index.js';

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

runTable({
  describe: 'scaleItem',
  examples: [
    {
      name: 'scales a numeric value with spec generation',
      inputs: { item: { stars: 3 }, instructions: 'sample mapping' },
      mocks: { llm: [{ domain: 'stars 1-5', range: '0-100 quality', mapping: 'linear' }, 50] },
      want: {
        value: 50,
        nthCalls: {
          1: { contains: '<scaling-instructions>', system: 'scale specification generator' },
          2: { contains: '<scale-specification>' },
        },
      },
    },
    {
      name: 'handles text input',
      inputs: { item: 'excellent', instructions: 'Map sentiment words to a 0-100 scale' },
      mocks: {
        llm: [{ domain: 'sentiment words', range: '0-100', mapping: 'sentiment mapping' }, 75],
      },
      want: { value: 75 },
    },
    {
      name: 'throws when LLM returns object output (schema declares number|string)',
      inputs: { item: 'very important task', instructions: 'Categorize and provide confidence' },
      mocks: {
        llm: [
          {
            domain: 'task descriptions',
            range: 'confidence and category',
            mapping: 'categorization',
          },
          { confidence: 0.8, category: 'high' },
        ],
      },
      want: { throws: /expected number or string/ },
    },
    {
      name: 'serializes object inputs into the prompt',
      inputs: {
        item: { nested: { value: 123 }, array: [1, 2, 3] },
        instructions: 'Scale complex objects',
      },
      mocks: {
        llm: [{ domain: 'complex objects', range: 'scaled values', mapping: 'object scaling' }, 30],
      },
      want: { promptContains: '<item>' },
    },
    {
      name: 'skips spec generation when spec provided via instruction bundle',
      inputs: { item: 4, instructions: { text: 'Scale this', spec: mockSpec } },
      mocks: { llm: [75] },
      want: { value: 75, llmCalls: 1, promptContains: '<scale-specification>' },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { llm });
    return scaleItem(inputs.item, inputs.instructions);
  },
  expects: ({ result, error, want }) => {
    if (want.throws) {
      expect(error?.message).toMatch(want.throws);
      return;
    }
    if (error) throw error;
    if ('value' in want) expect(result).toEqual(want.value);
    if ('llmCalls' in want) expect(llm).toHaveBeenCalledTimes(want.llmCalls);
    if ('promptContains' in want) {
      expect(llm).toHaveBeenCalledWith(
        expect.stringContaining(want.promptContains),
        expect.any(Object)
      );
    }
    if (want.nthCalls) {
      for (const [n, spec] of Object.entries(want.nthCalls)) {
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

runTable({
  describe: 'scaleSpec',
  examples: [
    {
      name: 'generates a scale specification',
      inputs: { prompt: 'Convert temperatures' },
      mocks: {
        llm: [{ domain: 'Complete domain', range: 'Complete range', mapping: 'Complete mapping' }],
      },
      want: {
        value: { domain: 'Complete domain', range: 'Complete range', mapping: 'Complete mapping' },
        promptContains: 'Analyze these scaling instructions',
        systemContains: 'scale specification generator',
      },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { llm });
    return scaleSpec(inputs.prompt);
  },
  expects: ({ result, want }) => {
    expect(result).toEqual(want.value);
    expect(llm).toHaveBeenCalledWith(
      expect.stringContaining(want.promptContains),
      expect.objectContaining({
        systemPrompt: expect.stringContaining(want.systemContains),
      })
    );
  },
});

runTable({
  describe: 'scaleInstructions',
  examples: [
    {
      name: 'returns an instruction bundle with spec',
      inputs: { spec: { domain: 'test', range: 'test', mapping: 'test' } },
      want: { textContains: 'scale specification' },
    },
    {
      name: 'passes through additional context keys',
      inputs: { spec: 'spec', domain: 'temperature' },
      want: { matches: { domain: 'temperature' } },
    },
  ],
  process: ({ inputs }) => scaleInstructions(inputs),
  expects: ({ result, inputs, want }) => {
    if (want.textContains) {
      expect(result.text).toContain(want.textContains);
      expect(result.spec).toBe(inputs.spec);
    }
    if (want.matches) expect(result).toMatchObject(want.matches);
  },
});

runTable({
  describe: 'mapScale',
  examples: [
    {
      name: 'generates spec once and routes through the map chain',
      inputs: { list: [1, 2, 3], instructions: 'scale 1-3 to 0-30' },
      mocks: { llm: [mockSpec], map: [[10, 20, 30]] },
      want: {
        value: [10, 20, 30],
        llmCalls: 1,
        mapCalls: 1,
        mapInstructionsContains: '<scale-specification>',
      },
    },
    {
      name: 'skips spec generation when spec is in the bundle',
      inputs: { list: [1, 2], instructions: { text: 'ignored', spec: mockSpec } },
      mocks: { map: [[5, 7]] },
      want: { value: [5, 7], llmCalls: 0 },
    },
    {
      name: 'reports partial outcome when some slots fail',
      inputs: {
        list: [1, 2, 3],
        instructions: { text: 'x', spec: mockSpec },
        withEvents: true,
      },
      mocks: { map: [[10, undefined, 30]] },
      want: { outcome: 'partial', failedItems: 1 },
    },
    {
      name: 'serializes object items into strings before dispatch',
      inputs: { list: [{ a: 1 }, 'plain'], instructions: { text: 'x', spec: mockSpec } },
      mocks: { map: [[1, 2]] },
      want: { mapList: ['{"a":1}', 'plain'] },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { llm, map });
    if (inputs.withEvents) {
      const events = [];
      const value = await mapScale(inputs.list, inputs.instructions, {
        onProgress: (e) => events.push(e),
      });
      return { value, events };
    }
    return mapScale(inputs.list, inputs.instructions);
  },
  expects: ({ result, want }) => {
    if ('value' in want) expect(result).toEqual(want.value);
    if ('llmCalls' in want) expect(llm).toHaveBeenCalledTimes(want.llmCalls);
    if ('mapCalls' in want) expect(map).toHaveBeenCalledTimes(want.mapCalls);
    if (want.mapInstructionsContains) {
      expect(vi.mocked(map).mock.calls[0][1]).toContain(want.mapInstructionsContains);
    }
    if (want.outcome) {
      const complete = result.events.find((e) => e.event === 'chain:complete');
      expect(complete.outcome).toBe(want.outcome);
      if ('failedItems' in want) {
        expect(complete.failedItems).toBe(want.failedItems);
      }
    }
    if (want.mapList) {
      expect(vi.mocked(map).mock.calls[0][0]).toEqual(want.mapList);
    }
  },
});

runTable({
  describe: 'mapScaleParallel',
  examples: [
    {
      name: 'runs scaleItem per item with one shared spec',
      inputs: { list: [1, 2, 3], instructions: 'scale 1-3 to 0-30' },
      mocks: { llm: [mockSpec, 10, 20, 30] },
      want: { value: [10, 20, 30], llmCalls: 4 },
    },
    {
      name: 'skips spec generation when bundled',
      inputs: { list: [1, 2], instructions: { text: 'x', spec: mockSpec } },
      mocks: { llm: [5, 7] },
      want: { value: [5, 7], llmCalls: 2 },
    },
    {
      name: 'reports partial outcome when an item fails',
      inputs: {
        list: [1, 2],
        instructions: { text: 'x', spec: mockSpec },
        options: { maxAttempts: 1 },
        withEvents: true,
      },
      mocks: { llm: [10, new Error('boom')] },
      want: { value: [10, undefined], outcome: 'partial' },
    },
    {
      name: 'throws when every item fails',
      inputs: {
        list: [1, 2],
        instructions: { text: 'x', spec: mockSpec },
        options: { maxAttempts: 1 },
      },
      mocks: { llm: [new Error('boom'), new Error('boom')] },
      want: { throws: /all 2 items failed to scale/ },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { llm });
    if (inputs.withEvents) {
      const events = [];
      const value = await mapScaleParallel(inputs.list, inputs.instructions, {
        ...inputs.options,
        onProgress: (e) => events.push(e),
      });
      return { value, events };
    }
    return mapScaleParallel(inputs.list, inputs.instructions, inputs.options);
  },
  expects: ({ result, error, want }) => {
    if (want.throws) {
      expect(error?.message).toMatch(want.throws);
      return;
    }
    if (error) throw error;
    if ('value' in want && !want.outcome) expect(result).toEqual(want.value);
    if ('llmCalls' in want) expect(llm).toHaveBeenCalledTimes(want.llmCalls);
    if (want.outcome) {
      expect(result.value[0]).toBe(want.value[0]);
      expect(result.value[1]).toBeUndefined();
      const complete = result.events.find(
        (e) => e.event === 'chain:complete' && e.step === 'scale:parallel'
      );
      expect(complete.outcome).toBe(want.outcome);
    }
  },
});
