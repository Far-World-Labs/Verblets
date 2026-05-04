import { vi, beforeEach, expect } from 'vitest';
import calibrateItem, {
  calibrateSpec,
  calibrateInstructions,
  mapCalibrate,
  mapCalibrateParallel,
} from './index.js';
import map from '../map/index.js';
import llm from '../../lib/llm/index.js';
import { runTable } from '../../lib/examples-runner/index.js';

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

// ─── calibrateSpec ───────────────────────────────────────────────────────

runTable({
  describe: 'calibrateSpec',
  examples: [
    {
      name: 'computes statistics from scans and passes to LLM with schema',
      inputs: {
        scans: [
          makeScan(['pii-name', 'financial-card'], [0.9, 0.8]),
          makeScan(['pii-name'], [0.7]),
          makeScan([], []),
        ],
        mock: () => vi.mocked(llm).mockResolvedValueOnce(mockSpec),
        want: mockSpec,
        wantPromptContains: [
          '<scan-statistics>',
          '"totalScans": 3',
          '"flaggedScans": 2',
          '"flaggedPercent": 67',
          '"pii-name"',
          '"financial-card"',
        ],
        wantPromptNotContains: ['<classification-instructions>'],
        wantSystemContains: 'calibration specification generator',
      },
    },
    {
      name: 'includes instructions when provided',
      inputs: {
        scans: [makeScan(['pii-name'], [0.9])],
        options: { instructions: 'Classify privacy risk in medical records' },
        mock: () => vi.mocked(llm).mockResolvedValueOnce(mockSpec),
        wantPromptContains: [
          '<classification-instructions>',
          'Classify privacy risk in medical records',
        ],
      },
    },
    {
      name: 'handles empty scans array',
      inputs: {
        scans: [],
        mock: () => vi.mocked(llm).mockResolvedValueOnce(mockSpec),
        wantPromptContains: ['"totalScans": 0', '"flaggedScans": 0', '"flaggedPercent": 0'],
      },
    },
    {
      name: 'sensitivity=low embeds conservative posture',
      inputs: {
        scans: [makeScan(['pii-name'], [0.9])],
        options: { sensitivity: 'low' },
        mock: () => vi.mocked(llm).mockResolvedValueOnce(mockSpec),
        wantPromptContains: ['conservative'],
      },
    },
    {
      name: 'sensitivity=high embeds sensitive posture',
      inputs: {
        scans: [makeScan(['pii-name'], [0.9])],
        options: { sensitivity: 'high' },
        mock: () => vi.mocked(llm).mockResolvedValueOnce(mockSpec),
        wantPromptContains: ['sensitive'],
      },
    },
    {
      name: 'no sensitivity → no posture marker',
      inputs: {
        scans: [makeScan(['pii-name'], [0.9])],
        mock: () => vi.mocked(llm).mockResolvedValueOnce(mockSpec),
        wantPromptNotContains: ['Classification posture'],
      },
    },
  ],
  process: async ({ scans, options, mock }) => {
    if (mock) mock();
    return calibrateSpec(scans, options);
  },
  expects: ({ result, inputs }) => {
    if ('want' in inputs) expect(result).toEqual(inputs.want);
    const [prompt, options] = vi.mocked(llm).mock.calls[0];
    if (inputs.wantPromptContains) {
      for (const fragment of inputs.wantPromptContains) expect(prompt).toContain(fragment);
    }
    if (inputs.wantPromptNotContains) {
      for (const fragment of inputs.wantPromptNotContains) {
        expect(prompt).not.toContain(fragment);
      }
    }
    if (inputs.wantSystemContains) {
      expect(options.systemPrompt).toContain(inputs.wantSystemContains);
    }
  },
});

// ─── calibrateInstructions ───────────────────────────────────────────────

runTable({
  describe: 'calibrateInstructions',
  examples: [
    {
      name: 'returns instruction bundle with spec',
      inputs: { spec: mockSpec, wantTextContains: 'calibration specification' },
    },
    {
      name: 'passes through additional context keys',
      inputs: { spec: mockSpec, domain: 'medical records', want: { domain: 'medical records' } },
    },
  ],
  process: (params) => calibrateInstructions(params),
  expects: ({ result, inputs }) => {
    if (inputs.wantTextContains) {
      expect(result.text).toContain(inputs.wantTextContains);
      expect(result.spec).toBe(inputs.spec);
    }
    if ('want' in inputs) expect(result).toMatchObject(inputs.want);
  },
});

