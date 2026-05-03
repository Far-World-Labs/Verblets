import { vi, beforeEach, expect } from 'vitest';
import detectThreshold, { calculateStatistics } from './index.js';
import reduce from '../reduce/index.js';
import callLlm from '../../lib/llm/index.js';
import { runTable, throws } from '../../lib/examples-runner/index.js';

vi.mock('../reduce/index.js', () => ({ default: vi.fn() }));
vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(),
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
}));
vi.mock('../../lib/retry/index.js', () => ({ default: vi.fn(async (fn) => fn()) }));

beforeEach(() => vi.clearAllMocks());

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

// ─── calculateStatistics ──────────────────────────────────────────────────

runTable({
  describe: 'calculateStatistics',
  examples: [
    {
      name: 'computes all summary statistics from known data',
      inputs: { data: KNOWN_DATA, prop: 'score' },
      check: ({ result }) => {
        expect(result.count).toBe(20);
        expect(result.mean).toBeCloseTo(28.75, 10);
        expect(result.median).toBe(26.5);
        expect(result.min).toBe(2);
        expect(result.max).toBe(80);
        expect(result.values).toEqual(SORTED_VALUES);
        const sqDiffs = SORTED_VALUES.map((v) => (v - 28.75) ** 2);
        const expected = Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / 20);
        expect(result.stdDev).toBeCloseTo(expected, 10);
      },
    },
    {
      name: 'computes median for odd-count dataset',
      inputs: { data: [{ v: 3 }, { v: 1 }, { v: 7 }, { v: 5 }, { v: 9 }], prop: 'v' },
      check: ({ result }) => expect(result.median).toBe(5),
    },
    {
      name: 'computes percentiles by floor-index into sorted values',
      inputs: { data: KNOWN_DATA, prop: 'score' },
      check: ({ result }) => {
        expect(result.percentiles[10]).toBe(SORTED_VALUES[Math.floor(20 * 0.1)]);
        expect(result.percentiles[25]).toBe(SORTED_VALUES[Math.floor(20 * 0.25)]);
        expect(result.percentiles[50]).toBe(26.5);
        expect(result.percentiles[75]).toBe(SORTED_VALUES[Math.floor(20 * 0.75)]);
        expect(result.percentiles[90]).toBe(SORTED_VALUES[Math.floor(20 * 0.9)]);
        expect(result.percentiles[95]).toBe(SORTED_VALUES[Math.floor(20 * 0.95)]);
        expect(result.percentiles[99]).toBe(SORTED_VALUES[Math.floor(20 * 0.99)]);
      },
    },
    {
      name: 'filters out null, undefined, and NaN values',
      inputs: {
        data: [{ v: 10 }, { v: undefined }, { v: undefined }, { v: NaN }, { v: 30 }, { v: 20 }],
        prop: 'v',
      },
      check: ({ result }) => {
        expect(result.count).toBe(3);
        expect(result.values).toEqual([10, 20, 30]);
        expect(result.mean).toBeCloseTo(20, 10);
      },
    },
    {
      name: 'throws when no valid numerics — all invalid values',
      inputs: { data: [{ v: undefined }, { v: undefined }, { v: NaN }], prop: 'v' },
      check: throws(/No valid numeric values found for property: v/),
    },
    {
      name: 'throws when no valid numerics — missing property',
      inputs: { data: [{ a: 1 }, { a: 2 }], prop: 'v' },
      check: throws(/No valid numeric values found for property: v/),
    },
    {
      name: 'handles single-element dataset',
      inputs: { data: [{ x: 42 }], prop: 'x' },
      check: ({ result }) =>
        expect(result).toMatchObject({
          count: 1,
          mean: 42,
          median: 42,
          stdDev: 0,
          min: 42,
          max: 42,
        }),
    },
  ],
  process: ({ data, prop }) => calculateStatistics(data, prop),
});

// ─── detectThreshold ──────────────────────────────────────────────────────

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

