import { vi, beforeEach, expect } from 'vitest';
import scaleItem, { scaleSpec, scaleInstructions, mapScale, mapScaleParallel } from './index.js';
import llm from '../../lib/llm/index.js';
import map from '../map/index.js';
import { runTable, equals, partial, all, throws } from '../../lib/examples-runner/index.js';

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

// ─── scaleItem ────────────────────────────────────────────────────────────

const scaleItemExamples = [
  {
    name: 'scales a numeric value with spec generation',
    inputs: {
      item: { stars: 3 },
      instructions: 'sample mapping',
      mocks: [{ domain: 'stars 1-5', range: '0-100 quality', mapping: 'linear' }, 50],
    },
    check: all(equals(50), () => {
      expect(llm).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('<scaling-instructions>'),
        expect.objectContaining({
          systemPrompt: expect.stringContaining('scale specification generator'),
        })
      );
      expect(llm).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('<scale-specification>'),
        expect.any(Object)
      );
    }),
  },
  {
    name: 'handles text input',
    inputs: {
      item: 'excellent',
      instructions: 'Map sentiment words to a 0-100 scale',
      mocks: [{ domain: 'sentiment words', range: '0-100', mapping: 'sentiment mapping' }, 75],
    },
    check: equals(75),
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
    },
    check: throws(/expected number or string/),
  },
  {
    name: 'serializes object inputs into the prompt',
    inputs: {
      item: { nested: { value: 123 }, array: [1, 2, 3] },
      instructions: 'Scale complex objects',
      mocks: [{ domain: 'complex objects', range: 'scaled values', mapping: 'object scaling' }, 30],
    },
    check: () =>
      expect(llm).toHaveBeenCalledWith(expect.stringContaining('<item>'), expect.any(Object)),
  },
  {
    name: 'skips spec generation when spec provided via instruction bundle',
    inputs: {
      item: 4,
      instructions: { text: 'Scale this', spec: mockSpec },
      mocks: [75],
    },
    check: all(equals(75), () => {
      expect(llm).toHaveBeenCalledTimes(1);
      expect(llm).toHaveBeenCalledWith(
        expect.stringContaining('<scale-specification>'),
        expect.any(Object)
      );
    }),
  },
];

runTable({
  describe: 'scaleItem',
  examples: scaleItemExamples,
  process: async ({ item, instructions, mocks }) => {
    for (const m of mocks) vi.mocked(llm).mockResolvedValueOnce(m);
    return scaleItem(item, instructions);
  },
});

// ─── scaleSpec ────────────────────────────────────────────────────────────

runTable({
  describe: 'scaleSpec',
  examples: [
    {
      name: 'generates a scale specification',
      inputs: {
        prompt: 'Convert temperatures',
        preMock: () =>
          vi.mocked(llm).mockResolvedValue({
            domain: 'Complete domain',
            range: 'Complete range',
            mapping: 'Complete mapping',
          }),
      },
      check: all(
        equals({ domain: 'Complete domain', range: 'Complete range', mapping: 'Complete mapping' }),
        () => {
          expect(llm).toHaveBeenCalledWith(
            expect.stringContaining('Analyze these scaling instructions'),
            expect.objectContaining({
              systemPrompt: expect.stringContaining('scale specification generator'),
            })
          );
        }
      ),
    },
  ],
  process: async ({ prompt, preMock }) => {
    if (preMock) preMock();
    return scaleSpec(prompt);
  },
});

// ─── scaleInstructions (pure) ─────────────────────────────────────────────

runTable({
  describe: 'scaleInstructions',
  examples: [
    {
      name: 'returns an instruction bundle with spec',
      inputs: { spec: { domain: 'test', range: 'test', mapping: 'test' } },
      check: ({ result, inputs }) => {
        expect(result.text).toContain('scale specification');
        expect(result.spec).toBe(inputs.spec);
      },
    },
    {
      name: 'passes through additional context keys',
      inputs: { spec: 'spec', domain: 'temperature' },
      check: partial({ domain: 'temperature' }),
    },
  ],
  process: (params) => scaleInstructions(params),
});

// ─── mapScale (batched) ───────────────────────────────────────────────────

