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
import { runTable } from '../../lib/examples-runner/index.js';

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

runTable({
  describe: 'score chain',
  examples: [
    {
      name: 'scores a list of items via listBatch',
      inputs: {
        list: ['a', 'bb', 'ccc'],
        instructions: 'score by length',
        setupMock: () => {
          scaleSpec.mockResolvedValueOnce(mockSpec);
          createBatches.mockReturnValueOnce([{ items: ['a', 'bb', 'ccc'], startIndex: 0 }]);
          listBatch.mockResolvedValueOnce([1, 2, 3]);
        },
      },
      want: { value: [1, 2, 3], scaleSpecCalled: true, listBatchScoreSpec: true },
    },
    {
      name: 'skips scoreSpec when spec is provided via instruction object',
      inputs: {
        list: ['x', 'y'],
        instructions: { text: 'ignored instructions', spec: mockSpec },
        setupMock: () => {
          createBatches.mockReturnValueOnce([{ items: ['x', 'y'], startIndex: 0 }]);
          listBatch.mockResolvedValueOnce([5, 8]);
        },
      },
      want: { value: [5, 8], scaleSpecNotCalled: true, listBatchScoreSpec: true },
    },
    {
      name: 'handles multiple batches with anchoring',
      inputs: {
        list: ['a', 'b', 'c', 'd'],
        instructions: 'score items',
        setupMock: () => {
          scaleSpec.mockResolvedValueOnce(mockSpec);
          createBatches.mockReturnValueOnce([
            { items: ['a', 'b'], startIndex: 0 },
            { items: ['c', 'd'], startIndex: 2 },
          ]);
          listBatch.mockResolvedValueOnce([2, 8]).mockResolvedValueOnce([5, 3]);
        },
      },
      want: { value: [2, 8, 5, 3], listBatchCalls: 2, secondPromptContains: 'scoring-anchors' },
    },
    {
      name: 'retries items when LLM returns fewer scores than items',
      inputs: {
        list: ['a', 'b', 'c'],
        instructions: 'score items',
        setupMock: () => {
          scaleSpec.mockResolvedValueOnce(mockSpec);
          createBatches
            .mockReturnValueOnce([{ items: ['a', 'b', 'c'], startIndex: 0 }])
            .mockReturnValueOnce([{ items: ['c'], startIndex: 0 }]);
          listBatch.mockResolvedValueOnce([4, 7]).mockResolvedValueOnce([6]);
        },
      },
      want: { value: [4, 7, 6], listBatchCalls: 2 },
    },
    {
      name: 'contains errors per batch without throwing',
      inputs: {
        list: ['a', 'b', 'c', 'd'],
        instructions: 'score items',
        setupMock: () => {
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
      want: { partialContents: { 0: 3, 1: 9, 2: undefined, 3: undefined } },
    },
    {
      name: 'processes oversized items in isolated single-item batches',
      inputs: {
        list: ['normal', 'oversized-item'],
        instructions: 'score items',
        setupMock: () => {
          scaleSpec.mockResolvedValueOnce(mockSpec);
          createBatches.mockReturnValueOnce([
            { items: ['normal'], startIndex: 0 },
            { items: ['oversized-item'], startIndex: 1 },
          ]);
          listBatch.mockResolvedValueOnce([7]).mockResolvedValueOnce([3]);
          createBatches.mockReturnValueOnce([]).mockReturnValueOnce([]);
        },
      },
      want: { value: [7, 3], listBatchCalls: 2 },
    },
  ],
  process: async ({ inputs }) => {
    inputs.setupMock?.();
    return score(inputs.list, inputs.instructions);
  },
  expects: ({ result, want }) => {
    if ('value' in want) expect(result).toEqual(want.value);
    if ('listBatchCalls' in want) expect(listBatch).toHaveBeenCalledTimes(want.listBatchCalls);
    if (want.scaleSpecCalled) {
      expect(scaleSpec).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ now: expect.any(Date) })
      );
    }
    if (want.scaleSpecNotCalled) expect(scaleSpec).not.toHaveBeenCalled();
    if (want.listBatchScoreSpec) {
      expect(listBatch).toHaveBeenCalledWith(
        expect.any(Array),
        expect.stringContaining('score-specification'),
        expect.any(Object)
      );
    }
    if (want.secondPromptContains) {
      expect(listBatch.mock.calls[1][1]).toContain(want.secondPromptContains);
    }
    if (want.partialContents) {
      for (const [idx, value] of Object.entries(want.partialContents)) {
        if (value === undefined) {
          expect(result[Number(idx)]).toBeUndefined();
        } else {
          expect(result[Number(idx)]).toBe(value);
        }
      }
    }
  },
});

