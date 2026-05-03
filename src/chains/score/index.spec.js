import { beforeEach, vi, expect } from 'vitest';
import score, {
  scoreItem,
  scoreSpec,
  scoreInstructions,
  scoreItemWithUncertainty,
  iterativeScoreLoop,
} from './index.js';
import llm from '../../lib/llm/index.js';
import { scaleSpec } from '../scale/index.js';
import listBatch from '../../verblets/list-batch/index.js';
import createBatches from '../../lib/text-batch/index.js';
import filter from '../filter/index.js';
import { ChainEvent, DomainEvent, OpEvent } from '../../lib/progress/constants.js';
import { runTable, partial, throws } from '../../lib/examples-runner/index.js';

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(),
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
}));

vi.mock('../scale/index.js', () => ({ scaleSpec: vi.fn() }));
vi.mock('../../verblets/list-batch/index.js', () => ({ default: vi.fn() }));
vi.mock('../../lib/text-batch/index.js', () => ({ default: vi.fn() }));
vi.mock('../../lib/parallel-batch/index.js', () => ({
  default: vi.fn(async (items, processor) => {
    for (let i = 0; i < items.length; i++) await processor(items[i], i);
  }),
  parallelBatch: vi.fn(),
}));
vi.mock('../filter/index.js', () => ({ default: vi.fn() }));
vi.mock('../reduce/index.js', () => ({ default: vi.fn() }));
vi.mock('../find/index.js', () => ({ default: vi.fn() }));
vi.mock('../group/index.js', () => ({ default: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  createBatches.mockReset();
  listBatch.mockReset();
});

const mockSpec = {
  domain: 'text items',
  range: '0-10 numeric score',
  mapping: 'length-based scoring',
};

// ─── score (default export, batched) ─────────────────────────────────────

const scoreExamples = [
  {
    name: 'scores a list of items via listBatch',
    inputs: {
      list: ['a', 'bb', 'ccc'],
      instructions: 'score by length',
      preMock: () => {
        scaleSpec.mockResolvedValueOnce(mockSpec);
        createBatches.mockReturnValueOnce([{ items: ['a', 'bb', 'ccc'], startIndex: 0 }]);
        listBatch.mockResolvedValueOnce([1, 2, 3]);
      },
    },
    check: ({ result }) => {
      expect(scaleSpec).toHaveBeenCalledWith(
        'score by length',
        expect.objectContaining({ now: expect.any(Date) })
      );
      expect(listBatch).toHaveBeenCalledWith(
        ['a', 'bb', 'ccc'],
        expect.stringContaining('score-specification'),
        expect.any(Object)
      );
      expect(result).toEqual([1, 2, 3]);
    },
  },
  {
    name: 'skips scoreSpec when spec is provided via instruction object',
    inputs: {
      list: ['x', 'y'],
      instructions: { text: 'ignored instructions', spec: mockSpec },
      preMock: () => {
        createBatches.mockReturnValueOnce([{ items: ['x', 'y'], startIndex: 0 }]);
        listBatch.mockResolvedValueOnce([5, 8]);
      },
    },
    check: ({ result }) => {
      expect(scaleSpec).not.toHaveBeenCalled();
      expect(listBatch).toHaveBeenCalledWith(
        ['x', 'y'],
        expect.stringContaining('score-specification'),
        expect.any(Object)
      );
      expect(result).toEqual([5, 8]);
    },
  },
  {
    name: 'handles multiple batches with anchoring',
    inputs: {
      list: ['a', 'b', 'c', 'd'],
      instructions: 'score items',
      preMock: () => {
        scaleSpec.mockResolvedValueOnce(mockSpec);
        createBatches.mockReturnValueOnce([
          { items: ['a', 'b'], startIndex: 0 },
          { items: ['c', 'd'], startIndex: 2 },
        ]);
        listBatch.mockResolvedValueOnce([2, 8]).mockResolvedValueOnce([5, 3]);
      },
    },
    check: ({ result }) => {
      expect(listBatch).toHaveBeenCalledTimes(2);
      expect(listBatch.mock.calls[1][1]).toContain('scoring-anchors');
      expect(result).toEqual([2, 8, 5, 3]);
    },
  },
  {
    name: 'retries items when LLM returns fewer scores than items',
    inputs: {
      list: ['a', 'b', 'c'],
      instructions: 'score items',
      preMock: () => {
        scaleSpec.mockResolvedValueOnce(mockSpec);
        createBatches
          .mockReturnValueOnce([{ items: ['a', 'b', 'c'], startIndex: 0 }])
          .mockReturnValueOnce([{ items: ['c'], startIndex: 0 }]);
        listBatch.mockResolvedValueOnce([4, 7]).mockResolvedValueOnce([6]);
      },
    },
    check: ({ result }) => {
      expect(listBatch).toHaveBeenCalledTimes(2);
      expect(result).toEqual([4, 7, 6]);
    },
  },
  {
    name: 'contains errors per batch without throwing',
    inputs: {
      list: ['a', 'b', 'c', 'd'],
      instructions: 'score items',
      preMock: () => {
        scaleSpec.mockResolvedValueOnce(mockSpec);
        createBatches.mockReturnValueOnce([
          { items: ['a', 'b'], startIndex: 0 },
          { items: ['c', 'd'], startIndex: 2 },
        ]);
        listBatch.mockResolvedValueOnce([3, 9]).mockRejectedValueOnce(new Error('500'));
        createBatches
          .mockReturnValueOnce([{ items: ['c', 'd'], startIndex: 0 }])
          .mockReturnValueOnce([{ items: ['c', 'd'], startIndex: 0 }]);
        listBatch.mockRejectedValueOnce(new Error('500')).mockRejectedValueOnce(new Error('500'));
      },
    },
    check: ({ result }) => {
      expect(result[0]).toBe(3);
      expect(result[1]).toBe(9);
      expect(result[2]).toBeUndefined();
      expect(result[3]).toBeUndefined();
    },
  },
  {
    name: 'processes oversized items in isolated single-item batches',
    inputs: {
      list: ['normal', 'oversized-item'],
      instructions: 'score items',
      preMock: () => {
        scaleSpec.mockResolvedValueOnce(mockSpec);
        createBatches.mockReturnValueOnce([
          { items: ['normal'], startIndex: 0 },
          { items: ['oversized-item'], startIndex: 1 },
        ]);
        listBatch.mockResolvedValueOnce([7]).mockResolvedValueOnce([3]);
        createBatches.mockReturnValueOnce([]).mockReturnValueOnce([]);
      },
    },
    check: ({ result }) => {
      expect(listBatch).toHaveBeenCalledTimes(2);
      expect(result).toEqual([7, 3]);
    },
  },
];

runTable({
  describe: 'score chain',
  examples: scoreExamples,
  process: async ({ list, instructions, preMock }) => {
    if (preMock) preMock();
    return score(list, instructions);
  },
});

// ─── scoreSpec / scoreItem ───────────────────────────────────────────────

runTable({
  describe: 'scoreSpec',
  examples: [
    {
      name: 'is an alias for scaleSpec',
      inputs: {},
      check: () => expect(scoreSpec).toBe(scaleSpec),
    },
  ],
  process: () => undefined,
});

runTable({
  describe: 'scoreItem',
  examples: [
    {
      name: 'scores a single item',
      inputs: {
        item: 'test item',
        instructions: 'score by length',
        preMock: () => {
          scaleSpec.mockResolvedValueOnce(mockSpec);
          llm.mockResolvedValueOnce(7);
        },
      },
      check: ({ result }) => {
        expect(scaleSpec).toHaveBeenCalledWith('score by length', {});
        expect(llm).toHaveBeenCalledWith(expect.stringContaining('test item'), expect.any(Object));
        expect(result).toBe(7);
      },
    },
  ],
  process: async ({ item, instructions, preMock }) => {
    if (preMock) preMock();
    return scoreItem(item, instructions);
  },
});

// ─── scoreInstructions ───────────────────────────────────────────────────

runTable({
  describe: 'scoreInstructions',
  examples: [
    {
      name: 'returns instruction bundle with spec',
      inputs: { spec: mockSpec },
      check: ({ result }) => {
        expect(result.text).toContain('score specification');
        expect(result.spec).toBe(mockSpec);
      },
    },
    {
      name: 'allows text override',
      inputs: { spec: mockSpec, text: 'Custom scoring' },
      check: partial({ text: 'Custom scoring', spec: mockSpec }),
    },
    {
      name: 'passes through additional context keys',
      inputs: { spec: mockSpec, domain: 'medical records' },
      check: partial({ spec: mockSpec, domain: 'medical records' }),
    },
    {
      name: 'includes anchors when provided',
      inputs: { spec: mockSpec, anchors: 'anchor data' },
      check: partial({ anchors: 'anchor data' }),
    },
  ],
  process: (params) => scoreInstructions(params),
});

// ─── integration with collection chains ─────────────────────────────────

runTable({
  describe: 'score — integration with collection chains',
  examples: [
    {
      name: 'scoreInstructions bundle works with filter chain',
      inputs: {},
      check: async () => {
        filter.mockResolvedValueOnce(['item1', 'item3']);
        const bundle = scoreInstructions({ spec: mockSpec });
        const items = ['item1', 'item2', 'item3'];
        const filtered = await filter(items, bundle);
        expect(filter).toHaveBeenCalledWith(items, expect.objectContaining({ spec: mockSpec }));
        expect(filtered).toEqual(['item1', 'item3']);
      },
    },
  ],
  process: () => undefined,
});

// ─── anchoring option ───────────────────────────────────────────────────

runTable({
  describe: 'score — anchoring option',
  examples: [
    {
      name: 'anchoring=low omits anchors in second batch',
      inputs: {
        items: ['a', 'b', 'c', 'd'],
        batches: [
          { items: ['a', 'b'], startIndex: 0 },
          { items: ['c', 'd'], startIndex: 2 },
        ],
        scores: [
          [2, 8],
          [5, 3],
        ],
        anchoring: 'low',
        expectAnchors: false,
      },
      check: () => {
        const secondPrompt = listBatch.mock.calls[1][1];
        expect(secondPrompt).not.toContain('scoring-anchors');
      },
    },
    {
      name: 'anchoring=high includes anchors in second batch',
      inputs: {
        items: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
        batches: [
          { items: ['a', 'b', 'c', 'd', 'e', 'f'], startIndex: 0 },
          { items: ['g', 'h'], startIndex: 6 },
        ],
        scores: [
          [1, 3, 5, 7, 8, 10],
          [4, 6],
        ],
        anchoring: 'high',
        expectAnchors: true,
      },
      check: () => {
        const secondPrompt = listBatch.mock.calls[1][1];
        expect(secondPrompt).toContain('scoring-anchors');
      },
    },
  ],
  process: async ({ items, batches, scores, anchoring }) => {
    scaleSpec.mockResolvedValueOnce(mockSpec);
    createBatches.mockReturnValueOnce(batches);
    for (const s of scores) listBatch.mockResolvedValueOnce(s);
    return score(items, 'score items', { anchoring });
  },
});

// ─── scoreItemWithUncertainty ───────────────────────────────────────────

runTable({
  describe: 'scoreItemWithUncertainty',
  examples: [
    {
      name: 'returns score with uncertainty metadata',
      inputs: {
        item: 'test item',
        instructions: 'score by quality',
        preMock: () => {
          scaleSpec.mockResolvedValueOnce(mockSpec);
          llm.mockResolvedValueOnce({
            value: 7,
            confidence: 0.9,
            unknowns: ['subjective criteria'],
          });
        },
      },
      check: ({ result }) => {
        expect(scaleSpec).toHaveBeenCalledWith('score by quality', {});
        expect(llm).toHaveBeenCalledWith(
          expect.stringContaining('test item'),
          expect.objectContaining({
            responseFormat: expect.objectContaining({
              type: 'json_schema',
              json_schema: expect.objectContaining({ name: 'score_with_uncertainty' }),
            }),
          })
        );
        expect(result.score).toBe(7);
        expect(result.uncertainty).toMatchObject({
          confidence: 0.9,
          unknowns: ['subjective criteria'],
        });
      },
    },
    {
      name: 'returns empty unknowns when LLM reports no uncertainty',
      inputs: {
        item: 'obvious item',
        instructions: 'score by length',
        preMock: () => {
          scaleSpec.mockResolvedValueOnce(mockSpec);
          llm.mockResolvedValueOnce({ value: 10, confidence: 1.0, unknowns: [] });
        },
      },
      check: ({ result }) => {
        expect(result.score).toBe(10);
        expect(result.uncertainty).toMatchObject({ confidence: 1.0, unknowns: [] });
      },
    },
    {
      name: 'skips scoreSpec when spec is provided via instruction object',
      inputs: {
        item: 'item',
        instructions: { text: 'instructions', spec: mockSpec },
        preMock: () =>
          llm.mockResolvedValueOnce({
            value: 5,
            confidence: 0.7,
            unknowns: ['ambiguous context'],
          }),
      },
      check: ({ result }) => {
        expect(scaleSpec).not.toHaveBeenCalled();
        expect(result.score).toBe(5);
        expect(result.uncertainty.unknowns).toEqual(['ambiguous context']);
      },
    },
    {
      name: 'emits uncertainty progress events',
      inputs: {
        item: 'item',
        instructions: 'instructions',
        withEvents: true,
        preMock: () => {
          scaleSpec.mockResolvedValueOnce(mockSpec);
          llm.mockResolvedValueOnce({ value: 6, confidence: 0.8, unknowns: ['edge case'] });
        },
      },
      check: ({ result }) => {
        const ev = result.events.find((e) => e.event === 'uncertainty');
        expect(ev).toMatchObject({ confidence: 0.8, unknowns: ['edge case'] });
      },
    },
    {
      name: 'emits chain lifecycle events',
      inputs: {
        item: 'item',
        instructions: 'instructions',
        withEvents: true,
        preMock: () => {
          scaleSpec.mockResolvedValueOnce(mockSpec);
          llm.mockResolvedValueOnce({ value: 4, confidence: 0.6, unknowns: [] });
        },
      },
      check: ({ result }) => {
        expect(result.events.find((e) => e.event === 'chain:start')).toBeDefined();
        expect(result.events.find((e) => e.event === 'chain:complete')).toBeDefined();
      },
    },
  ],
  process: async ({ item, instructions, preMock, withEvents }) => {
    if (preMock) preMock();
    if (withEvents) {
      const events = [];
      const value = await scoreItemWithUncertainty(item, instructions, {
        onProgress: (e) => events.push(e),
      });
      return { ...value, events };
    }
    return scoreItemWithUncertainty(item, instructions);
  },
});

// ─── iterativeScoreLoop ──────────────────────────────────────────────────

runTable({
  describe: 'iterativeScoreLoop',
  examples: [
    {
      name: 'performs a single iteration when maxIterations is 1',
      inputs: {
        list: ['a', 'b'],
        instructions: 'score quality',
        options: { maxIterations: 1 },
        makeRefine: () => vi.fn(),
        preMock: () => {
          scaleSpec.mockResolvedValueOnce(mockSpec);
          createBatches.mockReturnValueOnce([{ items: ['a', 'b'], startIndex: 0 }]);
          listBatch.mockResolvedValueOnce([3, 7]);
        },
      },
      check: ({ result }) => {
        expect(result.value).toMatchObject({
          items: ['a', 'b'],
          scores: [3, 7],
          iterations: 1,
        });
        expect(result.refine).not.toHaveBeenCalled();
        expect(scaleSpec).toHaveBeenCalledOnce();
      },
    },
    {
      name: 'performs multiple iterations calling refine between scoring passes',
      inputs: {
        list: ['a', 'b'],
        instructions: 'score quality',
        options: { maxIterations: 2 },
        makeRefine: () => vi.fn().mockResolvedValueOnce(['a-v2', 'b-v2']),
        preMock: () => {
          scaleSpec.mockResolvedValueOnce(mockSpec);
          createBatches.mockReturnValueOnce([{ items: ['a', 'b'], startIndex: 0 }]);
          listBatch.mockResolvedValueOnce([3, 4]);
          createBatches.mockReturnValueOnce([{ items: ['a-v2', 'b-v2'], startIndex: 0 }]);
          listBatch.mockResolvedValueOnce([7, 8]);
        },
      },
      check: ({ result }) => {
        expect(result.refine).toHaveBeenCalledOnce();
        expect(result.refine).toHaveBeenCalledWith(
          ['a', 'b'],
          [3, 4],
          expect.objectContaining({ iteration: 1, averageScore: 3.5 })
        );
        expect(result.value).toMatchObject({
          items: ['a-v2', 'b-v2'],
          scores: [7, 8],
          iterations: 2,
        });
      },
    },
    {
      name: 'terminates early when scores converge below threshold',
      inputs: {
        list: ['a', 'b'],
        instructions: 'score quality',
        options: { maxIterations: 5, convergenceThreshold: 0.01 },
        makeRefine: () => vi.fn().mockResolvedValueOnce(['a-v2', 'b-v2']),
        preMock: () => {
          scaleSpec.mockResolvedValueOnce(mockSpec);
          createBatches.mockReturnValueOnce([{ items: ['a', 'b'], startIndex: 0 }]);
          listBatch.mockResolvedValueOnce([5, 5]);
          createBatches.mockReturnValueOnce([{ items: ['a-v2', 'b-v2'], startIndex: 0 }]);
          listBatch.mockResolvedValueOnce([5.004, 5.004]);
        },
      },
      check: ({ result }) => {
        expect(result.value.iterations).toBe(2);
        expect(result.refine).toHaveBeenCalledOnce();
        expect(listBatch).toHaveBeenCalledTimes(2);
      },
    },
    {
      name: 'throws when refine function is missing from config',
      inputs: { list: ['a'], instructions: 'score quality', noRefine: true },
      check: throws(/iterativeScoreLoop requires a refine function/),
    },
    {
      name: 'propagates errors thrown by the refine function',
      inputs: {
        list: ['a'],
        instructions: 'score quality',
        options: { maxIterations: 2 },
        makeRefine: () => vi.fn().mockRejectedValueOnce(new Error('refinement failed')),
        preMock: () => {
          scaleSpec.mockResolvedValueOnce(mockSpec);
          createBatches.mockReturnValueOnce([{ items: ['a'], startIndex: 0 }]);
          listBatch.mockResolvedValueOnce([3]);
        },
      },
      check: throws(/refinement failed/),
    },
    {
      name: 'emits progress events for each iteration phase',
      inputs: {
        list: ['a'],
        instructions: 'score quality',
        options: { maxIterations: 2 },
        makeRefine: () => vi.fn().mockResolvedValueOnce(['a-v2']),
        withEvents: true,
        preMock: () => {
          scaleSpec.mockResolvedValueOnce(mockSpec);
          createBatches.mockReturnValueOnce([{ items: ['a'], startIndex: 0 }]);
          listBatch.mockResolvedValueOnce([5]);
          createBatches.mockReturnValueOnce([{ items: ['a-v2'], startIndex: 0 }]);
          listBatch.mockResolvedValueOnce([8]);
        },
      },
      check: ({ result }) => {
        const loopEvents = result.events.filter((e) => e.step === 'score:refine-loop');
        expect(loopEvents.find((e) => e.event === 'chain:start')).toBeDefined();
        expect(
          loopEvents.find((e) => e.event === 'phase' && e.phase === 'generating-specification')
        ).toBeDefined();
        const scoringTicks = loopEvents.filter(
          (e) => e.event === 'chain:tick' && e.phase === 'scoring'
        );
        expect(scoringTicks).toHaveLength(2);
        expect(scoringTicks[0].iteration).toBe(0);
        expect(scoringTicks[1].iteration).toBe(1);
        const scoredTicks = loopEvents.filter(
          (e) => e.event === 'chain:tick' && e.phase === 'scored'
        );
        expect(scoredTicks).toHaveLength(2);
        expect(scoredTicks[0].averageScore).toBe(5);
        expect(scoredTicks[1].averageScore).toBe(8);
        expect(
          loopEvents.find((e) => e.event === 'chain:tick' && e.phase === 'refining')
        ).toBeDefined();
        const complete = loopEvents.find((e) => e.event === 'chain:complete');
        expect(complete.totalIterations).toBe(2);
      },
    },
    {
      name: 'emits converged phase event when terminating early',
      inputs: {
        list: ['a'],
        instructions: 'score quality',
        options: { maxIterations: 5, convergenceThreshold: 0.01 },
        makeRefine: () => vi.fn().mockResolvedValueOnce(['a-v2']),
        withEvents: true,
        preMock: () => {
          scaleSpec.mockResolvedValueOnce(mockSpec);
          createBatches
            .mockReturnValueOnce([{ items: ['a'], startIndex: 0 }])
            .mockReturnValueOnce([{ items: ['a-v2'], startIndex: 0 }]);
          listBatch.mockResolvedValueOnce([5]).mockResolvedValueOnce([5.001]);
        },
      },
      check: ({ result }) => {
        const ev = result.events.find(
          (e) => e.step === 'score:refine-loop' && e.event === 'phase' && e.phase === 'converged'
        );
        expect(ev).toMatchObject({ iteration: 2 });
      },
    },
    {
      name: 'generates spec once and reuses it across iterations',
      inputs: {
        list: ['a'],
        instructions: 'score quality',
        options: { maxIterations: 2 },
        makeRefine: () => vi.fn().mockResolvedValueOnce(['a-v2']),
        preMock: () => {
          scaleSpec.mockResolvedValueOnce(mockSpec);
          createBatches
            .mockReturnValueOnce([{ items: ['a'], startIndex: 0 }])
            .mockReturnValueOnce([{ items: ['a-v2'], startIndex: 0 }]);
          listBatch.mockResolvedValueOnce([3]).mockResolvedValueOnce([7]);
        },
      },
      check: () => expect(scaleSpec).toHaveBeenCalledOnce(),
    },
    {
      name: 'skips spec generation when spec is provided via instruction bundle',
      inputs: {
        list: ['a'],
        instructions: { text: 'score quality', spec: mockSpec },
        options: { maxIterations: 1 },
        makeRefine: () => vi.fn(),
        preMock: () => {
          createBatches.mockReturnValueOnce([{ items: ['a'], startIndex: 0 }]);
          listBatch.mockResolvedValueOnce([5]);
        },
      },
      check: () => expect(scaleSpec).not.toHaveBeenCalled(),
    },
  ],
  process: async ({ list, instructions, options, makeRefine, noRefine, preMock, withEvents }) => {
    if (preMock) preMock();
    const refine = noRefine ? undefined : makeRefine?.();
    const cfg = noRefine ? undefined : { ...options, refine };
    if (withEvents) {
      const events = [];
      const value = await iterativeScoreLoop(list, instructions, {
        ...cfg,
        onProgress: (e) => events.push(e),
      });
      return { value, refine, events };
    }
    const value = await iterativeScoreLoop(list, instructions, cfg);
    return { value, refine };
  },
});

// ─── progress emission ───────────────────────────────────────────────────

runTable({
  describe: 'score — progress emission',
  examples: [
    {
      name: 'mapScore emits full lifecycle: start, input, phases, batch progress, complete',
      inputs: {
        list: ['a', 'b', 'c'],
        instructions: 'score by length',
        preMock: () => {
          scaleSpec.mockResolvedValueOnce(mockSpec);
          createBatches.mockReturnValueOnce([{ items: ['a', 'b', 'c'], startIndex: 0 }]);
          listBatch.mockResolvedValueOnce([1, 2, 3]);
        },
      },
      check: ({ result }) => {
        const start = result.events.find((e) => e.step === 'score' && e.event === ChainEvent.start);
        expect(start).toMatchObject({ kind: 'telemetry' });

        const input = result.events.find(
          (e) => e.step === 'score' && e.event === DomainEvent.input
        );
        expect(input).toMatchObject({ kind: 'event', value: ['a', 'b', 'c'] });

        expect(
          result.events.find(
            (e) => e.event === DomainEvent.phase && e.phase === 'generating-specification'
          )
        ).toBeDefined();

        const scoring = result.events.find(
          (e) => e.event === DomainEvent.phase && e.phase === 'scoring-items'
        );
        expect(scoring.specification).toBeDefined();

        const opStart = result.events.find(
          (e) => e.step === 'score' && e.event === OpEvent.start && e.kind === 'operation'
        );
        expect(opStart).toMatchObject({ totalItems: 3, totalBatches: 1 });

        const batchComplete = result.events.find(
          (e) => e.step === 'score' && e.event === OpEvent.batchComplete
        );
        expect(batchComplete).toMatchObject({
          kind: 'operation',
          totalItems: 3,
          processedItems: 3,
        });

        expect(
          result.events.find(
            (e) => e.step === 'score' && e.event === OpEvent.complete && e.kind === 'operation'
          )
        ).toBeDefined();

        const complete = result.events.find(
          (e) => e.step === 'score' && e.event === ChainEvent.complete
        );
        expect(complete).toMatchObject({
          kind: 'telemetry',
          totalItems: 3,
          successCount: 3,
          failedItems: 0,
          outcome: 'success',
        });
      },
    },
    {
      name: 'mapScore reports partial outcome when items remain unscored',
      inputs: {
        list: ['a', 'b'],
        instructions: 'score items',
        preMock: () => {
          scaleSpec.mockResolvedValueOnce(mockSpec);
          createBatches
            .mockReturnValueOnce([{ items: ['a', 'b'], startIndex: 0 }])
            .mockReturnValueOnce([{ items: ['b'], startIndex: 0 }])
            .mockReturnValueOnce([{ items: ['b'], startIndex: 0 }]);
          listBatch.mockResolvedValueOnce([5]).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
        },
      },
      check: ({ result }) => {
        const complete = result.events.find(
          (e) => e.step === 'score' && e.event === ChainEvent.complete
        );
        expect(complete).toMatchObject({
          outcome: 'partial',
          failedItems: 1,
          successCount: 1,
        });
      },
    },
    {
      name: 'mapScore emits anchors-established phase when multi-batch',
      inputs: {
        list: ['a', 'b', 'c', 'd'],
        instructions: 'score items',
        preMock: () => {
          scaleSpec.mockResolvedValueOnce(mockSpec);
          createBatches.mockReturnValueOnce([
            { items: ['a', 'b'], startIndex: 0 },
            { items: ['c', 'd'], startIndex: 2 },
          ]);
          listBatch.mockResolvedValueOnce([2, 8]).mockResolvedValueOnce([5, 3]);
        },
      },
      check: ({ result }) => {
        const ev = result.events.find(
          (e) => e.event === DomainEvent.phase && e.phase === 'anchors-established'
        );
        expect(ev).toBeDefined();
        expect(ev.anchors).toBeDefined();
      },
    },
    {
      name: 'events carry trace context when config provides traceId',
      inputs: {
        list: ['a'],
        instructions: 'score items',
        preMock: () => {
          scaleSpec.mockResolvedValueOnce(mockSpec);
          createBatches.mockReturnValueOnce([{ items: ['a'], startIndex: 0 }]);
          listBatch.mockResolvedValueOnce([7]);
        },
      },
      check: ({ result }) => {
        const start = result.events.find((e) => e.step === 'score' && e.event === ChainEvent.start);
        expect(start.operation).toBeDefined();
        expect(start.timestamp).toBeDefined();
      },
    },
  ],
  process: async ({ list, instructions, preMock }) => {
    if (preMock) preMock();
    const events = [];
    await score(list, instructions, { onProgress: (e) => events.push(e) });
    return { events };
  },
});
