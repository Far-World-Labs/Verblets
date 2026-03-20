import { describe, it, expect, vi, beforeEach } from 'vitest';
import { testForwardsConfig, testScopesProgress } from '../../lib/test-utils/index.js';
import centralTendency from './index.js';
import map from '../map/index.js';

vi.mock('../map/index.js', () => ({
  default: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('centralTendency chain', () => {
  const mockResult = (score, reason, confidence) => ({ score, reason, confidence });

  it('delegates to map with items, instructions, and config', async () => {
    const results = [mockResult(0.9, 'typical', 0.8), mockResult(0.3, 'atypical', 0.7)];
    map.mockResolvedValueOnce(results);

    const items = ['apple', 'chainsaw'];
    const seeds = ['banana', 'orange'];
    const output = await centralTendency(items, seeds);

    expect(output).toStrictEqual(results);
    expect(map).toHaveBeenCalledTimes(1);

    const [mapItems, mapInstructions, mapConfig] = map.mock.calls[0];
    expect(mapItems).toStrictEqual(items);
    expect(mapInstructions).toContain('banana, orange');
    expect(mapConfig.batchSize).toBe(5);
    expect(mapConfig.responseFormat).toBeDefined();
    expect(mapConfig.responseFormat.type).toBe('json_schema');
  });

  testForwardsConfig('forwards config to map', {
    invoke: (config) => centralTendency(['item'], ['seed'], config),
    setupMocks: () => {
      map.mockResolvedValueOnce([mockResult(0.5, 'ok', 0.6)]);
    },
    target: { mock: map, argIndex: 2 },
    options: {
      llm: { value: { model: 'claude-3-opus' } },
      batchSize: { value: 10 },
      maxAttempts: { value: 5 },
    },
  });

  it('includes context in the instructions passed to map', async () => {
    map.mockResolvedValueOnce([mockResult(0.7, 'contextual', 0.8)]);

    await centralTendency(['wolf'], ['dog', 'cat'], {
      context: 'Household pets',
    });

    const instructions = map.mock.calls[0][1];
    expect(instructions).toContain('Context: Household pets');
  });

  it('includes coreFeatures in the instructions passed to map', async () => {
    map.mockResolvedValueOnce([mockResult(0.7, 'featured', 0.8)]);

    await centralTendency(['wolf'], ['dog', 'cat'], {
      coreFeatures: ['warm-blooded', 'domesticated'],
    });

    const instructions = map.mock.calls[0][1];
    expect(instructions).toContain('Core Features: warm-blooded, domesticated');
  });

  it('returns empty array for empty items', async () => {
    const result = await centralTendency([], ['seed']);
    expect(result).toStrictEqual([]);
    expect(map).not.toHaveBeenCalled();
  });

  it('throws for non-array items', async () => {
    await expect(centralTendency('not-array', ['seed'])).rejects.toThrow('Items must be an array');
  });

  it('throws for empty seedItems', async () => {
    await expect(centralTendency(['item'], [])).rejects.toThrow(
      'seedItems must be a non-empty array'
    );
  });

  it('throws for null seedItems', async () => {
    await expect(centralTendency(['item'], null)).rejects.toThrow(
      'seedItems must be a non-empty array'
    );
  });

  it('passes through undefined results from map without transformation', async () => {
    const results = [mockResult(0.9, 'good', 0.8), undefined, mockResult(0.4, 'ok', 0.6)];
    map.mockResolvedValueOnce(results);

    const output = await centralTendency(['a', 'b', 'c'], ['seed']);
    expect(output).toStrictEqual(results);
    expect(output[1]).toBeUndefined();
  });

  testScopesProgress('to map', {
    invoke: (config) => centralTendency(['item'], ['seed'], config),
    setupMocks: () => {
      map.mockResolvedValueOnce([mockResult(0.5, 'ok', 0.6)]);
    },
    target: { mock: map, argIndex: 2 },
  });
});