const validationCases = [
  ['empty array', [], 'score', defaultGoal, /Data must be a non-empty array/],
  ['null data', null, 'score', defaultGoal, /Data must be a non-empty array/],
  ['undefined data', undefined, 'score', defaultGoal, /Data must be a non-empty array/],
  ['non-array data', 'not an array', 'score', defaultGoal, /Data must be a non-empty array/],
  ['missing targetProperty', KNOWN_DATA, '', defaultGoal, /Target property must be specified/],
  [
    'missing goal',
    KNOWN_DATA,
    'score',
    '',
    /Goal must be specified to determine appropriate thresholds/,
  ],
];

runTable({
  describe: 'detectThreshold',
  examples: [
    ...validationCases.map(([name, data, prop, goal, pattern]) => ({
      name: `rejects invalid input: ${name}`,
      inputs: { data, prop, goal },
      check: throws(pattern),
    })),
    {
      name: 'accepts positional arguments',
      inputs: {
        data: KNOWN_DATA,
        prop: 'score',
        goal: defaultGoal,
        preMock: () => {
          reduce.mockResolvedValueOnce(mockReduceResult);
          callLlm.mockResolvedValueOnce(mockLlmResult);
        },
      },
      check: ({ result }) => {
        expect(result).toHaveProperty('thresholdCandidates');
        expect(result).toHaveProperty('distributionAnalysis');
      },
    },
    {
      name: 'wires instruction bundle context into prompts',
      inputs: {
        data: KNOWN_DATA,
        prop: 'score',
        goal: { text: defaultGoal, domain: 'financial risk' },
        preMock: () => {
          reduce.mockResolvedValueOnce(mockReduceResult);
          callLlm.mockResolvedValueOnce(mockLlmResult);
        },
      },
      check: () => {
        const reduceInstructions = reduce.mock.calls[0][1];
        expect(reduceInstructions).toContain('<domain>');
        expect(reduceInstructions).toContain('financial risk');
        expect(reduceInstructions).toContain(defaultGoal);
        const finalPrompt = callLlm.mock.calls[0][0];
        expect(finalPrompt).toContain('<domain>');
        expect(finalPrompt).toContain('financial risk');
      },
    },
    {
      name: 'passes initial accumulator and json_schema responseFormat to reduce',
      inputs: {
        data: KNOWN_DATA,
        prop: 'score',
        goal: defaultGoal,
        preMock: () => {
          reduce.mockResolvedValueOnce(mockReduceResult);
          callLlm.mockResolvedValueOnce(mockLlmResult);
        },
      },
      check: () => {
        const config = reduce.mock.calls[0][2];
        expect(JSON.parse(config.initial)).toEqual({
          observedPatterns: [],
          potentialThresholds: [],
          distributionInsights: [],
        });
        expect(config.responseFormat).toEqual({
          type: 'json_schema',
          json_schema: {
            name: 'analysis_accumulator',
            schema: expect.objectContaining({
              type: 'object',
              required: ['observedPatterns', 'potentialThresholds', 'distributionInsights'],
            }),
          },
        });
      },
    },
    {
      name: 'batches enriched data into groups of 20',
      inputs: {
        data: Array.from({ length: 25 }, (_, i) => ({ score: i + 1 })),
        prop: 'score',
        goal: defaultGoal,
        preMock: () => {
          reduce.mockResolvedValueOnce(mockReduceResult);
          callLlm.mockResolvedValueOnce(mockLlmResult);
        },
      },
      check: () => {
        const dataStrings = reduce.mock.calls[0][0];
        expect(dataStrings).toHaveLength(2);
        const firstBatch = JSON.parse(dataStrings[0]);
        const secondBatch = JSON.parse(dataStrings[1]);
        expect(firstBatch).toHaveLength(20);
        expect(secondBatch).toHaveLength(5);
        expect(firstBatch[0]).toHaveProperty('value');
        expect(firstBatch[0]).toHaveProperty('percentileRank');
        expect(firstBatch[0]).toHaveProperty('context');
      },
    },
    {
      name: 'includes statistics and accumulated analysis in final prompt',
      inputs: {
        data: KNOWN_DATA,
        prop: 'score',
        goal: defaultGoal,
        preMock: () => {
          reduce.mockResolvedValueOnce(mockReduceResult);
          callLlm.mockResolvedValueOnce(mockLlmResult);
        },
      },
      check: () => {
        const prompt = callLlm.mock.calls[0][0];
        expect(prompt).toContain('score');
        expect(prompt).toContain('20 data points');
        expect(prompt).toContain('<goal>');
        expect(prompt).toContain(defaultGoal);
        expect(prompt).toContain('<accumulated-analysis>');
        expect(prompt).toContain('<statistics>');
        expect(prompt).toContain('between 2 and 80');
        const config = callLlm.mock.calls[0][1];
        expect(config.responseFormat).toEqual({
          type: 'json_schema',
          json_schema: {
            name: 'threshold_result',
            schema: expect.objectContaining({ required: ['thresholdCandidates'] }),
          },
        });
      },
    },
    {
      name: 'removes candidates below min',
      inputs: {
        data: KNOWN_DATA,
        prop: 'score',
        goal: defaultGoal,
        preMock: () => {
          reduce.mockResolvedValueOnce(mockReduceResult);
          callLlm.mockResolvedValueOnce({
            thresholdCandidates: [-5, 30].map((value) => mkCandidate({ value })),
          });
        },
      },
      check: ({ result }) => expect(result.thresholdCandidates.map((c) => c.value)).toEqual([30]),
    },
    {
      name: 'removes candidates above max',
      inputs: {
        data: KNOWN_DATA,
        prop: 'score',
        goal: defaultGoal,
        preMock: () => {
          reduce.mockResolvedValueOnce(mockReduceResult);
          callLlm.mockResolvedValueOnce({
            thresholdCandidates: [150, 50].map((value) => mkCandidate({ value })),
          });
        },
      },
      check: ({ result }) => expect(result.thresholdCandidates.map((c) => c.value)).toEqual([50]),
    },
    {
      name: 'removes all out-of-range candidates',
      inputs: {
        data: KNOWN_DATA,
        prop: 'score',
        goal: defaultGoal,
        preMock: () => {
          reduce.mockResolvedValueOnce(mockReduceResult);
          callLlm.mockResolvedValueOnce({
            thresholdCandidates: [-10, 200].map((value) => mkCandidate({ value })),
          });
        },
      },
      check: ({ result }) => expect(result.thresholdCandidates.map((c) => c.value)).toEqual([]),
    },
    {
      name: 'keeps candidates exactly at min and max boundaries',
      inputs: {
        data: KNOWN_DATA,
        prop: 'score',
        goal: defaultGoal,
        preMock: () => {
          reduce.mockResolvedValueOnce(mockReduceResult);
          callLlm.mockResolvedValueOnce({
            thresholdCandidates: [mkCandidate({ value: 2 }), mkCandidate({ value: 80 })],
          });
        },
      },
      check: ({ result }) => {
        expect(result.thresholdCandidates).toHaveLength(2);
        expect(result.thresholdCandidates[0].value).toBe(2);
        expect(result.thresholdCandidates[1].value).toBe(80);
      },
    },
    {
      name: 'throws when LLM response is missing thresholdCandidates',
      inputs: {
        data: KNOWN_DATA,
        prop: 'score',
        goal: defaultGoal,
        preMock: () => {
          reduce.mockResolvedValueOnce(mockReduceResult);
          callLlm.mockResolvedValueOnce({ someOtherField: 'no candidates' });
        },
      },
      check: throws(/missing required "thresholdCandidates"/),
    },
    {
      name: 'overwrites LLM-provided distributionAnalysis with computed statistics',
      inputs: {
        data: KNOWN_DATA,
        prop: 'score',
        goal: defaultGoal,
        preMock: () => {
          reduce.mockResolvedValueOnce(mockReduceResult);
          callLlm.mockResolvedValueOnce({
            thresholdCandidates: [],
            distributionAnalysis: { mean: 999, median: 999, standardDeviation: 999 },
          });
        },
      },
      check: ({ result }) => {
        const expected = calculateStatistics(KNOWN_DATA, 'score');
        expect(result.distributionAnalysis).toEqual({
          mean: expected.mean,
          median: expected.median,
          standardDeviation: expected.stdDev,
          min: expected.min,
          max: expected.max,
          percentiles: expected.percentiles,
          dataPoints: expected.count,
        });
      },
    },
  ],
  process: async ({ data, prop, goal, preMock }) => {
    if (preMock) preMock();
    return detectThreshold(data, prop, goal);
  },
});
