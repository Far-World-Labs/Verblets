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
  buildCalibrationReference,
  formatCalibrationBlock,
} from './index.js';
import chatGPT from '../../lib/chatgpt/index.js';
import { scaleSpec } from '../../verblets/scale/index.js';
import map from '../map/index.js';
import filter from '../filter/index.js';

vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn(),
}));

vi.mock('../../verblets/scale/index.js', () => ({
  scaleSpec: vi.fn(),
}));

vi.mock('../map/index.js', () => ({
  default: vi.fn(),
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
});

describe('score chain', () => {
  const mockSpec = {
    domain: 'text items',
    range: '0-10 numeric score',
    mapping: 'length-based scoring',
  };

  describe('default export', () => {
    it('scores a list of items', async () => {
      scaleSpec.mockResolvedValueOnce(mockSpec);
      map.mockResolvedValueOnce(['1', '2', '3']);

      const result = await score(['a', 'bb', 'ccc'], 'score by length');

      expect(scaleSpec).toHaveBeenCalledWith('score by length', {});
      expect(map).toHaveBeenCalled();
      expect(result).toEqual([1, 2, 3]);
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
      chatGPT.mockResolvedValueOnce({ score: 7 });

      const result = await scoreItem('test item', 'score by length');

      expect(scaleSpec).toHaveBeenCalledWith('score by length', {});
      expect(chatGPT).toHaveBeenCalledWith(
        expect.stringContaining('test item'),
        expect.any(Object)
      );
      expect(result).toBe(7);
    });
  });

  describe('applyScore', () => {
    it('applies a score specification to a single item', async () => {
      chatGPT.mockResolvedValueOnce({ score: 7 });

      const result = await applyScore('test item', mockSpec);

      expect(chatGPT).toHaveBeenCalledWith(
        expect.stringContaining('<score-specification>'),
        expect.any(Object)
      );
      expect(result).toBe(7);
    });
  });

  describe('instruction builders', () => {
    describe('mapInstructions', () => {
      it('creates map instructions with specification attached', async () => {
        scaleSpec.mockResolvedValueOnce(mockSpec);

        const instructions = await mapInstructions('score by length');

        expect(instructions.specification).toEqual(mockSpec);
        expect(String(instructions)).toContain('score-specification');
        expect(String(instructions)).toContain('Return ONLY the score value');
      });

      it('returns tuple when configured', async () => {
        scaleSpec.mockResolvedValueOnce(mockSpec);

        const result = await mapInstructions('score by length', { returnTuple: true });

        expect(result.value).toContain('score-specification');
        expect(result.specification).toEqual(mockSpec);
      });

      it('accepts custom spec generator', async () => {
        const customSpec = vi.fn().mockResolvedValueOnce(mockSpec);

        await mapInstructions('score by length', {}, customSpec);

        expect(customSpec).toHaveBeenCalledWith('score by length', {});
        expect(scaleSpec).not.toHaveBeenCalled();
      });
    });

    describe('filterInstructions', () => {
      it('creates filter instructions with specification attached', async () => {
        scaleSpec.mockResolvedValueOnce(mockSpec);

        const instructions = await filterInstructions({
          scoring: 'score by quality',
          processing: 'keep scores above 7',
        });

        expect(instructions.specification).toEqual(mockSpec);
        expect(String(instructions)).toContain('score-specification');
        expect(String(instructions)).toContain('filter-condition');
        expect(String(instructions)).toContain('keep scores above 7');
      });
    });

    describe('reduceInstructions', () => {
      it('creates reduce instructions with specification attached', async () => {
        scaleSpec.mockResolvedValueOnce(mockSpec);

        const instructions = await reduceInstructions({
          scoring: 'score by relevance',
          processing: 'sum all scores',
        });

        expect(instructions.specification).toEqual(mockSpec);
        expect(String(instructions)).toContain('score-specification');
        expect(String(instructions)).toContain('reduce-operation');
        expect(String(instructions)).toContain('sum all scores');
      });
    });

    describe('findInstructions', () => {
      it('creates find instructions with specification attached', async () => {
        scaleSpec.mockResolvedValueOnce(mockSpec);

        const instructions = await findInstructions({
          scoring: 'score by match',
          processing: 'highest scoring item',
        });

        expect(instructions.specification).toEqual(mockSpec);
        expect(String(instructions)).toContain('score-specification');
        expect(String(instructions)).toContain('selection-criteria');
        expect(String(instructions)).toContain('highest scoring item');
      });
    });

    describe('groupInstructions', () => {
      it('creates group instructions with specification attached', async () => {
        scaleSpec.mockResolvedValueOnce(mockSpec);

        const instructions = await groupInstructions({
          scoring: 'score by category',
          processing: 'group into low, medium, high',
        });

        expect(instructions.specification).toEqual(mockSpec);
        expect(String(instructions)).toContain('score-specification');
        expect(String(instructions)).toContain('grouping-strategy');
        expect(String(instructions)).toContain('group into low, medium, high');
      });
    });
  });

  describe('calibration utilities', () => {
    describe('buildCalibrationReference', () => {
      it('selects items from low, middle, and high ranges', () => {
        const scored = [
          { item: 'a', score: 1 },
          { item: 'b', score: 2 },
          { item: 'c', score: 3 },
          { item: 'd', score: 4 },
          { item: 'e', score: 5 },
          { item: 'f', score: 6 },
          { item: 'g', score: 7 },
          { item: 'h', score: 8 },
          { item: 'i', score: 9 },
        ];

        const reference = buildCalibrationReference(scored, 2);

        expect(reference).toHaveLength(6);
        const scores = reference.map((r) => r.score);
        expect(scores).toHaveLength(6);
        // Check that we have items from low, mid, and high ranges
        expect(scores.slice(0, 2)).toEqual([1, 2]); // lows
        expect(scores.slice(-2)).toEqual([8, 9]); // highs
        // Middle items should be in the middle range
        const mids = scores.slice(2, 4);
        expect(mids.every((s) => s >= 3 && s <= 7)).toBe(true);
      });

      it('handles empty input', () => {
        expect(buildCalibrationReference([])).toEqual([]);
      });

      it('filters out non-finite scores', () => {
        const scored = [
          { item: 'a', score: 1 },
          { item: 'b', score: NaN },
          { item: 'c', score: Infinity },
          { item: 'd', score: 5 },
        ];

        const reference = buildCalibrationReference(scored, 1);

        expect(reference).toHaveLength(3);
        const scores = reference.map((r) => r.score);
        expect(scores).toHaveLength(3);
        // With only 2 valid items (1 and 5), buildCalibrationReference will select:
        // low: 1, high: 5, and middle will be from what's available
        expect(scores).toContain(1);
        expect(scores).toContain(5);
      });
    });

    describe('formatCalibrationBlock', () => {
      it('formats calibration examples as XML', () => {
        const calibration = [
          { item: 'low example', score: 2 },
          { item: 'high example', score: 8 },
        ];

        const block = formatCalibrationBlock(calibration);

        expect(block).toContain('Calibration examples:');
        expect(block).toContain('<calibration>');
        expect(block).toContain('2 - low example');
        expect(block).toContain('8 - high example');
      });

      it('returns empty string for empty calibration', () => {
        expect(formatCalibrationBlock([])).toBe('');
        expect(formatCalibrationBlock(null)).toBe('');
      });
    });
  });

  describe('integration with collection chains', () => {
    it('can use mapInstructions with map chain', async () => {
      scaleSpec.mockResolvedValueOnce(mockSpec);
      map.mockResolvedValueOnce(['5', '7', '3']);

      const instructions = await mapInstructions('score by quality');
      const items = ['item1', 'item2', 'item3'];

      const scores = await map(items, instructions);

      expect(map).toHaveBeenCalledWith(items, expect.stringContaining('score-specification'));
      expect(scores).toEqual(['5', '7', '3']);
    });

    it('can use filterInstructions with filter chain', async () => {
      scaleSpec.mockResolvedValueOnce(mockSpec);
      filter.mockResolvedValueOnce(['item1', 'item3']);

      const instructions = await filterInstructions({
        scoring: 'score by relevance',
        processing: 'keep scores above 5',
      });
      const items = ['item1', 'item2', 'item3'];

      const filtered = await filter(items, instructions);

      expect(filter).toHaveBeenCalledWith(items, expect.stringContaining('score-specification'));
      expect(filtered).toEqual(['item1', 'item3']);
    });
  });
});
