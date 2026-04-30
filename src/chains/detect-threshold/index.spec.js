import { describe, it, expect, vi, beforeEach } from 'vitest';
import detectThreshold, { calculateStatistics } from './index.js';
import reduce from '../reduce/index.js';
import callLlm from '../../lib/llm/index.js';
vi.mock('../reduce/index.js', () => ({ default: vi.fn() }));
vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(),
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
}));
vi.mock('../../lib/retry/index.js', () => ({ default: vi.fn(async (fn) => fn()) }));

beforeEach(() => {
  vi.clearAllMocks();
});

// A 20-element dataset with known statistical properties.
// Values (sorted): 2, 5, 8, 10, 12, 15, 18, 20, 22, 25, 28, 30, 32, 35, 38, 40, 45, 50, 60, 80
// Sum = 575, Count = 20, Mean = 28.75
const KNOWN_DATA = [
  { score: 25 },
  { score: 10 },
  { score: 50 },
  { score: 5 },
  { score: 35 },
  { score: 18 },
  { score: 80 },
  { score: 12 },
  { score: 40 },
  { score: 2 },
  { score: 60 },
  { score: 22 },
  { score: 45 },
  { score: 8 },
  { score: 30 },
  { score: 15 },
  { score: 38 },
  { score: 20 },
  { score: 28 },
  { score: 32 },
];

const SORTED_VALUES = [2, 5, 8, 10, 12, 15, 18, 20, 22, 25, 28, 30, 32, 35, 38, 40, 45, 50, 60, 80];

describe('calculateStatistics', () => {
  it('computes all summary statistics from known data', () => {
    const stats = calculateStatistics(KNOWN_DATA, 'score');

    expect(stats.count).toBe(20);
    expect(stats.mean).toBeCloseTo(28.75, 10);
    // Even count: median = (values[9] + values[10]) / 2 = (25 + 28) / 2 = 26.5
    expect(stats.median).toBe(26.5);
    expect(stats.min).toBe(2);
    expect(stats.max).toBe(80);
    expect(stats.values).toEqual(SORTED_VALUES);

    // Population standard deviation
    const squaredDiffs = SORTED_VALUES.map((v) => Math.pow(v - 28.75, 2));
    const expectedStdDev = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / 20);
    expect(stats.stdDev).toBeCloseTo(expectedStdDev, 10);
  });

  it('computes median for odd-count dataset', () => {
    const oddData = [{ v: 3 }, { v: 1 }, { v: 7 }, { v: 5 }, { v: 9 }];
    const stats = calculateStatistics(oddData, 'v');
    // sorted: [1, 3, 5, 7, 9] => median = values[2] = 5
    expect(stats.median).toBe(5);
  });

  it('computes percentiles by floor-index into sorted values', () => {
    const stats = calculateStatistics(KNOWN_DATA, 'score');
    expect(stats.percentiles[10]).toBe(SORTED_VALUES[Math.floor(20 * 0.1)]);
    expect(stats.percentiles[25]).toBe(SORTED_VALUES[Math.floor(20 * 0.25)]);
    expect(stats.percentiles[50]).toBe(26.5);
    expect(stats.percentiles[75]).toBe(SORTED_VALUES[Math.floor(20 * 0.75)]);
    expect(stats.percentiles[90]).toBe(SORTED_VALUES[Math.floor(20 * 0.9)]);
    expect(stats.percentiles[95]).toBe(SORTED_VALUES[Math.floor(20 * 0.95)]);
    expect(stats.percentiles[99]).toBe(SORTED_VALUES[Math.floor(20 * 0.99)]);
  });

  it('filters out null, undefined, and NaN values', () => {
    const messyData = [
      { v: 10 },
      { v: undefined },
      { v: undefined },
      { v: NaN },
      { v: 30 },
      { v: 20 },
    ];
    const stats = calculateStatistics(messyData, 'v');
    expect(stats.count).toBe(3);
    expect(stats.values).toEqual([10, 20, 30]);
    expect(stats.mean).toBeCloseTo(20, 10);
  });

  it.each([
    ['all invalid values', [{ v: undefined }, { v: undefined }, { v: NaN }]],
    ['missing property', [{ a: 1 }, { a: 2 }]],
  ])('throws when no valid numerics exist (%s)', (_label, data) => {
    expect(() => calculateStatistics(data, 'v')).toThrow(
      'No valid numeric values found for property: v'
    );
  });

  it('handles single-element dataset', () => {
    const stats = calculateStatistics([{ x: 42 }], 'x');
    expect(stats.count).toBe(1);
    expect(stats.mean).toBe(42);
    expect(stats.median).toBe(42);
    expect(stats.stdDev).toBe(0);
    expect(stats.min).toBe(42);
    expect(stats.max).toBe(42);
  });
});

