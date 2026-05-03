import { vi, beforeEach, expect } from 'vitest';
import calibrateItem, {
  calibrateSpec,
  calibrateInstructions,
  mapCalibrate,
  mapCalibrateParallel,
} from './index.js';
import map from '../map/index.js';
import llm from '../../lib/llm/index.js';
import { runTable, equals, partial, all, throws } from '../../lib/examples-runner/index.js';

vi.mock('../../lib/llm/index.js', async (importOriginal) => ({
  ...(await importOriginal()),
  default: vi.fn(),
}));

vi.mock('../../lib/parallel-batch/index.js', () => ({
  default: vi.fn(async (items, processor) => {
    for (let i = 0; i < items.length; i++) await processor(items[i], i);
  }),
}));

vi.mock('../map/index.js', () => ({ default: vi.fn() }));

const mockSpec = {
  corpusProfile: 'Mixed PII and financial data across 3 documents',
  classificationCriteria: 'Critical for government IDs and credentials, high for financial',
  salienceCriteria: 'Exceptional if multiple critical categories co-occur',
  categoryNotes: 'pii-name appears in 80% of scans — routine baseline',
};

const mockResult = {
  severity: 'high',
  salience: 'notable',
  categories: {
    'pii-name': { severity: 'medium', salience: 'routine' },
    'financial-card': { severity: 'critical', salience: 'notable' },
  },
  summary: 'Contains PII names (routine) plus a payment card number (notable for this corpus)',
};

const makeScan = (categories, scores) => ({
  flagged: categories.length > 0,
  hits: categories.map((category, i) => ({
    category,
    label: category,
    score: scores[i],
    chunk: { text: 'test', start: 0, end: 4 },
  })),
});

beforeEach(() => vi.clearAllMocks());

// ─── calibrateSpec ────────────────────────────────────────────────────────

const calibrateSpecExamples = [
  {
    name: 'computes statistics from scans and passes to LLM with schema',
    inputs: {
      scans: [
        makeScan(['pii-name', 'financial-card'], [0.9, 0.8]),
        makeScan(['pii-name'], [0.7]),
        makeScan([], []),
      ],
      preMock: () => vi.mocked(llm).mockResolvedValueOnce(mockSpec),
    },
    check: all(equals(mockSpec), () => {
      const [prompt, options] = vi.mocked(llm).mock.calls[0];
      expect(prompt).toContain('<scan-statistics>');
      expect(prompt).toContain('"totalScans": 3');
      expect(prompt).toContain('"flaggedScans": 2');
      expect(prompt).toContain('"flaggedPercent": 67');
      expect(prompt).toContain('"pii-name"');
      expect(prompt).toContain('"financial-card"');
      expect(prompt).not.toContain('<classification-instructions>');
      expect(options.systemPrompt).toContain('calibration specification generator');
    }),
  },
  {
    name: 'includes instructions when provided',
    inputs: {
      scans: [makeScan(['pii-name'], [0.9])],
      options: { instructions: 'Classify privacy risk in medical records' },
      preMock: () => vi.mocked(llm).mockResolvedValueOnce(mockSpec),
    },
    check: () => {
      const [prompt] = vi.mocked(llm).mock.calls[0];
      expect(prompt).toContain('<classification-instructions>');
      expect(prompt).toContain('Classify privacy risk in medical records');
    },
  },
  {
    name: 'handles empty scans array',
    inputs: { scans: [], preMock: () => vi.mocked(llm).mockResolvedValueOnce(mockSpec) },
    check: () => {
      const [prompt] = vi.mocked(llm).mock.calls[0];
      expect(prompt).toContain('"totalScans": 0');
      expect(prompt).toContain('"flaggedScans": 0');
      expect(prompt).toContain('"flaggedPercent": 0');
    },
  },
  {
    name: 'sensitivity posture markers',
    vary: {
      sensitivity: [
        { value: 'low', marker: 'conservative', shouldContain: true },
        { value: 'high', marker: 'sensitive', shouldContain: true },
        { value: undefined, marker: 'Classification posture', shouldContain: false },
      ],
    },
    inputs: ({ sensitivity }) => ({
      scans: [makeScan(['pii-name'], [0.9])],
      options: sensitivity.value ? { sensitivity: sensitivity.value } : undefined,
      preMock: () => vi.mocked(llm).mockResolvedValueOnce(mockSpec),
      _expectation: sensitivity,
    }),
    check: ({ inputs }) => {
      const [prompt] = vi.mocked(llm).mock.calls[0];
      const { marker, shouldContain } = inputs._expectation;
      if (shouldContain) expect(prompt).toContain(marker);
      else expect(prompt).not.toContain(marker);
    },
  },
];