runTable({
  describe: 'scoreSpec',
  examples: [{ name: 'is an alias for scaleSpec', inputs: {}, want: { aliasOf: scaleSpec } }],
  process: () => undefined,
  expects: ({ want }) => {
    if (want.aliasOf) expect(scoreSpec).toBe(want.aliasOf);
  },
});

runTable({
  describe: 'scoreItem',
  examples: [
    {
      name: 'scores a single item',
      inputs: {
        item: 'test item',
        instructions: 'score by length',
        setupMock: () => {
          scaleSpec.mockResolvedValueOnce(mockSpec);
          llm.mockResolvedValueOnce(7);
        },
      },
      want: { value: 7, llmContains: 'test item' },
    },
  ],
  process: async ({ inputs }) => {
    inputs.setupMock?.();
    return scoreItem(inputs.item, inputs.instructions);
  },
  expects: ({ result, inputs, want }) => {
    expect(scaleSpec).toHaveBeenCalledWith(inputs.instructions, {});
    if (want.llmContains) {
      expect(llm).toHaveBeenCalledWith(
        expect.stringContaining(want.llmContains),
        expect.any(Object)
      );
    }
    expect(result).toBe(want.value);
  },
});

runTable({
  describe: 'scoreInstructions',
  examples: [
    {
      name: 'returns instruction bundle with spec',
      inputs: { spec: mockSpec },
      want: { textContains: 'score specification' },
    },
    {
      name: 'allows text override',
      inputs: { spec: mockSpec, text: 'Custom scoring' },
      want: { matches: { text: 'Custom scoring', spec: mockSpec } },
    },
    {
      name: 'passes through additional context keys',
      inputs: { spec: mockSpec, domain: 'medical records' },
      want: { matches: { spec: mockSpec, domain: 'medical records' } },
    },
    {
      name: 'includes anchors when provided',
      inputs: { spec: mockSpec, anchors: 'anchor data' },
      want: { matches: { anchors: 'anchor data' } },
    },
  ],
  process: ({ inputs }) => scoreInstructions(inputs),
  expects: ({ result, inputs, want }) => {
    if (want.textContains) {
      expect(result.text).toContain(want.textContains);
      expect(result.spec).toBe(inputs.spec);
    }
    if (want.matches) expect(result).toMatchObject(want.matches);
  },
});

runTable({
  describe: 'score — integration with collection chains',
  examples: [
    {
      name: 'scoreInstructions bundle works with filter chain',
      inputs: {},
      want: { filterIntegration: true },
    },
  ],
  process: () => undefined,
  expects: async ({ want }) => {
    if (want.filterIntegration) {
      filter.mockResolvedValueOnce(['item1', 'item3']);
      const bundle = scoreInstructions({ spec: mockSpec });
      const items = ['item1', 'item2', 'item3'];
      const filtered = await filter(items, bundle);
      expect(filter).toHaveBeenCalledWith(items, expect.objectContaining({ spec: mockSpec }));
      expect(filtered).toEqual(['item1', 'item3']);
    }
  },
});

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
      },
      want: { secondPromptNotContains: 'scoring-anchors' },
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
      },
      want: { secondPromptContains: 'scoring-anchors' },
    },
  ],
  process: async ({ inputs }) => {
    scaleSpec.mockResolvedValueOnce(mockSpec);
    createBatches.mockReturnValueOnce(inputs.batches);
    for (const s of inputs.scores) listBatch.mockResolvedValueOnce(s);
    return score(inputs.items, 'score items', { anchoring: inputs.anchoring });
  },
  expects: ({ want }) => {
    const secondPrompt = listBatch.mock.calls[1][1];
    if (want.secondPromptContains) expect(secondPrompt).toContain(want.secondPromptContains);
    if (want.secondPromptNotContains) {
      expect(secondPrompt).not.toContain(want.secondPromptNotContains);
    }
  },
});