describe('detectThreshold', () => {
  const defaultGoal = 'identify high-performing items';

  const mockReduceResult = {
    observedPatterns: ['cluster around 25-35'],
    potentialThresholds: [{ value: 30, rationale: 'natural break' }],
    distributionInsights: ['right-skewed distribution'],
  };

  const mockLlmResult = {
    thresholdCandidates: [
      {
        value: 30,
        rationale: 'natural break in distribution',
        percentilePosition: 65,
        riskProfile: 'balanced',
        falsePositiveRate: 0.15,
        falseNegativeRate: 0.1,
        confidence: 0.85,
      },
    ],
  };

  const mkCandidate = (overrides) => ({
    rationale: 'test',
    percentilePosition: 50,
    riskProfile: 'balanced',
    falsePositiveRate: 0.1,
    falseNegativeRate: 0.1,
    confidence: 0.5,
    ...overrides,
  });

  it.each([
    [
      'empty array',
      { data: [], targetProperty: 'score', goal: defaultGoal },
      'Data must be a non-empty array',
    ],
    [
      'null data',
      { data: null, targetProperty: 'score', goal: defaultGoal },
      'Data must be a non-empty array',
    ],
    [
      'undefined data',
      { data: undefined, targetProperty: 'score', goal: defaultGoal },
      'Data must be a non-empty array',
    ],
    [
      'non-array data',
      { data: 'not an array', targetProperty: 'score', goal: defaultGoal },
      'Data must be a non-empty array',
    ],
    [
      'missing targetProperty',
      { data: KNOWN_DATA, targetProperty: '', goal: defaultGoal },
      'Target property must be specified',
    ],
    [
      'missing goal',
      { data: KNOWN_DATA, targetProperty: 'score', goal: '' },
      'Goal must be specified to determine appropriate thresholds',
    ],
  ])('rejects invalid input: %s', async (_label, { data, targetProperty, goal }, expectedError) => {
    await expect(detectThreshold(data, targetProperty, goal)).rejects.toThrow(expectedError);
  });

  it('accepts positional arguments', async () => {
    reduce.mockResolvedValueOnce(mockReduceResult);
    callLlm.mockResolvedValueOnce(mockLlmResult);

    const result = await detectThreshold(KNOWN_DATA, 'score', defaultGoal);

    expect(result).toHaveProperty('thresholdCandidates');
    expect(result).toHaveProperty('distributionAnalysis');
  });

  it('wires instruction bundle context into prompts', async () => {
    reduce.mockResolvedValueOnce(mockReduceResult);
    callLlm.mockResolvedValueOnce(mockLlmResult);

    await detectThreshold(KNOWN_DATA, 'score', {
      text: defaultGoal,
      domain: 'financial risk',
    });

    const reduceInstructions = reduce.mock.calls[0][1];
    expect(reduceInstructions).toContain('<domain>');
    expect(reduceInstructions).toContain('financial risk');
    expect(reduceInstructions).toContain(defaultGoal);

    const finalPrompt = callLlm.mock.calls[0][0];
    expect(finalPrompt).toContain('<domain>');
    expect(finalPrompt).toContain('financial risk');
  });

  describe('delegation to reduce', () => {
    it('passes initial accumulator and json_schema responseFormat', async () => {
      reduce.mockResolvedValueOnce(mockReduceResult);
      callLlm.mockResolvedValueOnce(mockLlmResult);

      await detectThreshold(KNOWN_DATA, 'score', defaultGoal);

      const reduceConfig = reduce.mock.calls[0][2];

      const parsed = JSON.parse(reduceConfig.initial);
      expect(parsed).toEqual({
        observedPatterns: [],
        potentialThresholds: [],
        distributionInsights: [],
      });

      expect(reduceConfig.responseFormat).toEqual({
        type: 'json_schema',
        json_schema: {
          name: 'analysis_accumulator',
          schema: expect.objectContaining({
            type: 'object',
            required: ['observedPatterns', 'potentialThresholds', 'distributionInsights'],
          }),
        },
      });
    });

    it('batches enriched data into groups of 20', async () => {
      reduce.mockResolvedValueOnce(mockReduceResult);
      callLlm.mockResolvedValueOnce(mockLlmResult);

      // 25 items => ceil(25/20) = 2 data strings
      const largeData = Array.from({ length: 25 }, (_, i) => ({ score: i + 1 }));
      await detectThreshold(largeData, 'score', defaultGoal);

      const dataStrings = reduce.mock.calls[0][0];
      expect(dataStrings).toHaveLength(2);

      const firstBatch = JSON.parse(dataStrings[0]);
      const secondBatch = JSON.parse(dataStrings[1]);
      expect(firstBatch).toHaveLength(20);
      expect(secondBatch).toHaveLength(5);

      // Each enriched item has value, percentileRank, and context
      expect(firstBatch[0]).toHaveProperty('value');
      expect(firstBatch[0]).toHaveProperty('percentileRank');
      expect(firstBatch[0]).toHaveProperty('context');
    });
  });

  it('includes statistics and accumulated analysis in final prompt', async () => {
    reduce.mockResolvedValueOnce(mockReduceResult);
    callLlm.mockResolvedValueOnce(mockLlmResult);

    await detectThreshold(KNOWN_DATA, 'score', defaultGoal);

    const finalPrompt = callLlm.mock.calls[0][0];
    expect(finalPrompt).toContain('score');
    expect(finalPrompt).toContain('20 data points');
    expect(finalPrompt).toContain('<goal>');
    expect(finalPrompt).toContain(defaultGoal);
    expect(finalPrompt).toContain('<accumulated-analysis>');
    expect(finalPrompt).toContain('<statistics>');
    expect(finalPrompt).toContain('between 2 and 80');

    const callLlmConfig = callLlm.mock.calls[0][1];
    expect(callLlmConfig.responseFormat).toEqual({
      type: 'json_schema',
      json_schema: {
        name: 'threshold_result',
        schema: expect.objectContaining({
          required: ['thresholdCandidates'],
        }),
      },
    });
  });

  describe('out-of-range threshold filtering', () => {
    it.each([
      ['below min', [-5, 30], [30]],
      ['above max', [150, 50], [50]],
      ['all out of range', [-10, 200], []],
    ])('removes candidates %s', async (_label, candidateValues, expectedValues) => {
      reduce.mockResolvedValueOnce(mockReduceResult);
      callLlm.mockResolvedValueOnce({
        thresholdCandidates: candidateValues.map((value) => mkCandidate({ value })),
      });

      const result = await detectThreshold(KNOWN_DATA, 'score', defaultGoal);

      expect(result.thresholdCandidates.map((c) => c.value)).toEqual(expectedValues);
    });

    it('keeps candidates exactly at min and max boundaries', async () => {
      reduce.mockResolvedValueOnce(mockReduceResult);
      callLlm.mockResolvedValueOnce({
        thresholdCandidates: [mkCandidate({ value: 2 }), mkCandidate({ value: 80 })],
      });

      const result = await detectThreshold(KNOWN_DATA, 'score', defaultGoal);

      expect(result.thresholdCandidates).toHaveLength(2);
      expect(result.thresholdCandidates[0].value).toBe(2);
      expect(result.thresholdCandidates[1].value).toBe(80);
    });

    it('throws when LLM response is missing thresholdCandidates', async () => {
      reduce.mockResolvedValueOnce(mockReduceResult);
      callLlm.mockResolvedValueOnce({ someOtherField: 'no candidates' });

      await expect(detectThreshold(KNOWN_DATA, 'score', defaultGoal)).rejects.toThrow(
        /missing required "thresholdCandidates"/
      );
    });
  });

  it('overwrites LLM-provided distributionAnalysis with computed statistics', async () => {
    reduce.mockResolvedValueOnce(mockReduceResult);
    callLlm.mockResolvedValueOnce({
      thresholdCandidates: [],
      distributionAnalysis: { mean: 999, median: 999, standardDeviation: 999 },
    });

    const result = await detectThreshold(KNOWN_DATA, 'score', defaultGoal);

    const expectedStats = calculateStatistics(KNOWN_DATA, 'score');
    expect(result.distributionAnalysis).toEqual({
      mean: expectedStats.mean,
      median: expectedStats.median,
      standardDeviation: expectedStats.stdDev,
      min: expectedStats.min,
      max: expectedStats.max,
      percentiles: expectedStats.percentiles,
      dataPoints: expectedStats.count,
    });
  });
});