runTable({
  describe: 'calibrateSpec',
  examples: calibrateSpecExamples,
  process: async ({ scans, options, preMock }) => {
    if (preMock) preMock();
    return calibrateSpec(scans, options);
  },
});

// ─── calibrateInstructions ────────────────────────────────────────────────

runTable({
  describe: 'calibrateInstructions',
  examples: [
    {
      name: 'returns instruction bundle with spec',
      inputs: { spec: mockSpec },
      check: ({ result, inputs }) => {
        expect(result.text).toContain('calibration specification');
        expect(result.spec).toBe(inputs.spec);
      },
    },
    {
      name: 'passes through additional context keys',
      inputs: { spec: mockSpec, domain: 'medical records' },
      check: partial({ domain: 'medical records' }),
    },
  ],
  process: (params) => calibrateInstructions(params),
});

// ─── calibrateItem ────────────────────────────────────────────────────────

runTable({
  describe: 'calibrateItem',
  examples: [
    {
      name: 'classifies a scan with spec + apply in one call',
      inputs: {
        scan: makeScan(['pii-name', 'financial-card'], [0.9, 0.8]),
        instructions: 'Classify privacy risk',
        preMock: () =>
          vi.mocked(llm).mockResolvedValueOnce(mockSpec).mockResolvedValueOnce(mockResult),
      },
      check: all(equals(mockResult), () => {
        expect(llm).toHaveBeenCalledTimes(2);
        const [specPrompt] = vi.mocked(llm).mock.calls[0];
        expect(specPrompt).toContain('<classification-instructions>');
        expect(specPrompt).toContain('Classify privacy risk');
        const [applyPrompt] = vi.mocked(llm).mock.calls[1];
        expect(applyPrompt).toContain('<calibration-specification>');
        expect(applyPrompt).toContain('<scan-result>');
      }),
    },
    {
      name: 'skips spec generation when spec provided via instruction bundle',
      inputs: {
        scan: makeScan(['pii-name'], [0.9]),
        instructions: { text: 'Classify', spec: mockSpec },
        preMock: () => vi.mocked(llm).mockResolvedValueOnce(mockResult),
      },
      check: all(equals(mockResult), () => {
        expect(llm).toHaveBeenCalledTimes(1);
        const [applyPrompt] = vi.mocked(llm).mock.calls[0];
        expect(applyPrompt).toContain('<calibration-specification>');
      }),
    },
  ],
  process: async ({ scan, instructions, preMock }) => {
    if (preMock) preMock();
    return calibrateItem(scan, instructions);
  },
});

// ─── mapCalibrateParallel ─────────────────────────────────────────────────

