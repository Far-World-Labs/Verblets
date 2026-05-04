import { vi, beforeEach, expect } from 'vitest';
import centralTendency from './index.js';
import map from '../map/index.js';
import { runTable } from '../../lib/examples-runner/index.js';

vi.mock('../map/index.js', () => ({ default: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

const mockResult = (score, reason, confidence) => ({ score, reason, confidence });

runTable({
  describe: 'centralTendency chain',
  examples: [
    {
      name: 'delegates to map with items, instructions, and config',
      inputs: {
        items: ['apple', 'chainsaw'],
        seeds: ['banana', 'orange'],
        mock: () => {
          const results = [mockResult(0.9, 'typical', 0.8), mockResult(0.3, 'atypical', 0.7)];
          map.mockResolvedValueOnce(results);
          return results;
        },
        wantValueEqualsExpected: true,
        wantMapCalls: 1,
        wantMapInstructionsContains: ['banana, orange'],
        wantMapBatchSize: 5,
        wantMapResponseFormat: 'json_schema',
      },
    },
    {
      name: 'includes context in the instructions passed to map',
      inputs: {
        items: ['wolf'],
        seeds: ['dog', 'cat'],
        options: { context: 'Household pets' },
        mock: () => map.mockResolvedValueOnce([mockResult(0.7, 'contextual', 0.8)]),
        wantMapInstructionsContains: ['<context>', 'Household pets'],
      },
    },
    {
      name: 'includes coreFeatures in the instructions passed to map',
      inputs: {
        items: ['wolf'],
        seeds: ['dog', 'cat'],
        options: { coreFeatures: ['warm-blooded', 'domesticated'] },
        mock: () => map.mockResolvedValueOnce([mockResult(0.7, 'featured', 0.8)]),
        wantMapInstructionsContains: ['<core-features>', 'warm-blooded, domesticated'],
      },
    },
    {
      name: 'returns empty array for empty items',
      inputs: { items: [], seeds: ['seed'], wantValue: [], wantNoMap: true },
    },
    {
      name: 'throws for non-array items',
      inputs: { items: 'not-array', seeds: ['seed'], throws: /Items must be an array/ },
    },
    {
      name: 'throws for empty seedItems array',
      inputs: { items: ['item'], seeds: [], throws: /seedItems must be a non-empty array/ },
    },
    {
      name: 'throws for null seedItems',
      inputs: { items: ['item'], seeds: null, throws: /seedItems must be a non-empty array/ },
    },
    {
      name: 'passes through original items from map when transformation fails',
      inputs: {
        items: ['a', 'b', 'c'],
        seeds: ['seed'],
        mock: () => {
          const results = [mockResult(0.9, 'good', 0.8), 'b', mockResult(0.4, 'ok', 0.6)];
          map.mockResolvedValueOnce(results);
          return results;
        },
        wantValueEqualsExpected: true,
        wantValueIndex1: 'b',
      },
    },
    {
      name: 'reports correct success/failure counts when map returns originals',
      inputs: {
        items: ['a', 'b', 'c'],
        seeds: ['seed'],
        withEvents: true,
        mock: () =>
          map.mockResolvedValueOnce([
            mockResult(0.9, 'good', 0.8),
            'b',
            mockResult(0.4, 'ok', 0.6),
          ]),
        wantComplete: { successCount: 2, failureCount: 1 },
      },
    },
  ],
  process: async ({ items, seeds, options, mock, withEvents }) => {
    const expected = mock?.();
    if (withEvents) {
      const events = [];
      await centralTendency(items, seeds, {
        ...options,
        onProgress: (e) => events.push(e),
      });
      return { events };
    }
    const value = await centralTendency(items, seeds, options);
    return { value, expected };
  },
  expects: ({ result, error, inputs }) => {
    if ('throws' in inputs) {
      expect(error?.message).toMatch(inputs.throws);
      return;
    }
    if (error) throw error;
    if (inputs.wantValueEqualsExpected) expect(result.value).toEqual(result.expected);
    if (inputs.wantValueIndex1 !== undefined) {
      expect(result.value[1]).toBe(inputs.wantValueIndex1);
    }
    if ('wantValue' in inputs) expect(result.value).toEqual(inputs.wantValue);
    if (inputs.wantNoMap) expect(map).not.toHaveBeenCalled();
    if ('wantMapCalls' in inputs) expect(map).toHaveBeenCalledTimes(inputs.wantMapCalls);
    if (inputs.wantMapInstructionsContains) {
      const instructions = map.mock.calls[0][1];
      for (const fragment of inputs.wantMapInstructionsContains) {
        expect(instructions).toContain(fragment);
      }
    }
    if (inputs.wantMapBatchSize !== undefined) {
      const config = map.mock.calls[0][2];
      expect(config.batchSize).toBe(inputs.wantMapBatchSize);
    }
    if (inputs.wantMapResponseFormat) {
      const config = map.mock.calls[0][2];
      expect(config.responseFormat.type).toBe(inputs.wantMapResponseFormat);
    }
    if (inputs.wantComplete) {
      const complete = result.events.find((e) => e.event === 'chain:complete');
      expect(complete).toMatchObject(inputs.wantComplete);
    }
  },
});