// ─── calibrateItem ───────────────────────────────────────────────────────

runTable({
  describe: 'calibrateItem',
  examples: [
    {
      name: 'classifies a scan with spec + apply in one call',
      inputs: {
        scan: makeScan(['pii-name', 'financial-card'], [0.9, 0.8]),
        instructions: 'Classify privacy risk',
        mock: () =>
          vi.mocked(llm).mockResolvedValueOnce(mockSpec).mockResolvedValueOnce(mockResult),
        want: mockResult,
        wantLlmCalls: 2,
        wantNthPromptContains: {
          1: ['<classification-instructions>', 'Classify privacy risk'],
          2: ['<calibration-specification>', '<scan-result>'],
        },
      },
    },
    {
      name: 'skips spec generation when spec provided via instruction bundle',
      inputs: {
        scan: makeScan(['pii-name'], [0.9]),
        instructions: { text: 'Classify', spec: mockSpec },
        mock: () => vi.mocked(llm).mockResolvedValueOnce(mockResult),
        want: mockResult,
        wantLlmCalls: 1,
        wantNthPromptContains: { 1: ['<calibration-specification>'] },
      },
    },
  ],
  process: async ({ scan, instructions, mock }) => {
    if (mock) mock();
    return calibrateItem(scan, instructions);
  },
  expects: ({ result, inputs }) => {
    expect(result).toEqual(inputs.want);
    expect(llm).toHaveBeenCalledTimes(inputs.wantLlmCalls);
    if (inputs.wantNthPromptContains) {
      for (const [n, fragments] of Object.entries(inputs.wantNthPromptContains)) {
        const [prompt] = vi.mocked(llm).mock.calls[Number(n) - 1];
        for (const fragment of fragments) expect(prompt).toContain(fragment);
      }
    }
  },
});

// ─── mapCalibrateParallel ────────────────────────────────────────────────

