import { beforeEach, describe, expect, it, vi } from 'vitest';
import score, { scoreItem, scoreSpec, scoreInstructions } from './index.js';
import llm from '../../lib/llm/index.js';
import { scaleSpec } from '../scale/index.js';
import listBatch from '../../verblets/list-batch/index.js';
import createBatches from '../../lib/text-batch/index.js';
import filter from '../filter/index.js';

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
});