const mapScaleExamples = [
  {
    name: 'generates spec once and routes through the map chain',
    inputs: {
      list: [1, 2, 3],
      instructions: 'scale 1-3 to 0-30',
      preMock: () => {
        vi.mocked(llm).mockResolvedValueOnce(mockSpec);
        vi.mocked(map).mockResolvedValueOnce([10, 20, 30]);
      },
    },
    check: all(equals([10, 20, 30]), () => {
      expect(llm).toHaveBeenCalledTimes(1);
      expect(map).toHaveBeenCalledTimes(1);
      expect(vi.mocked(map).mock.calls[0][1]).toContain('<scale-specification>');
    }),
  },
  {
    name: 'skips spec generation when spec is in the bundle',
    inputs: {
      list: [1, 2],
      instructions: { text: 'ignored', spec: mockSpec },
      preMock: () => vi.mocked(map).mockResolvedValueOnce([5, 7]),
    },
    check: all(equals([5, 7]), () => expect(llm).not.toHaveBeenCalled()),
  },
  {
    name: 'reports partial outcome when some slots fail',
    inputs: {
      list: [1, 2, 3],
      instructions: { text: 'x', spec: mockSpec },
      withEvents: true,
      preMock: () => vi.mocked(map).mockResolvedValueOnce([10, undefined, 30]),
    },
    check: ({ result }) => {
      const complete = result.events.find((e) => e.event === 'chain:complete');
      expect(complete.outcome).toBe('partial');
      expect(complete.failedItems).toBe(1);
    },
  },
  {
    name: 'serializes object items into strings before dispatch',
    inputs: {
      list: [{ a: 1 }, 'plain'],
      instructions: { text: 'x', spec: mockSpec },
      preMock: () => vi.mocked(map).mockResolvedValueOnce([1, 2]),
    },
    check: () => {
      const list = vi.mocked(map).mock.calls[0][0];
      expect(list[0]).toBe('{"a":1}');
      expect(list[1]).toBe('plain');
    },
  },
];

runTable({
  describe: 'mapScale',
  examples: mapScaleExamples,
  process: async ({ list, instructions, preMock, withEvents }) => {
    if (preMock) preMock();
    if (withEvents) {
      const events = [];
      const result = await mapScale(list, instructions, { onProgress: (e) => events.push(e) });
      return { result, events };
    }
    return mapScale(list, instructions);
  },
});

// ─── mapScaleParallel ─────────────────────────────────────────────────────

const mapScaleParallelExamples = [
  {
    name: 'runs scaleItem per item with one shared spec',
    inputs: {
      list: [1, 2, 3],
      instructions: 'scale 1-3 to 0-30',
      mocks: [mockSpec, 10, 20, 30],
    },
    check: all(equals([10, 20, 30]), () => expect(llm).toHaveBeenCalledTimes(4)),
  },
  {
    name: 'skips spec generation when bundled',
    inputs: {
      list: [1, 2],
      instructions: { text: 'x', spec: mockSpec },
      mocks: [5, 7],
    },
    check: all(equals([5, 7]), () => expect(llm).toHaveBeenCalledTimes(2)),
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
    },
    check: ({ result }) => {
      expect(result.result[0]).toBe(10);
      expect(result.result[1]).toBeUndefined();
      const complete = result.events.find(
        (e) => e.event === 'chain:complete' && e.step === 'scale:parallel'
      );
      expect(complete.outcome).toBe('partial');
    },
  },
  {
    name: 'throws when every item fails',
    inputs: {
      list: [1, 2],
      instructions: { text: 'x', spec: mockSpec },
      preMock: () => vi.mocked(llm).mockRejectedValue(new Error('boom')),
      options: { maxAttempts: 1 },
    },
    check: throws(/all 2 items failed to scale/),
  },
];

runTable({
  describe: 'mapScaleParallel',
  examples: mapScaleParallelExamples,
  process: async ({ list, instructions, mocks, reject, preMock, options, withEvents }) => {
    if (preMock) preMock();
    if (mocks) {
      for (const m of mocks) vi.mocked(llm).mockResolvedValueOnce(m);
      if (reject) vi.mocked(llm).mockRejectedValueOnce(reject);
    }
    if (withEvents) {
      const events = [];
      const result = await mapScaleParallel(list, instructions, {
        ...options,
        onProgress: (e) => events.push(e),
      });
      return { result, events };
    }
    return mapScaleParallel(list, instructions, options);
  },
});