runTable({
  describe: 'scoreItemWithUncertainty',
  examples: [
    {
      name: 'returns score with uncertainty metadata',
      inputs: {
        item: 'test item',
        instructions: 'score by quality',
        setupMock: () => {
          scaleSpec.mockResolvedValueOnce(mockSpec);
          llm.mockResolvedValueOnce({
            value: 7,
            confidence: 0.9,
            unknowns: ['subjective criteria'],
          });
        },
      },
      want: {
        score: 7,
        uncertainty: { confidence: 0.9, unknowns: ['subjective criteria'] },
        llmCalledWithUncertainty: true,
      },
    },
    {
      name: 'returns empty unknowns when LLM reports no uncertainty',
      inputs: {
        item: 'obvious item',
        instructions: 'score by length',
        setupMock: () => {
          scaleSpec.mockResolvedValueOnce(mockSpec);
          llm.mockResolvedValueOnce({ value: 10, confidence: 1.0, unknowns: [] });
        },
      },
      want: { score: 10, uncertainty: { confidence: 1.0, unknowns: [] } },
    },
    {
      name: 'skips scoreSpec when spec is provided via instruction object',
      inputs: {
        item: 'item',
        instructions: { text: 'instructions', spec: mockSpec },
        setupMock: () =>
          llm.mockResolvedValueOnce({
            value: 5,
            confidence: 0.7,
            unknowns: ['ambiguous context'],
          }),
      },
      want: { score: 5, uncertaintyUnknowns: ['ambiguous context'], scaleSpecNotCalled: true },
    },
    {
      name: 'emits uncertainty progress events',
      inputs: {
        item: 'item',
        instructions: 'instructions',
        withEvents: true,
        setupMock: () => {
          scaleSpec.mockResolvedValueOnce(mockSpec);
          llm.mockResolvedValueOnce({ value: 6, confidence: 0.8, unknowns: ['edge case'] });
        },
      },
      want: { uncertaintyEvent: { confidence: 0.8, unknowns: ['edge case'] } },
    },
    {
      name: 'emits chain lifecycle events',
      inputs: {
        item: 'item',
        instructions: 'instructions',
        withEvents: true,
        setupMock: () => {
          scaleSpec.mockResolvedValueOnce(mockSpec);
          llm.mockResolvedValueOnce({ value: 4, confidence: 0.6, unknowns: [] });
        },
      },
      want: { lifecycleEvents: true },
    },
  ],
  process: async ({ inputs }) => {
    inputs.setupMock?.();
    if (inputs.withEvents) {
      const events = [];
      const value = await scoreItemWithUncertainty(inputs.item, inputs.instructions, {
        onProgress: (e) => events.push(e),
      });
      return { ...value, events };
    }
    return scoreItemWithUncertainty(inputs.item, inputs.instructions);
  },
  expects: ({ result, want }) => {
    if (want.score !== undefined) expect(result.score).toBe(want.score);
    if (want.uncertainty) expect(result.uncertainty).toMatchObject(want.uncertainty);
    if (want.uncertaintyUnknowns) {
      expect(result.uncertainty.unknowns).toEqual(want.uncertaintyUnknowns);
    }
    if (want.scaleSpecNotCalled) expect(scaleSpec).not.toHaveBeenCalled();
    if (want.llmCalledWithUncertainty) {
      expect(llm).toHaveBeenCalledWith(
        expect.stringContaining('test item'),
        expect.objectContaining({
          responseFormat: expect.objectContaining({
            type: 'json_schema',
            json_schema: expect.objectContaining({ name: 'score_with_uncertainty' }),
          }),
        })
      );
    }
    if (want.uncertaintyEvent) {
      const ev = result.events.find((e) => e.event === 'uncertainty');
      expect(ev).toMatchObject(want.uncertaintyEvent);
    }
    if (want.lifecycleEvents) {
      expect(result.events.find((e) => e.event === 'chain:start')).toBeDefined();
      expect(result.events.find((e) => e.event === 'chain:complete')).toBeDefined();
    }
  },
});

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
        setupMock: () => {
          scaleSpec.mockResolvedValueOnce(mockSpec);
          createBatches.mockReturnValueOnce([{ items: ['a', 'b'], startIndex: 0 }]);
          listBatch.mockResolvedValueOnce([3, 7]);
        },
      },
      want: {
        value: { items: ['a', 'b'], scores: [3, 7], iterations: 1 },
        refineNotCalled: true,
        scaleSpecOnce: true,
      },
    },
    {
      name: 'performs multiple iterations calling refine between scoring passes',
      inputs: {
        list: ['a', 'b'],
        instructions: 'score quality',
        options: { maxIterations: 2 },
        makeRefine: () => vi.fn().mockResolvedValueOnce(['a-v2', 'b-v2']),
        setupMock: () => {
          scaleSpec.mockResolvedValueOnce(mockSpec);
          createBatches.mockReturnValueOnce([{ items: ['a', 'b'], startIndex: 0 }]);
          listBatch.mockResolvedValueOnce([3, 4]);
          createBatches.mockReturnValueOnce([{ items: ['a-v2', 'b-v2'], startIndex: 0 }]);
          listBatch.mockResolvedValueOnce([7, 8]);
        },
      },
      want: {
        refineCalledWith: [['a', 'b'], [3, 4], { iteration: 1, averageScore: 3.5 }],
        value: { items: ['a-v2', 'b-v2'], scores: [7, 8], iterations: 2 },
      },
    },
    {
      name: 'terminates early when scores converge below threshold',
      inputs: {
        list: ['a', 'b'],
        instructions: 'score quality',
        options: { maxIterations: 5, convergenceThreshold: 0.01 },
        makeRefine: () => vi.fn().mockResolvedValueOnce(['a-v2', 'b-v2']),
        setupMock: () => {
          scaleSpec.mockResolvedValueOnce(mockSpec);
          createBatches.mockReturnValueOnce([{ items: ['a', 'b'], startIndex: 0 }]);
          listBatch.mockResolvedValueOnce([5, 5]);
          createBatches.mockReturnValueOnce([{ items: ['a-v2', 'b-v2'], startIndex: 0 }]);
          listBatch.mockResolvedValueOnce([5.004, 5.004]);
        },
      },
      want: { iterations: 2, refineOnce: true, listBatchCalls: 2 },
    },
    {
      name: 'throws when refine function is missing from config',
      inputs: { list: ['a'], instructions: 'score quality', noRefine: true },
      want: { throws: /iterativeScoreLoop requires a refine function/ },
    },
    {
      name: 'propagates errors thrown by the refine function',
      inputs: {
        list: ['a'],
        instructions: 'score quality',
        options: { maxIterations: 2 },
        makeRefine: () => vi.fn().mockRejectedValueOnce(new Error('refinement failed')),
        setupMock: () => {
          scaleSpec.mockResolvedValueOnce(mockSpec);
          createBatches.mockReturnValueOnce([{ items: ['a'], startIndex: 0 }]);
          listBatch.mockResolvedValueOnce([3]);
        },
      },
      want: { throws: /refinement failed/ },
    },
    {
      name: 'emits progress events for each iteration phase',
      inputs: {
        list: ['a'],
        instructions: 'score quality',
        options: { maxIterations: 2 },
        makeRefine: () => vi.fn().mockResolvedValueOnce(['a-v2']),
        withEvents: true,
        setupMock: () => {
          scaleSpec.mockResolvedValueOnce(mockSpec);
          createBatches.mockReturnValueOnce([{ items: ['a'], startIndex: 0 }]);
          listBatch.mockResolvedValueOnce([5]);
          createBatches.mockReturnValueOnce([{ items: ['a-v2'], startIndex: 0 }]);
          listBatch.mockResolvedValueOnce([8]);
        },
      },
      want: { progressEvents: true },
    },
    {
      name: 'emits converged phase event when terminating early',
      inputs: {
        list: ['a'],
        instructions: 'score quality',
        options: { maxIterations: 5, convergenceThreshold: 0.01 },
        makeRefine: () => vi.fn().mockResolvedValueOnce(['a-v2']),
        withEvents: true,
        setupMock: () => {
          scaleSpec.mockResolvedValueOnce(mockSpec);
          createBatches
            .mockReturnValueOnce([{ items: ['a'], startIndex: 0 }])
            .mockReturnValueOnce([{ items: ['a-v2'], startIndex: 0 }]);
          listBatch.mockResolvedValueOnce([5]).mockResolvedValueOnce([5.001]);
        },
      },
      want: { convergedAt: 2 },
    },
    {
      name: 'generates spec once and reuses it across iterations',
      inputs: {
        list: ['a'],
        instructions: 'score quality',
        options: { maxIterations: 2 },
        makeRefine: () => vi.fn().mockResolvedValueOnce(['a-v2']),
        setupMock: () => {
          scaleSpec.mockResolvedValueOnce(mockSpec);
          createBatches
            .mockReturnValueOnce([{ items: ['a'], startIndex: 0 }])
            .mockReturnValueOnce([{ items: ['a-v2'], startIndex: 0 }]);
          listBatch.mockResolvedValueOnce([3]).mockResolvedValueOnce([7]);
        },
      },
      want: { scaleSpecOnce: true },
    },
    {
      name: 'skips spec generation when spec is provided via instruction bundle',
      inputs: {
        list: ['a'],
        instructions: { text: 'score quality', spec: mockSpec },
        options: { maxIterations: 1 },
        makeRefine: () => vi.fn(),
        setupMock: () => {
          createBatches.mockReturnValueOnce([{ items: ['a'], startIndex: 0 }]);
          listBatch.mockResolvedValueOnce([5]);
        },
      },
      want: { scaleSpecNotCalled: true },
    },
  ],
  process: async ({ inputs }) => {
    inputs.setupMock?.();
    const refine = inputs.noRefine ? undefined : inputs.makeRefine?.();
    const cfg = inputs.noRefine ? undefined : { ...inputs.options, refine };
    if (inputs.withEvents) {
      const events = [];
      const value = await iterativeScoreLoop(inputs.list, inputs.instructions, {
        ...cfg,
        onProgress: (e) => events.push(e),
      });
      return { value, refine, events };
    }
    const value = await iterativeScoreLoop(inputs.list, inputs.instructions, cfg);
    return { value, refine };
  },
  expects: ({ result, error, want }) => {
    if (want.throws) {
      expect(error?.message).toMatch(want.throws);
      return;
    }
    if (error) throw error;
    if (want.value) expect(result.value).toMatchObject(want.value);
    if (want.refineNotCalled) expect(result.refine).not.toHaveBeenCalled();
    if (want.scaleSpecOnce) expect(scaleSpec).toHaveBeenCalledOnce();
    if (want.scaleSpecNotCalled) expect(scaleSpec).not.toHaveBeenCalled();
    if (want.refineCalledWith) {
      const [arg0, arg1, arg2] = want.refineCalledWith;
      expect(result.refine).toHaveBeenCalledOnce();
      expect(result.refine).toHaveBeenCalledWith(arg0, arg1, expect.objectContaining(arg2));
    }
    if (want.iterations !== undefined) expect(result.value.iterations).toBe(want.iterations);
    if (want.refineOnce) expect(result.refine).toHaveBeenCalledOnce();
    if (want.listBatchCalls) expect(listBatch).toHaveBeenCalledTimes(want.listBatchCalls);
    if (want.progressEvents) {
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
    }
    if (want.convergedAt !== undefined) {
      const ev = result.events.find(
        (e) => e.step === 'score:refine-loop' && e.event === 'phase' && e.phase === 'converged'
      );
      expect(ev).toMatchObject({ iteration: want.convergedAt });
    }
  },
});

