import { vi, beforeEach, expect } from 'vitest';
import centralTendency from './index.js';
import map from '../map/index.js';
import { runTable, applyMocks } from '../../lib/examples-runner/index.js';

vi.mock('../map/index.js', () => ({ default: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

const mockResult = (score, reason, confidence) => ({ score, reason, confidence });

const baseResults = [mockResult(0.9, 'typical', 0.8), mockResult(0.3, 'atypical', 0.7)];
const passthroughResults = [mockResult(0.9, 'good', 0.8), 'b', mockResult(0.4, 'ok', 0.6)];

runTable({
  describe: 'centralTendency chain',
  examples: [
    {
      name: 'delegates to map with items, instructions, and config',
      inputs: { items: ['apple', 'chainsaw'], seeds: ['banana', 'orange'] },
      mocks: { map: [baseResults] },
      want: {
        value: baseResults,
        mapCalls: 1,
        mapInstructionsContains: ['banana, orange'],
        mapBatchSize: 5,
        mapResponseFormat: 'json_schema',
      },
    },
    {
      name: 'includes context in the instructions passed to map',
      inputs: { items: ['wolf'], seeds: ['dog', 'cat'], options: { context: 'Household pets' } },
      mocks: { map: [[mockResult(0.7, 'contextual', 0.8)]] },
      want: { mapInstructionsContains: ['<context>', 'Household pets'] },
    },
    {
      name: 'includes coreFeatures in the instructions passed to map',
      inputs: {
        items: ['wolf'],
        seeds: ['dog', 'cat'],
        options: { coreFeatures: ['warm-blooded', 'domesticated'] },
      },
      mocks: { map: [[mockResult(0.7, 'featured', 0.8)]] },
      want: { mapInstructionsContains: ['<core-features>', 'warm-blooded, domesticated'] },
    },
    {
      name: 'returns empty array for empty items',
      inputs: { items: [], seeds: ['seed'] },
      want: { value: [], noMap: true },
    },
    {
      name: 'throws for non-array items',
      inputs: { items: 'not-array', seeds: ['seed'] },
      want: { throws: /Items must be an array/ },
    },
    {
      name: 'throws for empty seedItems array',
      inputs: { items: ['item'], seeds: [] },
      want: { throws: /seedItems must be a non-empty array/ },
    },
    {
      name: 'throws for null seedItems',
      inputs: { items: ['item'], seeds: null },
      want: { throws: /seedItems must be a non-empty array/ },
    },
    {
      name: 'passes through original items from map when transformation fails',
      inputs: { items: ['a', 'b', 'c'], seeds: ['seed'] },
      mocks: { map: [passthroughResults] },
      want: { value: passthroughResults, valueIndex1: 'b' },
    },
    {
      name: 'reports correct success/failure counts when map returns originals',
      inputs: { items: ['a', 'b', 'c'], seeds: ['seed'], withEvents: true },
      mocks: { map: [passthroughResults] },
      want: { complete: { successCount: 2, failureCount: 1 } },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { map });
    if (inputs.withEvents) {
      const events = [];
      await centralTendency(inputs.items, inputs.seeds, {
        ...inputs.options,
        onProgress: (e) => events.push(e),
      });
      return { events };
    }
    const value = await centralTendency(inputs.items, inputs.seeds, inputs.options);
    return { value };
  },
  expects: ({ result, error, want }) => {
    if (want.throws) {
      expect(error?.message).toMatch(want.throws);
      return;
    }
    if (error) throw error;
    if ('value' in want) expect(result.value).toEqual(want.value);
    if (want.valueIndex1 !== undefined) {
      expect(result.value[1]).toBe(want.valueIndex1);
    }
    if (want.noMap) expect(map).not.toHaveBeenCalled();
    if ('mapCalls' in want) expect(map).toHaveBeenCalledTimes(want.mapCalls);
    if (want.mapInstructionsContains) {
      const instructions = map.mock.calls[0][1];
      for (const fragment of want.mapInstructionsContains) {
        expect(instructions).toContain(fragment);
      }
    }
    if (want.mapBatchSize !== undefined) {
      const config = map.mock.calls[0][2];
      expect(config.batchSize).toBe(want.mapBatchSize);
    }
    if (want.mapResponseFormat) {
      const config = map.mock.calls[0][2];
      expect(config.responseFormat.type).toBe(want.mapResponseFormat);
    }
    if (want.complete) {
      const complete = result.events.find((e) => e.event === 'chain:complete');
      expect(complete).toMatchObject(want.complete);
    }
  },
});
