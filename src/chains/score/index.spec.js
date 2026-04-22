import { beforeEach, describe, expect, it, vi } from 'vitest';
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

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(),
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
}));

vi.mock('../scale/index.js', () => ({
  scaleSpec: vi.fn(),
}));

vi.mock('../../verblets/list-batch/index.js', () => ({
  default: vi.fn(),
}));

vi.mock('../../lib/text-batch/index.js', () => ({
  default: vi.fn(),
}));

vi.mock('../../lib/parallel-batch/index.js', () => ({
  default: vi.fn(async (items, processor) => {
    for (let i = 0; i < items.length; i++) {
      await processor(items[i], i);
    }
  }),
  parallelBatch: vi.fn(),
}));

vi.mock('../filter/index.js', () => ({
  default: vi.fn(),
}));

vi.mock('../reduce/index.js', () => ({
  default: vi.fn(),
}));

vi.mock('../find/index.js', () => ({
  default: vi.fn(),
}));

vi.mock('../group/index.js', () => ({
  default: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  // Reset persistent mockReturnValue from previous tests
  createBatches.mockReset();
  listBatch.mockReset();
});

describe('score chain', () => {
  const mockSpec = {
    domain: 'text items',
    range: '0-10 numeric score',
    mapping: 'length-based scoring',
  };

  describe('default export', () => {
    it('scores a list of items via listBatch', async () => {
      scaleSpec.mockResolvedValueOnce(mockSpec);
      createBatches.mockReturnValueOnce([{ items: ['a', 'bb', 'ccc'], startIndex: 0 }]);
      listBatch.mockResolvedValueOnce([1, 2, 3]);

      const result = await score(['a', 'bb', 'ccc'], 'score by length');

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
    });

    it('skips scoreSpec when spec is provided via instruction object', async () => {
      createBatches.mockReturnValueOnce([{ items: ['x', 'y'], startIndex: 0 }]);
      listBatch.mockResolvedValueOnce([5, 8]);

      const result = await score(['x', 'y'], { text: 'ignored instructions', spec: mockSpec });

      expect(scaleSpec).not.toHaveBeenCalled();
      expect(listBatch).toHaveBeenCalledWith(
        ['x', 'y'],
        expect.stringContaining('score-specification'),
        expect.any(Object)
      );
      expect(result).toEqual([5, 8]);
    });

    it('handles multiple batches with anchoring', async () => {
      scaleSpec.mockResolvedValueOnce(mockSpec);
      createBatches.mockReturnValueOnce([
        { items: ['a', 'b'], startIndex: 0 },
        { items: ['c', 'd'], startIndex: 2 },
      ]);
      listBatch
        .mockResolvedValueOnce([2, 8]) // first batch
        .mockResolvedValueOnce([5, 3]); // second batch

      const result = await score(['a', 'b', 'c', 'd'], 'score items');

      expect(listBatch).toHaveBeenCalledTimes(2);
      // Second batch prompt should contain scoring anchors from first batch
      const secondCallPrompt = listBatch.mock.calls[1][1];
      expect(secondCallPrompt).toContain('scoring-anchors');
      expect(result).toEqual([2, 8, 5, 3]);
    });

    it('retries items when LLM returns fewer scores than items', async () => {
      scaleSpec.mockResolvedValueOnce(mockSpec);
      createBatches
        .mockReturnValueOnce([{ items: ['a', 'b', 'c'], startIndex: 0 }]) // initial pass
        .mockReturnValueOnce([{ items: ['c'], startIndex: 0 }]); // retry pass
      listBatch
        .mockResolvedValueOnce([4, 7]) // initial: only 2 of 3 scores
        .mockResolvedValueOnce([6]); // retry: fills in missing

      const result = await score(['a', 'b', 'c'], 'score items');

      expect(listBatch).toHaveBeenCalledTimes(2);
      expect(result).toEqual([4, 7, 6]);
    });

    it('contains errors per batch without throwing', async () => {
      scaleSpec.mockResolvedValueOnce(mockSpec);
      // Initial pass: 2 batches, second fails
      createBatches.mockReturnValueOnce([
        { items: ['a', 'b'], startIndex: 0 },
        { items: ['c', 'd'], startIndex: 2 },
      ]);
      listBatch
        .mockResolvedValueOnce([3, 9]) // first batch succeeds
        .mockRejectedValueOnce(new Error('500')); // second batch fails (retry exhausted)

      // Retry passes: failed items rebatched, still fail
      createBatches
        .mockReturnValueOnce([{ items: ['c', 'd'], startIndex: 0 }])
        .mockReturnValueOnce([{ items: ['c', 'd'], startIndex: 0 }]);
      listBatch.mockRejectedValueOnce(new Error('500')).mockRejectedValueOnce(new Error('500'));

      const result = await score(['a', 'b', 'c', 'd'], 'score items');

      // First batch succeeded, second batch items remain undefined after retries
      expect(result[0]).toBe(3);
      expect(result[1]).toBe(9);
      expect(result[2]).toBeUndefined();
      expect(result[3]).toBeUndefined();
    });

    it('processes oversized items in isolated single-item batches', async () => {
      scaleSpec.mockResolvedValueOnce(mockSpec);
      // Oversized item gets its own batch — no skip, just isolated
      createBatches.mockReturnValueOnce([
        { items: ['normal'], startIndex: 0 },
        { items: ['oversized-item'], startIndex: 1 },
      ]);
      listBatch.mockResolvedValueOnce([7]).mockResolvedValueOnce([3]);

      // Retry passes: both items already scored
      createBatches.mockReturnValueOnce([]).mockReturnValueOnce([]);

      const result = await score(['normal', 'oversized-item'], 'score items');

      expect(listBatch).toHaveBeenCalledTimes(2);
      expect(result[0]).toBe(7);
      expect(result[1]).toBe(3);
    });
  });

  describe('scoreSpec', () => {
    it('is an alias for scaleSpec', () => {
      expect(scoreSpec).toBe(scaleSpec);
    });
  });

  describe('scoreItem', () => {
    it('scores a single item', async () => {
      scaleSpec.mockResolvedValueOnce(mockSpec);
      llm.mockResolvedValueOnce(7); // llm auto-unwraps single value property

      const result = await scoreItem('test item', 'score by length');

      expect(scaleSpec).toHaveBeenCalledWith('score by length', {});
      expect(llm).toHaveBeenCalledWith(expect.stringContaining('test item'), expect.any(Object));
      expect(result).toBe(7);
    });
  });

  describe('scoreInstructions', () => {
    it('returns instruction bundle with spec', () => {
      const bundle = scoreInstructions({ spec: mockSpec });

      expect(bundle.text).toContain('score specification');
      expect(bundle.spec).toBe(mockSpec);
    });

    it('allows text override', () => {
      const bundle = scoreInstructions({ spec: mockSpec, text: 'Custom scoring' });

      expect(bundle.text).toBe('Custom scoring');
      expect(bundle.spec).toBe(mockSpec);
    });

    it('passes through additional context keys', () => {
      const bundle = scoreInstructions({ spec: mockSpec, domain: 'medical records' });

      expect(bundle.spec).toBe(mockSpec);
      expect(bundle.domain).toBe('medical records');
    });

    it('includes anchors when provided', () => {
      const bundle = scoreInstructions({ spec: mockSpec, anchors: 'anchor data' });

      expect(bundle.anchors).toBe('anchor data');
    });
  });

  describe('integration with collection chains', () => {
    it('scoreInstructions bundle works with filter chain', async () => {
      filter.mockResolvedValueOnce(['item1', 'item3']);

      const bundle = scoreInstructions({ spec: mockSpec });
      const items = ['item1', 'item2', 'item3'];

      const filtered = await filter(items, bundle);

      expect(filter).toHaveBeenCalledWith(items, expect.objectContaining({ spec: mockSpec }));
      expect(filtered).toEqual(['item1', 'item3']);
    });
  });

  describe('anchoring option', () => {
    it.each([
      {
        level: 'low',
        items: ['a', 'b', 'c', 'd'],
        batches: [
          { items: ['a', 'b'], startIndex: 0 },
          { items: ['c', 'd'], startIndex: 2 },
        ],
        scores: [
          [2, 8],
          [5, 3],
        ],
        expectAnchors: false,
      },
      {
        level: 'high',
        items: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
        batches: [
          { items: ['a', 'b', 'c', 'd', 'e', 'f'], startIndex: 0 },
          { items: ['g', 'h'], startIndex: 6 },
        ],
        scores: [
          [1, 3, 5, 7, 8, 10],
          [4, 6],
        ],
        expectAnchors: true,
      },
    ])(
      'anchoring $level $expectAnchors anchors in second batch',
      async ({ level, items, batches, scores, expectAnchors }) => {
        scaleSpec.mockResolvedValueOnce(mockSpec);
        createBatches.mockReturnValueOnce(batches);
        scores.forEach((s) => listBatch.mockResolvedValueOnce(s));

        await score(items, 'score items', { anchoring: level });

        const secondCallPrompt = listBatch.mock.calls[1][1];
        if (expectAnchors) {
          expect(secondCallPrompt).toContain('scoring-anchors');
        } else {
          expect(secondCallPrompt).not.toContain('scoring-anchors');
        }
      }
    );
  });

  describe('scoreItemWithUncertainty', () => {
    it('returns score with uncertainty metadata', async () => {
      scaleSpec.mockResolvedValueOnce(mockSpec);
      llm.mockResolvedValueOnce({ value: 7, confidence: 0.9, unknowns: ['subjective criteria'] });

      const result = await scoreItemWithUncertainty('test item', 'score by quality');

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
      expect(result.uncertainty).toBeDefined();
      expect(result.uncertainty.confidence).toBe(0.9);
      expect(result.uncertainty.unknowns).toEqual(['subjective criteria']);
    });

    it('returns empty unknowns when LLM reports no uncertainty', async () => {
      scaleSpec.mockResolvedValueOnce(mockSpec);
      llm.mockResolvedValueOnce({ value: 10, confidence: 1.0, unknowns: [] });

      const result = await scoreItemWithUncertainty('obvious item', 'score by length');

      expect(result.score).toBe(10);
      expect(result.uncertainty.confidence).toBe(1.0);
      expect(result.uncertainty.unknowns).toEqual([]);
    });

    it('skips scoreSpec when spec is provided via instruction object', async () => {
      llm.mockResolvedValueOnce({ value: 5, confidence: 0.7, unknowns: ['ambiguous context'] });

      const result = await scoreItemWithUncertainty('item', {
        text: 'instructions',
        spec: mockSpec,
      });

      expect(scaleSpec).not.toHaveBeenCalled();
      expect(result.score).toBe(5);
      expect(result.uncertainty.unknowns).toEqual(['ambiguous context']);
    });

    it('emits uncertainty progress events', async () => {
      scaleSpec.mockResolvedValueOnce(mockSpec);
      llm.mockResolvedValueOnce({ value: 6, confidence: 0.8, unknowns: ['edge case'] });

      const events = [];
      await scoreItemWithUncertainty('item', 'instructions', {
        onProgress: (e) => events.push(e),
      });

      const uncertaintyEvent = events.find((e) => e.event === 'uncertainty');
      expect(uncertaintyEvent).toBeDefined();
      expect(uncertaintyEvent.confidence).toBe(0.8);
      expect(uncertaintyEvent.unknowns).toEqual(['edge case']);
    });

    it('emits chain lifecycle events', async () => {
      scaleSpec.mockResolvedValueOnce(mockSpec);
      llm.mockResolvedValueOnce({ value: 4, confidence: 0.6, unknowns: [] });

      const events = [];
      await scoreItemWithUncertainty('item', 'instructions', {
        onProgress: (e) => events.push(e),
      });

      const startEvent = events.find((e) => e.event === 'chain:start');
      const completeEvent = events.find((e) => e.event === 'chain:complete');
      expect(startEvent).toBeDefined();
      expect(completeEvent).toBeDefined();
    });
  });

  describe('iterativeScoreLoop', () => {
    it('performs a single iteration when maxIterations is 1', async () => {
      scaleSpec.mockResolvedValueOnce(mockSpec);
      createBatches.mockReturnValueOnce([{ items: ['a', 'b'], startIndex: 0 }]);
      listBatch.mockResolvedValueOnce([3, 7]);

      const refine = vi.fn();
      const result = await iterativeScoreLoop(['a', 'b'], 'score quality', {
        refine,
        maxIterations: 1,
      });

      expect(result.items).toEqual(['a', 'b']);
      expect(result.scores).toEqual([3, 7]);
      expect(result.iterations).toBe(1);
      expect(refine).not.toHaveBeenCalled();
      expect(scaleSpec).toHaveBeenCalledOnce();
    });

    it('performs multiple iterations calling refine between scoring passes', async () => {
      scaleSpec.mockResolvedValueOnce(mockSpec);
      // Iteration 0: score original items
      createBatches.mockReturnValueOnce([{ items: ['a', 'b'], startIndex: 0 }]);
      listBatch.mockResolvedValueOnce([3, 4]);
      // Iteration 1: score refined items
      createBatches.mockReturnValueOnce([{ items: ['a-v2', 'b-v2'], startIndex: 0 }]);
      listBatch.mockResolvedValueOnce([7, 8]);

      const refine = vi.fn().mockResolvedValueOnce(['a-v2', 'b-v2']);
      const result = await iterativeScoreLoop(['a', 'b'], 'score quality', {
        refine,
        maxIterations: 2,
      });

      expect(refine).toHaveBeenCalledOnce();
      expect(refine).toHaveBeenCalledWith(
        ['a', 'b'],
        [3, 4],
        expect.objectContaining({ iteration: 1, averageScore: 3.5 })
      );
      expect(result.items).toEqual(['a-v2', 'b-v2']);
      expect(result.scores).toEqual([7, 8]);
      expect(result.iterations).toBe(2);
    });

    it('terminates early when scores converge below threshold', async () => {
      scaleSpec.mockResolvedValueOnce(mockSpec);
      // Iteration 0: avg = 5.0
      createBatches.mockReturnValueOnce([{ items: ['a', 'b'], startIndex: 0 }]);
      listBatch.mockResolvedValueOnce([5, 5]);
      // Iteration 1: avg = 5.004 — delta 0.004 < threshold 0.01
      createBatches.mockReturnValueOnce([{ items: ['a-v2', 'b-v2'], startIndex: 0 }]);
      listBatch.mockResolvedValueOnce([5.004, 5.004]);

      const refine = vi.fn().mockResolvedValueOnce(['a-v2', 'b-v2']);
      const result = await iterativeScoreLoop(['a', 'b'], 'score quality', {
        refine,
        maxIterations: 5,
        convergenceThreshold: 0.01,
      });

      expect(result.iterations).toBe(2);
      expect(refine).toHaveBeenCalledOnce();
      expect(listBatch).toHaveBeenCalledTimes(2);
    });

    it('throws when refine function is missing from config', async () => {
      await expect(iterativeScoreLoop(['a'], 'score quality')).rejects.toThrow(
        'iterativeScoreLoop requires a refine function'
      );
    });

    it('propagates errors thrown by the refine function', async () => {
      scaleSpec.mockResolvedValueOnce(mockSpec);
      createBatches.mockReturnValueOnce([{ items: ['a'], startIndex: 0 }]);
      listBatch.mockResolvedValueOnce([3]);

      const refine = vi.fn().mockRejectedValueOnce(new Error('refinement failed'));

      await expect(
        iterativeScoreLoop(['a'], 'score quality', { refine, maxIterations: 2 })
      ).rejects.toThrow('refinement failed');
    });

    it('emits progress events for each iteration phase', async () => {
      scaleSpec.mockResolvedValueOnce(mockSpec);
      // Iteration 0
      createBatches.mockReturnValueOnce([{ items: ['a'], startIndex: 0 }]);
      listBatch.mockResolvedValueOnce([5]);
      // Iteration 1
      createBatches.mockReturnValueOnce([{ items: ['a-v2'], startIndex: 0 }]);
      listBatch.mockResolvedValueOnce([8]);

      const events = [];
      const refine = vi.fn().mockResolvedValueOnce(['a-v2']);
      await iterativeScoreLoop(['a'], 'score quality', {
        refine,
        maxIterations: 2,
        onProgress: (e) => events.push(e),
      });

      const loopEvents = events.filter((e) => e.step === 'score:refine-loop');

      const chainStart = loopEvents.find((e) => e.event === 'chain:start');
      expect(chainStart).toBeDefined();

      const specPhase = loopEvents.find(
        (e) => e.event === 'phase' && e.phase === 'generating-specification'
      );
      expect(specPhase).toBeDefined();

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

      const refiningTick = loopEvents.find(
        (e) => e.event === 'chain:tick' && e.phase === 'refining'
      );
      expect(refiningTick).toBeDefined();

      const chainComplete = loopEvents.find((e) => e.event === 'chain:complete');
      expect(chainComplete).toBeDefined();
      expect(chainComplete.totalIterations).toBe(2);
    });

    it('emits converged phase event when terminating early', async () => {
      scaleSpec.mockResolvedValueOnce(mockSpec);
      createBatches
        .mockReturnValueOnce([{ items: ['a'], startIndex: 0 }])
        .mockReturnValueOnce([{ items: ['a-v2'], startIndex: 0 }]);
      listBatch.mockResolvedValueOnce([5]).mockResolvedValueOnce([5.001]);

      const events = [];
      const refine = vi.fn().mockResolvedValueOnce(['a-v2']);
      await iterativeScoreLoop(['a'], 'score quality', {
        refine,
        maxIterations: 5,
        convergenceThreshold: 0.01,
        onProgress: (e) => events.push(e),
      });

      const convergedEvent = events.find(
        (e) => e.step === 'score:refine-loop' && e.event === 'phase' && e.phase === 'converged'
      );
      expect(convergedEvent).toBeDefined();
      expect(convergedEvent.iteration).toBe(2);
    });

    it('generates spec once and reuses it across iterations', async () => {
      scaleSpec.mockResolvedValueOnce(mockSpec);
      createBatches
        .mockReturnValueOnce([{ items: ['a'], startIndex: 0 }])
        .mockReturnValueOnce([{ items: ['a-v2'], startIndex: 0 }]);
      listBatch.mockResolvedValueOnce([3]).mockResolvedValueOnce([7]);

      const refine = vi.fn().mockResolvedValueOnce(['a-v2']);
      await iterativeScoreLoop(['a'], 'score quality', { refine, maxIterations: 2 });

      expect(scaleSpec).toHaveBeenCalledOnce();
    });

    it('skips spec generation when spec is provided via instruction bundle', async () => {
      createBatches.mockReturnValueOnce([{ items: ['a'], startIndex: 0 }]);
      listBatch.mockResolvedValueOnce([5]);

      const refine = vi.fn();
      await iterativeScoreLoop(
        ['a'],
        { text: 'score quality', spec: mockSpec },
        {
          refine,
          maxIterations: 1,
        }
      );

      expect(scaleSpec).not.toHaveBeenCalled();
    });
  });

  describe('progress emission', () => {
    it('mapScore emits full lifecycle: start, input, phases, batch progress, complete', async () => {
      scaleSpec.mockResolvedValueOnce(mockSpec);
      createBatches.mockReturnValueOnce([{ items: ['a', 'b', 'c'], startIndex: 0 }]);
      listBatch.mockResolvedValueOnce([1, 2, 3]);

      const events = [];
      await score(['a', 'b', 'c'], 'score by length', {
        onProgress: (e) => events.push(e),
      });

      const chainStart = events.find((e) => e.step === 'score' && e.event === ChainEvent.start);
      expect(chainStart).toBeDefined();
      expect(chainStart.kind).toBe('telemetry');

      const inputEvent = events.find((e) => e.step === 'score' && e.event === DomainEvent.input);
      expect(inputEvent).toBeDefined();
      expect(inputEvent.kind).toBe('event');
      expect(inputEvent.value).toEqual(['a', 'b', 'c']);

      const specPhase = events.find(
        (e) => e.event === DomainEvent.phase && e.phase === 'generating-specification'
      );
      expect(specPhase).toBeDefined();

      const scoringPhase = events.find(
        (e) => e.event === DomainEvent.phase && e.phase === 'scoring-items'
      );
      expect(scoringPhase).toBeDefined();
      expect(scoringPhase.specification).toBeDefined();

      const opStart = events.find(
        (e) => e.step === 'score' && e.event === OpEvent.start && e.kind === 'operation'
      );
      expect(opStart).toBeDefined();
      expect(opStart.totalItems).toBe(3);
      expect(opStart.totalBatches).toBe(1);

      const batchComplete = events.find(
        (e) => e.step === 'score' && e.event === OpEvent.batchComplete
      );
      expect(batchComplete).toBeDefined();
      expect(batchComplete.kind).toBe('operation');
      expect(batchComplete.totalItems).toBe(3);
      expect(batchComplete.processedItems).toBe(3);

      const opComplete = events.find(
        (e) => e.step === 'score' && e.event === OpEvent.complete && e.kind === 'operation'
      );
      expect(opComplete).toBeDefined();

      const chainComplete = events.find(
        (e) => e.step === 'score' && e.event === ChainEvent.complete
      );
      expect(chainComplete).toBeDefined();
      expect(chainComplete.kind).toBe('telemetry');
      expect(chainComplete.totalItems).toBe(3);
      expect(chainComplete.successCount).toBe(3);
      expect(chainComplete.failedItems).toBe(0);
      expect(chainComplete.outcome).toBe('success');
    });

    it('mapScore reports partial outcome when items remain unscored', async () => {
      scaleSpec.mockResolvedValueOnce(mockSpec);
      createBatches
        .mockReturnValueOnce([{ items: ['a', 'b'], startIndex: 0 }])
        .mockReturnValueOnce([{ items: ['b'], startIndex: 0 }])
        .mockReturnValueOnce([{ items: ['b'], startIndex: 0 }]);
      listBatch.mockResolvedValueOnce([5]).mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      const events = [];
      await score(['a', 'b'], 'score items', {
        onProgress: (e) => events.push(e),
      });

      const chainComplete = events.find(
        (e) => e.step === 'score' && e.event === ChainEvent.complete
      );
      expect(chainComplete).toBeDefined();
      expect(chainComplete.outcome).toBe('partial');
      expect(chainComplete.failedItems).toBe(1);
      expect(chainComplete.successCount).toBe(1);
    });

    it('mapScore emits anchors-established phase when multi-batch', async () => {
      scaleSpec.mockResolvedValueOnce(mockSpec);
      createBatches.mockReturnValueOnce([
        { items: ['a', 'b'], startIndex: 0 },
        { items: ['c', 'd'], startIndex: 2 },
      ]);
      listBatch.mockResolvedValueOnce([2, 8]).mockResolvedValueOnce([5, 3]);

      const events = [];
      await score(['a', 'b', 'c', 'd'], 'score items', {
        onProgress: (e) => events.push(e),
      });

      const anchorsPhase = events.find(
        (e) => e.event === DomainEvent.phase && e.phase === 'anchors-established'
      );
      expect(anchorsPhase).toBeDefined();
      expect(anchorsPhase.anchors).toBeDefined();
    });

    it('events carry trace context when config provides traceId', async () => {
      scaleSpec.mockResolvedValueOnce(mockSpec);
      createBatches.mockReturnValueOnce([{ items: ['a'], startIndex: 0 }]);
      listBatch.mockResolvedValueOnce([7]);

      const events = [];
      await score(['a'], 'score items', {
        onProgress: (e) => events.push(e),
      });

      const chainStart = events.find((e) => e.step === 'score' && e.event === ChainEvent.start);
      expect(chainStart.operation).toBeDefined();
      expect(chainStart.timestamp).toBeDefined();
    });
  });
});