runTable({
  describe: 'score — progress emission',
  examples: [
    {
      name: 'mapScore emits full lifecycle: start, input, phases, batch progress, complete',
      inputs: {
        list: ['a', 'b', 'c'],
        instructions: 'score by length',
        setupMock: () => {
          scaleSpec.mockResolvedValueOnce(mockSpec);
          createBatches.mockReturnValueOnce([{ items: ['a', 'b', 'c'], startIndex: 0 }]);
          listBatch.mockResolvedValueOnce([1, 2, 3]);
        },
      },
      want: { fullLifecycle: { items: ['a', 'b', 'c'], total: 3 } },
    },
    {
      name: 'mapScore reports partial outcome when items remain unscored',
      inputs: {
        list: ['a', 'b'],
        instructions: 'score items',
        setupMock: () => {
          scaleSpec.mockResolvedValueOnce(mockSpec);
          createBatches
            .mockReturnValueOnce([{ items: ['a', 'b'], startIndex: 0 }])
            .mockReturnValueOnce([{ items: ['b'], startIndex: 0 }])
            .mockReturnValueOnce([{ items: ['b'], startIndex: 0 }]);
          listBatch.mockResolvedValueOnce([5]).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
        },
      },
      want: { complete: { outcome: 'partial', failedItems: 1, successCount: 1 } },
    },
    {
      name: 'mapScore emits anchors-established phase when multi-batch',
      inputs: {
        list: ['a', 'b', 'c', 'd'],
        instructions: 'score items',
        setupMock: () => {
          scaleSpec.mockResolvedValueOnce(mockSpec);
          createBatches.mockReturnValueOnce([
            { items: ['a', 'b'], startIndex: 0 },
            { items: ['c', 'd'], startIndex: 2 },
          ]);
          listBatch.mockResolvedValueOnce([2, 8]).mockResolvedValueOnce([5, 3]);
        },
      },
      want: { anchorsEstablished: true },
    },
    {
      name: 'events carry trace context when config provides traceId',
      inputs: {
        list: ['a'],
        instructions: 'score items',
        setupMock: () => {
          scaleSpec.mockResolvedValueOnce(mockSpec);
          createBatches.mockReturnValueOnce([{ items: ['a'], startIndex: 0 }]);
          listBatch.mockResolvedValueOnce([7]);
        },
      },
      want: { traceContext: true },
    },
  ],
  process: async ({ inputs }) => {
    inputs.setupMock?.();
    const events = [];
    await score(inputs.list, inputs.instructions, { onProgress: (e) => events.push(e) });
    return { events };
  },
  expects: ({ result, want }) => {
    if (want.fullLifecycle) {
      const start = result.events.find((e) => e.step === 'score' && e.event === ChainEvent.start);
      expect(start).toMatchObject({ kind: 'telemetry' });
      const input = result.events.find((e) => e.step === 'score' && e.event === DomainEvent.input);
      expect(input).toMatchObject({ kind: 'event', value: want.fullLifecycle.items });
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
      expect(opStart).toMatchObject({ totalItems: want.fullLifecycle.total, totalBatches: 1 });
      const batchComplete = result.events.find(
        (e) => e.step === 'score' && e.event === OpEvent.batchComplete
      );
      expect(batchComplete).toMatchObject({
        kind: 'operation',
        totalItems: want.fullLifecycle.total,
        processedItems: want.fullLifecycle.total,
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
        totalItems: want.fullLifecycle.total,
        successCount: want.fullLifecycle.total,
        failedItems: 0,
        outcome: 'success',
      });
    }
    if (want.complete) {
      const complete = result.events.find(
        (e) => e.step === 'score' && e.event === ChainEvent.complete
      );
      expect(complete).toMatchObject(want.complete);
    }
    if (want.anchorsEstablished) {
      const ev = result.events.find(
        (e) => e.event === DomainEvent.phase && e.phase === 'anchors-established'
      );
      expect(ev).toBeDefined();
      expect(ev.anchors).toBeDefined();
    }
    if (want.traceContext) {
      const start = result.events.find((e) => e.step === 'score' && e.event === ChainEvent.start);
      expect(start.operation).toBeDefined();
      expect(start.timestamp).toBeDefined();
    }
  },
});