runTable({
  describe: 'mapCalibrateParallel',
  examples: [
    {
      name: 'classifies a list of scans, generating spec once',
      inputs: {
        scans: [makeScan(['pii-name'], [0.9]), makeScan(['financial-card'], [0.8])],
        instructions: 'Classify privacy risk',
        preMock: () =>
          vi
            .mocked(llm)
            .mockResolvedValueOnce(mockSpec)
            .mockResolvedValueOnce(mockResult)
            .mockResolvedValueOnce(mockResult),
      },
      check: all(equals([mockResult, mockResult]), () => {
        expect(llm).toHaveBeenCalledTimes(3);
        expect(vi.mocked(llm).mock.calls[0][0]).toContain('"totalScans": 2');
      }),
    },
    {
      name: 'skips spec generation when spec provided in bundle',
      inputs: {
        scans: [makeScan(['pii-name'], [0.9]), makeScan(['pii-name'], [0.7])],
        instructions: { text: 'Classify', spec: mockSpec },
        preMock: () =>
          vi.mocked(llm).mockResolvedValueOnce(mockResult).mockResolvedValueOnce(mockResult),
      },
      check: all(equals([mockResult, mockResult]), () => expect(llm).toHaveBeenCalledTimes(2)),
    },
    {
      name: 'returns partial outcome when some apply calls fail',
      inputs: {
        scans: [makeScan(['pii-name'], [0.9]), makeScan(['pii-name'], [0.8])],
        instructions: { text: 'x', spec: mockSpec },
        options: { maxAttempts: 1 },
        withEvents: true,
        preMock: () =>
          vi.mocked(llm).mockResolvedValueOnce(mockResult).mockRejectedValueOnce(new Error('boom')),
      },
      check: ({ result }) => {
        expect(result.value[0]).toEqual(mockResult);
        expect(result.value[1]).toBeUndefined();
        const complete = result.events.find(
          (e) => e.event === 'chain:complete' && e.step === 'calibrate:parallel'
        );
        expect(complete).toMatchObject({ outcome: 'partial', failedItems: 1 });
      },
    },
    {
      name: 'throws when all scans fail',
      inputs: {
        scans: [makeScan(['pii-name'], [0.9])],
        instructions: { text: 'x', spec: mockSpec },
        options: { maxAttempts: 1 },
        preMock: () => vi.mocked(llm).mockRejectedValue(new Error('boom')),
      },
      check: throws(/all 1 scans failed/),
    },
  ],
  process: async ({ scans, instructions, options, preMock, withEvents }) => {
    if (preMock) preMock();
    if (withEvents) {
      const events = [];
      const value = await mapCalibrateParallel(scans, instructions, {
        ...options,
        onProgress: (e) => events.push(e),
      });
      return { value, events };
    }
    return mapCalibrateParallel(scans, instructions, options);
  },
});

// ─── mapCalibrate ─────────────────────────────────────────────────────────

runTable({
  describe: 'mapCalibrate',
  examples: [
    {
      name: 'routes through the map chain with the batch responseFormat',
      inputs: {
        scans: [makeScan(['pii-name'], [0.9]), makeScan(['pii-name'], [0.8])],
        instructions: { text: 'x', spec: mockSpec },
        preMock: () => vi.mocked(map).mockResolvedValueOnce([mockResult, mockResult]),
      },
      check: all(equals([mockResult, mockResult]), () => {
        const mapConfig = vi.mocked(map).mock.calls[0][2];
        expect(mapConfig.responseFormat?.json_schema?.name).toBe('calibrate_batch');
      }),
    },
    {
      name: 'generates spec once when not bundled',
      inputs: {
        scans: [makeScan(['pii-name'], [0.9])],
        instructions: 'classify privacy risk',
        preMock: () => {
          vi.mocked(llm).mockResolvedValueOnce(mockSpec);
          vi.mocked(map).mockResolvedValueOnce([mockResult]);
        },
      },
      check: () => {
        expect(llm).toHaveBeenCalledTimes(1);
        expect(vi.mocked(map).mock.calls[0][1]).toContain('<calibration-specification>');
      },
    },
    {
      name: 'reports partial outcome when map returns undefined slots',
      inputs: {
        scans: [makeScan(['pii-name'], [0.9]), makeScan(['pii-name'], [0.8])],
        instructions: { text: 'x', spec: mockSpec },
        withEvents: true,
        preMock: () => vi.mocked(map).mockResolvedValueOnce([mockResult, undefined]),
      },
      check: ({ result }) => {
        expect(result.value[0]).toEqual(mockResult);
        expect(result.value[1]).toBeUndefined();
        const complete = result.events.find(
          (e) => e.event === 'chain:complete' && e.step === 'calibrate:map'
        );
        expect(complete.outcome).toBe('partial');
      },
    },
  ],
  process: async ({ scans, instructions, preMock, withEvents }) => {
    if (preMock) preMock();
    if (withEvents) {
      const events = [];
      const value = await mapCalibrate(scans, instructions, {
        onProgress: (e) => events.push(e),
      });
      return { value, events };
    }
    return mapCalibrate(scans, instructions);
  },
});
