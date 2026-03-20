import { describe, it, expect, vi, beforeEach } from 'vitest';
import { testForwardsConfig, testScopesProgress } from '../../lib/test-utils/index.js';
import detectThreshold, { calculateStatistics } from './index.js';
import reduce from '../reduce/index.js';
import callLlm from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';

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
  it('computes mean from known data', () => {
    const stats = calculateStatistics(KNOWN_DATA, 'score');
    // Sum = 575, count = 20 => mean = 28.75
    expect(stats.mean).toBeCloseTo(28.75, 10);
  });

  it('computes median for even-count dataset', () => {
    const stats = calculateStatistics(KNOWN_DATA, 'score');
    // Even count: median = (values[9] + values[10]) / 2 = (25 + 28) / 2 = 26.5
    expect(stats.median).toBe(26.5);
  });

  it('computes median for odd-count dataset', () => {
    const oddData = [{ v: 3 }, { v: 1 }, { v: 7 }, { v: 5 }, { v: 9 }];
    const stats = calculateStatistics(oddData, 'v');
    // sorted: [1, 3, 5, 7, 9] => median = values[2] = 5
    expect(stats.median).toBe(5);
  });

  it('computes standard deviation (population) correctly', () => {
    const stats = calculateStatistics(KNOWN_DATA, 'score');
    // Manually: variance = sum((v - 28.75)^2) / 20
    const squaredDiffs = SORTED_VALUES.map((v) => Math.pow(v - 28.75, 2));
    const expectedVariance = squaredDiffs.reduce((a, b) => a + b, 0) / 20;
    const expectedStdDev = Math.sqrt(expectedVariance);
    expect(stats.stdDev).toBeCloseTo(expectedStdDev, 10);
  });

  it('returns correct min and max', () => {
    const stats = calculateStatistics(KNOWN_DATA, 'score');
    expect(stats.min).toBe(2);
    expect(stats.max).toBe(80);
  });

  it('returns correct count', () => {
    const stats = calculateStatistics(KNOWN_DATA, 'score');
    expect(stats.count).toBe(20);
  });

  it('computes percentiles by floor-index into sorted values', () => {
    const stats = calculateStatistics(KNOWN_DATA, 'score');
    // floor(20 * 0.10) = 2 => sorted[2] = 8
    expect(stats.percentiles[10]).toBe(SORTED_VALUES[Math.floor(20 * 0.1)]);
    // floor(20 * 0.25) = 5 => sorted[5] = 15
    expect(stats.percentiles[25]).toBe(SORTED_VALUES[Math.floor(20 * 0.25)]);
    // 50th = median = 26.5
    expect(stats.percentiles[50]).toBe(26.5);
    // floor(20 * 0.75) = 15 => sorted[15] = 40
    expect(stats.percentiles[75]).toBe(SORTED_VALUES[Math.floor(20 * 0.75)]);
    // floor(20 * 0.90) = 18 => sorted[18] = 60
    expect(stats.percentiles[90]).toBe(SORTED_VALUES[Math.floor(20 * 0.9)]);
    // floor(20 * 0.95) = 19 => sorted[19] = 80
    expect(stats.percentiles[95]).toBe(SORTED_VALUES[Math.floor(20 * 0.95)]);
    // floor(20 * 0.99) = 19 => sorted[19] = 80
    expect(stats.percentiles[99]).toBe(SORTED_VALUES[Math.floor(20 * 0.99)]);
  });

  it('returns sorted values array', () => {
    const stats = calculateStatistics(KNOWN_DATA, 'score');
    expect(stats.values).toEqual(SORTED_VALUES);
  });

  it('filters out null, undefined, and NaN values', () => {
    const messyData = [{ v: 10 }, { v: null }, { v: undefined }, { v: NaN }, { v: 30 }, { v: 20 }];
    const stats = calculateStatistics(messyData, 'v');
    expect(stats.count).toBe(3);
    expect(stats.values).toEqual([10, 20, 30]);
    expect(stats.mean).toBeCloseTo(20, 10);
  });

  it('throws when no valid numeric values exist', () => {
    const allNull = [{ v: null }, { v: undefined }, { v: NaN }];
    expect(() => calculateStatistics(allNull, 'v')).toThrow(
      'No valid numeric values found for property: v'
    );
  });

  it('throws when property does not exist on any item', () => {
    const noProperty = [{ a: 1 }, { a: 2 }];
    expect(() => calculateStatistics(noProperty, 'missing')).toThrow(
      'No valid numeric values found for property: missing'
    );
  });

  it('handles single-element dataset', () => {
    const single = [{ x: 42 }];
    const stats = calculateStatistics(single, 'x');
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

  describe('input validation', () => {
    it('throws on empty data array', async () => {
      await expect(
        detectThreshold({ data: [], targetProperty: 'score', goal: defaultGoal })
      ).rejects.toThrow('Data must be a non-empty array');
    });

    it('throws on null data', async () => {
      await expect(
        detectThreshold({ data: null, targetProperty: 'score', goal: defaultGoal })
      ).rejects.toThrow('Data must be a non-empty array');
    });

    it('throws on undefined data', async () => {
      await expect(
        detectThreshold({ data: undefined, targetProperty: 'score', goal: defaultGoal })
      ).rejects.toThrow('Data must be a non-empty array');
    });

    it('throws on non-array data', async () => {
      await expect(
        detectThreshold({ data: 'not an array', targetProperty: 'score', goal: defaultGoal })
      ).rejects.toThrow('Data must be a non-empty array');
    });

    it('throws on missing targetProperty', async () => {
      await expect(
        detectThreshold({ data: KNOWN_DATA, targetProperty: '', goal: defaultGoal })
      ).rejects.toThrow('Target property must be specified');
    });

    it('throws on missing goal', async () => {
      await expect(
        detectThreshold({ data: KNOWN_DATA, targetProperty: 'score', goal: '' })
      ).rejects.toThrow('Goal must be specified to determine appropriate thresholds');
    });
  });

  describe('delegation to reduce', () => {
    const setupReduceAndLlm = () => {
      reduce.mockResolvedValueOnce(mockReduceResult);
      callLlm.mockResolvedValueOnce(mockLlmResult);
    };

    testForwardsConfig('forwards config to reduce', {
      invoke: (config) =>
        detectThreshold({
          data: KNOWN_DATA,
          targetProperty: 'score',
          goal: defaultGoal,
          ...config,
        }),
      setupMocks: setupReduceAndLlm,
      target: { mock: reduce, argIndex: 2 },
      options: {
        llm: { value: { modelName: 'test-model' } },
        maxAttempts: { value: 7 },
        batchSize: { value: 25 },
        now: { value: new Date('2025-06-15T12:00:00Z') },
        temperature: { value: 0.3 },
      },
    });

    testScopesProgress('to reduce', {
      invoke: (config) =>
        detectThreshold({
          data: KNOWN_DATA,
          targetProperty: 'score',
          goal: defaultGoal,
          ...config,
        }),
      setupMocks: setupReduceAndLlm,
      target: { mock: reduce, argIndex: 2 },
    });

    it('passes initial accumulator as JSON string to reduce', async () => {
      reduce.mockResolvedValueOnce(mockReduceResult);
      callLlm.mockResolvedValueOnce(mockLlmResult);

      await detectThreshold({ data: KNOWN_DATA, targetProperty: 'score', goal: defaultGoal });

      const reduceInitial = reduce.mock.calls[0][2].initial;
      const parsed = JSON.parse(reduceInitial);
      expect(parsed).toEqual({
        observedPatterns: [],
        potentialThresholds: [],
        distributionInsights: [],
      });
    });

    it('passes json_schema responseFormat to reduce', async () => {
      reduce.mockResolvedValueOnce(mockReduceResult);
      callLlm.mockResolvedValueOnce(mockLlmResult);

      await detectThreshold({ data: KNOWN_DATA, targetProperty: 'score', goal: defaultGoal });

      const reduceConfig = reduce.mock.calls[0][2];
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

    it('passes enriched data strings to reduce (batched in groups of 20)', async () => {
      reduce.mockResolvedValueOnce(mockReduceResult);
      callLlm.mockResolvedValueOnce(mockLlmResult);

      await detectThreshold({ data: KNOWN_DATA, targetProperty: 'score', goal: defaultGoal });

      const dataStrings = reduce.mock.calls[0][0];
      // 20 items with ITEMS_PER_LINE=20 => 1 string
      expect(dataStrings).toHaveLength(1);

      const parsed = JSON.parse(dataStrings[0]);
      expect(parsed).toHaveLength(20);
      // Each enriched item has value, percentileRank, and context
      expect(parsed[0]).toHaveProperty('value');
      expect(parsed[0]).toHaveProperty('percentileRank');
      expect(parsed[0]).toHaveProperty('context');
    });

    it('batches data into multiple strings when items exceed ITEMS_PER_LINE', async () => {
      reduce.mockResolvedValueOnce(mockReduceResult);
      callLlm.mockResolvedValueOnce(mockLlmResult);

      // 25 items => ceil(25/20) = 2 data strings
      const largeData = Array.from({ length: 25 }, (_, i) => ({ score: i + 1 }));
      await detectThreshold({ data: largeData, targetProperty: 'score', goal: defaultGoal });

      const dataStrings = reduce.mock.calls[0][0];
      expect(dataStrings).toHaveLength(2);

      const firstBatch = JSON.parse(dataStrings[0]);
      const secondBatch = JSON.parse(dataStrings[1]);
      expect(firstBatch).toHaveLength(20);
      expect(secondBatch).toHaveLength(5);
    });
  });

  describe('delegation to callLlm', () => {
    const setupReduceAndLlm = () => {
      reduce.mockResolvedValueOnce(mockReduceResult);
      callLlm.mockResolvedValueOnce(mockLlmResult);
    };

    testForwardsConfig('forwards config to callLlm', {
      invoke: (config) =>
        detectThreshold({
          data: KNOWN_DATA,
          targetProperty: 'score',
          goal: defaultGoal,
          ...config,
        }),
      setupMocks: setupReduceAndLlm,
      target: { mock: callLlm, argIndex: 1 },
      options: {
        llm: { value: { modelName: 'analysis-model' } },
        temperature: { value: 0.1 },
      },
    });

    it('forwards same llm to both reduce and callLlm', async () => {
      reduce.mockResolvedValueOnce(mockReduceResult);
      callLlm.mockResolvedValueOnce(mockLlmResult);

      const llm = { fast: true, good: 'prefer' };
      await detectThreshold({ data: KNOWN_DATA, targetProperty: 'score', goal: defaultGoal, llm });

      const reduceLlm = reduce.mock.calls[0][2].llm;
      const callLlmLlm = callLlm.mock.calls[0][1].llm;
      expect(reduceLlm).toBe(llm);
      expect(callLlmLlm).toBe(llm);
    });

    it('passes threshold_result schema in config', async () => {
      reduce.mockResolvedValueOnce(mockReduceResult);
      callLlm.mockResolvedValueOnce(mockLlmResult);

      await detectThreshold({ data: KNOWN_DATA, targetProperty: 'score', goal: defaultGoal });

      const callLlmConfig = callLlm.mock.calls[0][1];
      expect(callLlmConfig.response_format).toEqual({
        type: 'json_schema',
        json_schema: {
          name: 'threshold_result',
          schema: expect.objectContaining({
            required: ['thresholdCandidates'],
          }),
        },
      });
    });

    it('includes statistics and accumulated analysis in final prompt', async () => {
      reduce.mockResolvedValueOnce(mockReduceResult);
      callLlm.mockResolvedValueOnce(mockLlmResult);

      await detectThreshold({ data: KNOWN_DATA, targetProperty: 'score', goal: defaultGoal });

      const finalPrompt = callLlm.mock.calls[0][0];
      expect(finalPrompt).toContain('score');
      expect(finalPrompt).toContain('20 data points');
      // goal and accumulated-analysis are wrapped in XML tags with actual content
      expect(finalPrompt).toContain('<goal>');
      expect(finalPrompt).toContain(defaultGoal);
      expect(finalPrompt).toContain('<accumulated-analysis>');
      expect(finalPrompt).toContain('<statistics>');
      expect(finalPrompt).toContain('between 2 and 80');
    });
  });

  describe('out-of-range threshold filtering', () => {
    it('removes candidates below the data minimum', async () => {
      reduce.mockResolvedValueOnce(mockReduceResult);
      callLlm.mockResolvedValueOnce({
        thresholdCandidates: [
          {
            value: -5,
            rationale: 'below min',
            percentilePosition: 0,
            riskProfile: 'conservative',
            falsePositiveRate: 0.5,
            falseNegativeRate: 0.01,
            confidence: 0.3,
          },
          {
            value: 30,
            rationale: 'valid threshold',
            percentilePosition: 65,
            riskProfile: 'balanced',
            falsePositiveRate: 0.15,
            falseNegativeRate: 0.1,
            confidence: 0.85,
          },
        ],
      });

      const result = await detectThreshold({
        data: KNOWN_DATA,
        targetProperty: 'score',
        goal: defaultGoal,
      });

      expect(result.thresholdCandidates).toHaveLength(1);
      expect(result.thresholdCandidates[0].value).toBe(30);
    });

    it('removes candidates above the data maximum', async () => {
      reduce.mockResolvedValueOnce(mockReduceResult);
      callLlm.mockResolvedValueOnce({
        thresholdCandidates: [
          {
            value: 150,
            rationale: 'above max',
            percentilePosition: 100,
            riskProfile: 'aggressive',
            falsePositiveRate: 0.01,
            falseNegativeRate: 0.5,
            confidence: 0.2,
          },
          {
            value: 50,
            rationale: 'valid high threshold',
            percentilePosition: 88,
            riskProfile: 'aggressive',
            falsePositiveRate: 0.05,
            falseNegativeRate: 0.2,
            confidence: 0.75,
          },
        ],
      });

      const result = await detectThreshold({
        data: KNOWN_DATA,
        targetProperty: 'score',
        goal: defaultGoal,
      });

      expect(result.thresholdCandidates).toHaveLength(1);
      expect(result.thresholdCandidates[0].value).toBe(50);
    });

    it('removes all candidates if all are out of range', async () => {
      reduce.mockResolvedValueOnce(mockReduceResult);
      callLlm.mockResolvedValueOnce({
        thresholdCandidates: [
          {
            value: -10,
            rationale: 'way below',
            percentilePosition: 0,
            riskProfile: 'conservative',
            falsePositiveRate: 0.9,
            falseNegativeRate: 0.01,
            confidence: 0.1,
          },
          {
            value: 200,
            rationale: 'way above',
            percentilePosition: 100,
            riskProfile: 'aggressive',
            falsePositiveRate: 0.01,
            falseNegativeRate: 0.9,
            confidence: 0.1,
          },
        ],
      });

      const result = await detectThreshold({
        data: KNOWN_DATA,
        targetProperty: 'score',
        goal: defaultGoal,
      });

      expect(result.thresholdCandidates).toHaveLength(0);
    });

    it('keeps candidates exactly at min and max boundaries', async () => {
      reduce.mockResolvedValueOnce(mockReduceResult);
      callLlm.mockResolvedValueOnce({
        thresholdCandidates: [
          {
            value: 2,
            rationale: 'at minimum',
            percentilePosition: 0,
            riskProfile: 'conservative',
            falsePositiveRate: 0.95,
            falseNegativeRate: 0.0,
            confidence: 0.5,
          },
          {
            value: 80,
            rationale: 'at maximum',
            percentilePosition: 100,
            riskProfile: 'aggressive',
            falsePositiveRate: 0.0,
            falseNegativeRate: 0.95,
            confidence: 0.5,
          },
        ],
      });

      const result = await detectThreshold({
        data: KNOWN_DATA,
        targetProperty: 'score',
        goal: defaultGoal,
      });

      expect(result.thresholdCandidates).toHaveLength(2);
      expect(result.thresholdCandidates[0].value).toBe(2);
      expect(result.thresholdCandidates[1].value).toBe(80);
    });

    it('handles result with no thresholdCandidates property gracefully', async () => {
      reduce.mockResolvedValueOnce(mockReduceResult);
      callLlm.mockResolvedValueOnce({ someOtherField: 'no candidates' });

      const result = await detectThreshold({
        data: KNOWN_DATA,
        targetProperty: 'score',
        goal: defaultGoal,
      });

      // Should not throw; thresholdCandidates stays undefined
      expect(result.thresholdCandidates).toBeUndefined();
    });
  });

  describe('distributionAnalysis in result', () => {
    it('attaches distributionAnalysis with correct statistics', async () => {
      reduce.mockResolvedValueOnce(mockReduceResult);
      callLlm.mockResolvedValueOnce(mockLlmResult);

      const result = await detectThreshold({
        data: KNOWN_DATA,
        targetProperty: 'score',
        goal: defaultGoal,
      });

      expect(result.distributionAnalysis).toBeDefined();
      expect(result.distributionAnalysis.mean).toBeCloseTo(28.75, 10);
      expect(result.distributionAnalysis.median).toBe(26.5);
      expect(result.distributionAnalysis.min).toBe(2);
      expect(result.distributionAnalysis.max).toBe(80);
      expect(result.distributionAnalysis.dataPoints).toBe(20);
    });

    it('includes standard deviation in distributionAnalysis', async () => {
      reduce.mockResolvedValueOnce(mockReduceResult);
      callLlm.mockResolvedValueOnce(mockLlmResult);

      const result = await detectThreshold({
        data: KNOWN_DATA,
        targetProperty: 'score',
        goal: defaultGoal,
      });

      const expectedStdDev = calculateStatistics(KNOWN_DATA, 'score').stdDev;
      expect(result.distributionAnalysis.standardDeviation).toBeCloseTo(expectedStdDev, 10);
    });

    it('includes all percentiles in distributionAnalysis', async () => {
      reduce.mockResolvedValueOnce(mockReduceResult);
      callLlm.mockResolvedValueOnce(mockLlmResult);

      const result = await detectThreshold({
        data: KNOWN_DATA,
        targetProperty: 'score',
        goal: defaultGoal,
      });

      const expectedPercentiles = calculateStatistics(KNOWN_DATA, 'score').percentiles;
      expect(result.distributionAnalysis.percentiles).toEqual(expectedPercentiles);
    });

    it('overwrites any LLM-provided distributionAnalysis with computed statistics', async () => {
      reduce.mockResolvedValueOnce(mockReduceResult);
      callLlm.mockResolvedValueOnce({
        thresholdCandidates: [],
        distributionAnalysis: {
          mean: 999,
          median: 999,
          standardDeviation: 999,
          skewness: 'left',
          outlierPresence: 'high',
          distributionType: 'bimodal',
        },
      });

      const result = await detectThreshold({
        data: KNOWN_DATA,
        targetProperty: 'score',
        goal: defaultGoal,
      });

      // The code unconditionally assigns distributionAnalysis from computed stats
      expect(result.distributionAnalysis.mean).toBeCloseTo(28.75, 10);
      expect(result.distributionAnalysis.median).toBe(26.5);
      expect(result.distributionAnalysis.dataPoints).toBe(20);
    });
  });

  describe('default parameter values', () => {
    it('uses { good: true } as default llm', async () => {
      reduce.mockResolvedValueOnce(mockReduceResult);
      callLlm.mockResolvedValueOnce(mockLlmResult);

      await detectThreshold({ data: KNOWN_DATA, targetProperty: 'score', goal: defaultGoal });

      const reduceLlm = reduce.mock.calls[0][2].llm;
      expect(reduceLlm).toEqual({ good: true });

      const callLlmLlm = callLlm.mock.calls[0][1].llm;
      expect(callLlmLlm).toEqual({ good: true });
    });

    it('uses batchSize 50 by default', async () => {
      reduce.mockResolvedValueOnce(mockReduceResult);
      callLlm.mockResolvedValueOnce(mockLlmResult);

      await detectThreshold({ data: KNOWN_DATA, targetProperty: 'score', goal: defaultGoal });

      const reduceConfig = reduce.mock.calls[0][2];
      expect(reduceConfig.batchSize).toBe(50);
    });

    it('passes config to retry wrapper (retry resolves maxAttempts from config)', async () => {
      reduce.mockResolvedValueOnce(mockReduceResult);
      callLlm.mockResolvedValueOnce(mockLlmResult);

      await detectThreshold({ data: KNOWN_DATA, targetProperty: 'score', goal: defaultGoal });

      const retryConfig = retry.mock.calls[0][1];
      expect(retryConfig.config).toBeDefined();
    });
  });
});
