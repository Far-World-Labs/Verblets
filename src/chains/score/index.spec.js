import { beforeEach, describe, expect, it, vi } from 'vitest';
import score, {
  scoreItem,
  scoreSpec,
  applyScore,
  mapInstructions,
  filterInstructions,
  reduceInstructions,
  findInstructions,
  groupInstructions,
} from './index.js';
import llm from '../../lib/llm/index.js';
import { scaleSpec } from '../scale/index.js';
import listBatch from '../../verblets/list-batch/index.js';
import createBatches from '../../lib/text-batch/index.js';
import filter from '../filter/index.js';

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(),
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
        expect.objectContaining({
          responseFormat: expect.objectContaining({
            type: 'json_schema',
          }),
        })
      );
      expect(result).toEqual([1, 2, 3]);
    });

    it('skips scoreSpec when config.spec is provided', async () => {
      createBatches.mockReturnValueOnce([{ items: ['x', 'y'], startIndex: 0 }]);
      listBatch.mockResolvedValueOnce([5, 8]);

      const result = await score(['x', 'y'], 'ignored instructions', { spec: mockSpec });

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

    it('skips batches marked as skip', async () => {
      scaleSpec.mockResolvedValueOnce(mockSpec);
      // Initial pass: one real batch, one skip
      createBatches.mockReturnValueOnce([
        { items: ['a'], startIndex: 0 },
        { items: [], startIndex: 1, skip: true },
      ]);
      listBatch.mockResolvedValueOnce([7]);

      // Retry passes: skipped item is rebatched but still skipped
      createBatches
        .mockReturnValueOnce([{ items: [], startIndex: 0, skip: true }])
        .mockReturnValueOnce([{ items: [], startIndex: 0, skip: true }]);

      const result = await score(['a', ''], 'score items');

      expect(listBatch).toHaveBeenCalledTimes(1);
      expect(result[0]).toBe(7);
      expect(result[1]).toBeUndefined();
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

      expect(scaleSpec).toHaveBeenCalledWith('score by length', { now: expect.any(Date) });
      expect(llm).toHaveBeenCalledWith(expect.stringContaining('test item'), expect.any(Object));
      expect(result).toBe(7);
    });
  });

  describe('applyScore', () => {
    it('applies a score specification to a single item', async () => {
      llm.mockResolvedValueOnce(7); // llm auto-unwraps single value property

      const result = await applyScore('test item', mockSpec);

      expect(llm).toHaveBeenCalledWith(
        expect.stringContaining('<score-specification>'),
        expect.any(Object)
      );
      expect(result).toBe(7);
    });
  });

  describe('score.for', () => {
    it('is async and returns a function', async () => {
      scaleSpec.mockResolvedValueOnce(mockSpec);
      const scorer = await score.for('technical depth');
      expect(typeof scorer).toBe('function');
      expect(scaleSpec).toHaveBeenCalledWith(
        'technical depth',
        expect.objectContaining({ now: expect.any(Date) })
      );
    });

    it('calls scoreSpec once during factory creation', async () => {
      scaleSpec.mockResolvedValueOnce(mockSpec);
      llm.mockResolvedValue(7);

      const scorer = await score.for('quality');
      expect(scaleSpec).toHaveBeenCalledTimes(1);

      await scorer('item1');
      await scorer('item2');
      // scoreSpec was only called once, not per-item
      expect(scaleSpec).toHaveBeenCalledTimes(1);
      // llm (applyScore) was called per-item
      expect(llm).toHaveBeenCalledTimes(2);
    });

    it('returned function scores a single item via applyScore', async () => {
      scaleSpec.mockResolvedValueOnce(mockSpec);
      llm.mockResolvedValueOnce(9);

      const scorer = await score.for('depth');
      const result = await scorer('deep article');

      expect(result).toBe(9);
      expect(llm).toHaveBeenCalledWith(expect.stringContaining('deep article'), expect.any(Object));
    });
  });

  describe('instruction builders', () => {
    describe('mapInstructions', () => {
      it('creates map instructions from specification', () => {
        const instructions = mapInstructions({ specification: mockSpec });

        expect(instructions).toContain('score-specification');
        expect(instructions).toContain('Return ONLY the score value');
      });
    });

    describe('filterInstructions', () => {
      it('creates filter instructions from specification', () => {
        const instructions = filterInstructions({
          specification: mockSpec,
          processing: 'keep scores above 7',
        });

        expect(instructions).toContain('score-specification');
        expect(instructions).toContain('filter-condition');
        expect(instructions).toContain('keep scores above 7');
      });
    });

    describe('reduceInstructions', () => {
      it('creates reduce instructions from specification', () => {
        const instructions = reduceInstructions({
          specification: mockSpec,
          processing: 'sum all scores',
        });

        expect(instructions).toContain('score-specification');
        expect(instructions).toContain('reduce-operation');
        expect(instructions).toContain('sum all scores');
      });
    });

    describe('findInstructions', () => {
      it('creates find instructions from specification', () => {
        const instructions = findInstructions({
          specification: mockSpec,
          processing: 'highest scoring item',
        });

        expect(instructions).toContain('score-specification');
        expect(instructions).toContain('selection-criteria');
        expect(instructions).toContain('highest scoring item');
      });
    });

    describe('groupInstructions', () => {
      it('creates group instructions from specification', () => {
        const instructions = groupInstructions({
          specification: mockSpec,
          processing: 'group into low, medium, high',
        });

        expect(instructions).toContain('score-specification');
        expect(instructions).toContain('grouping-strategy');
        expect(instructions).toContain('group into low, medium, high');
      });
    });
  });

  describe('integration with collection chains', () => {
    it('can use filterInstructions with filter chain', async () => {
      filter.mockResolvedValueOnce(['item1', 'item3']);

      const instructions = filterInstructions({
        specification: mockSpec,
        processing: 'keep scores above 5',
      });
      const items = ['item1', 'item2', 'item3'];

      const filtered = await filter(items, instructions);

      expect(filter).toHaveBeenCalledWith(items, expect.stringContaining('score-specification'));
      expect(filtered).toEqual(['item1', 'item3']);
    });
  });
});
