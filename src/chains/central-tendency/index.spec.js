import { vi, beforeEach, expect } from 'vitest';
import centralTendency from './index.js';
import map from '../map/index.js';
import { runTable, all, throws } from '../../lib/examples-runner/index.js';

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
        preMock: () => {
          const results = [mockResult(0.9, 'typical', 0.8), mockResult(0.3, 'atypical', 0.7)];
          map.mockResolvedValueOnce(results);
          return results;
        },
      },
      check: ({ result, inputs }) => {
        expect(result.value).toStrictEqual(result.expected);
        expect(map).toHaveBeenCalledTimes(1);
        const [mapItems, mapInstructions, mapConfig] = map.mock.calls[0];
        expect(mapItems).toStrictEqual(inputs.items);
        expect(mapInstructions).toContain('banana, orange');
        expect(mapConfig.batchSize).toBe(5);
        expect(mapConfig.responseFormat).toBeDefined();
        expect(mapConfig.responseFormat.type).toBe('json_schema');
      },
    },
    {
      name: 'includes context in the instructions passed to map',
      inputs: {
        items: ['wolf'],
        seeds: ['dog', 'cat'],
        options: { context: 'Household pets' },
        preMock: () => map.mockResolvedValueOnce([mockResult(0.7, 'contextual', 0.8)]),
      },
      check: () => {
        const instructions = map.mock.calls[0][1];
        expect(instructions).toContain('<context>');
        expect(instructions).toContain('Household pets');
      },
    },
    {
      name: 'includes coreFeatures in the instructions passed to map',
      inputs: {
        items: ['wolf'],
        seeds: ['dog', 'cat'],
        options: { coreFeatures: ['warm-blooded', 'domesticated'] },
        preMock: () => map.mockResolvedValueOnce([mockResult(0.7, 'featured', 0.8)]),
      },
      check: () => {
        const instructions = map.mock.calls[0][1];
        expect(instructions).toContain('<core-features>');
        expect(instructions).toContain('warm-blooded, domesticated');
      },
    },
    {
      name: 'returns empty array for empty items',
      inputs: { items: [], seeds: ['seed'] },
      check: all(
        ({ result }) => expect(result.value).toStrictEqual([]),
        () => expect(map).not.toHaveBeenCalled()
      ),
    },
    {
      name: 'throws for non-array items',
      inputs: { items: 'not-array', seeds: ['seed'] },
      check: throws(/Items must be an array/),
    },
    {
      name: 'throws for empty seedItems array',
      inputs: { items: ['item'], seeds: [] },
      check: throws(/seedItems must be a non-empty array/),
    },
    {
      name: 'throws for null seedItems',
      inputs: { items: ['item'], seeds: null },
      check: throws(/seedItems must be a non-empty array/),
    },
    {
      name: 'passes through original items from map when transformation fails',
      inputs: {
        items: ['a', 'b', 'c'],
        seeds: ['seed'],
        preMock: () => {
          const results = [mockResult(0.9, 'good', 0.8), 'b', mockResult(0.4, 'ok', 0.6)];
          map.mockResolvedValueOnce(results);
          return results;
        },
      },
      check: ({ result }) => {
        expect(result.value).toStrictEqual(result.expected);
        expect(result.value[1]).toBe('b');
      },
    },
    {
      name: 'reports correct success/failure counts when map returns originals',
      inputs: {
        items: ['a', 'b', 'c'],
        seeds: ['seed'],
        withEvents: true,
        preMock: () => {
          map.mockResolvedValueOnce([
            mockResult(0.9, 'good', 0.8),
            'b',
            mockResult(0.4, 'ok', 0.6),
          ]);
        },
      },
      check: ({ result }) => {
        const complete = result.events.find((e) => e.event === 'chain:complete');
        expect(complete).toMatchObject({ successCount: 2, failureCount: 1 });
      },
    },
  ],
  process: async ({ items, seeds, options, preMock, withEvents }) => {
    const expected = preMock?.();
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
});