runTable({
  describe: 'mapCalibrateParallel',
  examples: [
    {
      name: 'classifies a list of scans, generating spec once',
      inputs: {
        scans: [makeScan(['pii-name'], [0.9]), makeScan(['financial-card'], [0.8])],
        instructions: 'Classify privacy risk',
        mock: () =>
          vi
            .mocked(llm)
            .mockResolvedValueOnce(mockSpec)
            .mockResolvedValueOnce(mockResult)
            .mockResolvedValueOnce(mockResult),
        want: [mockResult, mockResult],
        wantLlmCalls: 3,
        wantFirstPromptContains: ['"totalScans": 2'],
      },
    },
    {
      name: 'skips spec generation when spec provided in bundle',
      inputs: {
        scans: [makeScan(['pii-name'], [0.9]), makeScan(['pii-name'], [0.7])],
        instructions: { text: 'Classify', spec: mockSpec },
        mock: () =>
          vi.mocked(llm).mockResolvedValueOnce(mockResult).mockResolvedValueOnce(mockResult),
        want: [mockResult, mockResult],
        wantLlmCalls: 2,
      },
    },
    {
      name: 'returns partial outcome when some apply calls fail',
      inputs: {
        scans: [makeScan(['pii-name'], [0.9]), makeScan(['pii-name'], [0.8])],
        instructions: { text: 'x', spec: mockSpec },
        options: { maxAttempts: 1 },
        withEvents: true,
        mock: () =>
          vi.mocked(llm).mockResolvedValueOnce(mockResult).mockRejectedValueOnce(new Error('boom')),
        wantValue: [mockResult, undefined],
        wantOutcome: 'partial',
        wantFailedItems: 1,
      },
    },
    {
      name: 'throws when all scans fail',
      inputs: {
        scans: [makeScan(['pii-name'], [0.9])],
        instructions: { text: 'x', spec: mockSpec },
        options: { maxAttempts: 1 },
        mock: () => vi.mocked(llm).mockRejectedValue(new Error('boom')),
        throws: /all 1 scans failed/,
      },
    },
  ],
  process: async ({ scans, instructions, options, mock, withEvents }) => {
    if (mock) mock();
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
  expects: ({ result, error, inputs }) => {
    if ('throws' in inputs) {
      expect(error?.message).toMatch(inputs.throws);
      return;
    }
    if (error) throw error;
    if ('want' in inputs) expect(result).toEqual(inputs.want);
    if ('wantLlmCalls' in inputs) expect(llm).toHaveBeenCalledTimes(inputs.wantLlmCalls);
    if (inputs.wantFirstPromptContains) {
      const prompt = vi.mocked(llm).mock.calls[0][0];
      for (const fragment of inputs.wantFirstPromptContains) expect(prompt).toContain(fragment);
    }
    if (inputs.wantValue) {
      expect(result.value[0]).toEqual(inputs.wantValue[0]);
      expect(result.value[1]).toBeUndefined();
    }
    if (inputs.wantOutcome) {
      const complete = result.events.find(
        (e) => e.event === 'chain:complete' && e.step === 'calibrate:parallel'
      );
      expect(complete).toMatchObject({
        outcome: inputs.wantOutcome,
        ...(inputs.wantFailedItems !== undefined && { failedItems: inputs.wantFailedItems }),
      });
    }
  },
});

// ─── mapCalibrate ────────────────────────────────────────────────────────

runTable({
  describe: 'mapCalibrate',
  examples: [
    {
      name: 'routes through the map chain with the batch responseFormat',
      inputs: {
        scans: [makeScan(['pii-name'], [0.9]), makeScan(['pii-name'], [0.8])],
        instructions: { text: 'x', spec: mockSpec },
        mock: () => vi.mocked(map).mockResolvedValueOnce([mockResult, mockResult]),
        want: [mockResult, mockResult],
        wantSchemaName: 'calibrate_batch',
      },
    },
    {
      name: 'generates spec once when not bundled',
      inputs: {
        scans: [makeScan(['pii-name'], [0.9])],
        instructions: 'classify privacy risk',
        mock: () => {
          vi.mocked(llm).mockResolvedValueOnce(mockSpec);
          vi.mocked(map).mockResolvedValueOnce([mockResult]);
        },
        wantLlmCalls: 1,
        wantMapInstructionsContains: '<calibration-specification>',
      },
    },
    {
      name: 'reports partial outcome when map returns undefined slots',
      inputs: {
        scans: [makeScan(['pii-name'], [0.9]), makeScan(['pii-name'], [0.8])],
        instructions: { text: 'x', spec: mockSpec },
        withEvents: true,
        mock: () => vi.mocked(map).mockResolvedValueOnce([mockResult, undefined]),
        wantValue: [mockResult, undefined],
        wantOutcome: 'partial',
      },
    },
  ],
  process: async ({ scans, instructions, mock, withEvents }) => {
    if (mock) mock();
    if (withEvents) {
      const events = [];
      const value = await mapCalibrate(scans, instructions, {
        onProgress: (e) => events.push(e),
      });
      return { value, events };
    }
    return mapCalibrate(scans, instructions);
  },
  expects: ({ result, inputs }) => {
    if ('want' in inputs) expect(result).toEqual(inputs.want);
    if ('wantLlmCalls' in inputs) expect(llm).toHaveBeenCalledTimes(inputs.wantLlmCalls);
    if (inputs.wantSchemaName) {
      const mapConfig = vi.mocked(map).mock.calls[0][2];
      expect(mapConfig.responseFormat?.json_schema?.name).toBe(inputs.wantSchemaName);
    }
    if (inputs.wantMapInstructionsContains) {
      expect(vi.mocked(map).mock.calls[0][1]).toContain(inputs.wantMapInstructionsContains);
    }
    if (inputs.wantValue) {
      expect(result.value[0]).toEqual(inputs.wantValue[0]);
      expect(result.value[1]).toBeUndefined();
    }
    if (inputs.wantOutcome) {
      const complete = result.events.find(
        (e) => e.event === 'chain:complete' && e.step === 'calibrate:map'
      );
      expect(complete.outcome).toBe(inputs.wantOutcome);
    }
  },
});
