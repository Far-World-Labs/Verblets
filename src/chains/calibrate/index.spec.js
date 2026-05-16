import { vi, beforeEach, expect } from 'vitest';
import calibrateItem, {
  calibrateSpec,
  calibrateInstructions,
  mapCalibrate,
  mapCalibrateParallel,
} from './index.js';
import map from '../map/index.js';
import llm from '../../lib/llm/index.js';
import { runTable, applyMocks } from '../../lib/examples-runner/index.js';

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
      },
      mocks: { llm: [mockSpec] },
      want: {
        value: mockSpec,
        promptContains: [
          '<scan-statistics>',
          '"totalScans": 3',
          '"flaggedScans": 2',
          '"flaggedPercent": 67',
          '"pii-name"',
          '"financial-card"',
        ],
        promptNotContains: ['<classification-instructions>'],
        systemContains: 'calibration specification generator',
      },
    },
    {
      name: 'includes instructions when provided',
      inputs: {
        scans: [makeScan(['pii-name'], [0.9])],
        options: { instructions: 'Classify privacy risk in medical records' },
      },
      mocks: { llm: [mockSpec] },
      want: {
        promptContains: [
          '<classification-instructions>',
          'Classify privacy risk in medical records',
        ],
      },
    },
    {
      name: 'handles empty scans array',
      inputs: { scans: [] },
      mocks: { llm: [mockSpec] },
      want: { promptContains: ['"totalScans": 0', '"flaggedScans": 0', '"flaggedPercent": 0'] },
    },
    {
      name: 'sensitivity=low embeds conservative posture',
      inputs: { scans: [makeScan(['pii-name'], [0.9])], options: { sensitivity: 'low' } },
      mocks: { llm: [mockSpec] },
      want: { promptContains: ['conservative'] },
    },
    {
      name: 'sensitivity=high embeds sensitive posture',
      inputs: { scans: [makeScan(['pii-name'], [0.9])], options: { sensitivity: 'high' } },
      mocks: { llm: [mockSpec] },
      want: { promptContains: ['sensitive'] },
    },
    {
      name: 'no sensitivity → no posture marker',
      inputs: { scans: [makeScan(['pii-name'], [0.9])] },
      mocks: { llm: [mockSpec] },
      want: { promptNotContains: ['Classification posture'] },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { llm });
    return calibrateSpec(inputs.scans, inputs.options);
  },
  expects: ({ result, want }) => {
    if ('value' in want) expect(result).toEqual(want.value);
    const [prompt, options] = vi.mocked(llm).mock.calls[0];
    if (want.promptContains) {
      for (const fragment of want.promptContains) expect(prompt).toContain(fragment);
    }
    if (want.promptNotContains) {
      for (const fragment of want.promptNotContains) {
        expect(prompt).not.toContain(fragment);
      }
    }
    if (want.systemContains) {
      expect(options.systemPrompt).toContain(want.systemContains);
    }
  },
});

runTable({
  describe: 'calibrateInstructions',
  examples: [
    {
      name: 'returns instruction bundle with spec',
      inputs: { spec: mockSpec },
      want: { textContains: 'calibration specification' },
    },
    {
      name: 'passes through additional context keys',
      inputs: { spec: mockSpec, domain: 'medical records' },
      want: { matches: { domain: 'medical records' } },
    },
  ],
  process: ({ inputs }) => calibrateInstructions(inputs),
  expects: ({ result, inputs, want }) => {
    if (want.textContains) {
      expect(result.text).toContain(want.textContains);
      expect(result.spec).toBe(inputs.spec);
    }
    if (want.matches) expect(result).toMatchObject(want.matches);
  },
});

runTable({
  describe: 'calibrateItem',
  examples: [
    {
      name: 'classifies a scan with spec + apply in one call',
      inputs: {
        scan: makeScan(['pii-name', 'financial-card'], [0.9, 0.8]),
        instructions: 'Classify privacy risk',
      },
      mocks: { llm: [mockSpec, mockResult] },
      want: {
        value: mockResult,
        llmCalls: 2,
        nthPromptContains: {
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
      },
      mocks: { llm: [mockResult] },
      want: {
        value: mockResult,
        llmCalls: 1,
        nthPromptContains: { 1: ['<calibration-specification>'] },
      },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { llm });
    return calibrateItem(inputs.scan, inputs.instructions);
  },
  expects: ({ result, want }) => {
    expect(result).toEqual(want.value);
    expect(llm).toHaveBeenCalledTimes(want.llmCalls);
    if (want.nthPromptContains) {
      for (const [n, fragments] of Object.entries(want.nthPromptContains)) {
        const [prompt] = vi.mocked(llm).mock.calls[Number(n) - 1];
        for (const fragment of fragments) expect(prompt).toContain(fragment);
      }
    }
  },
});

runTable({
  describe: 'mapCalibrateParallel',
  examples: [
    {
      name: 'classifies a list of scans, generating spec once',
      inputs: {
        scans: [makeScan(['pii-name'], [0.9]), makeScan(['financial-card'], [0.8])],
        instructions: 'Classify privacy risk',
      },
      mocks: { llm: [mockSpec, mockResult, mockResult] },
      want: {
        value: [mockResult, mockResult],
        llmCalls: 3,
        firstPromptContains: ['"totalScans": 2'],
      },
    },
    {
      name: 'skips spec generation when spec provided in bundle',
      inputs: {
        scans: [makeScan(['pii-name'], [0.9]), makeScan(['pii-name'], [0.7])],
        instructions: { text: 'Classify', spec: mockSpec },
      },
      mocks: { llm: [mockResult, mockResult] },
      want: { value: [mockResult, mockResult], llmCalls: 2 },
    },
    {
      name: 'returns partial outcome when some apply calls fail',
      inputs: {
        scans: [makeScan(['pii-name'], [0.9]), makeScan(['pii-name'], [0.8])],
        instructions: { text: 'x', spec: mockSpec },
        options: { maxAttempts: 1 },
        withEvents: true,
      },
      mocks: { llm: [mockResult, new Error('boom')] },
      want: { value: [mockResult, undefined], outcome: 'partial', failedItems: 1 },
    },
    {
      name: 'throws when all scans fail',
      inputs: {
        scans: [makeScan(['pii-name'], [0.9])],
        instructions: { text: 'x', spec: mockSpec },
        options: { maxAttempts: 1 },
      },
      mocks: { llm: [new Error('boom')] },
      want: { throws: /all 1 scans failed/ },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { llm });
    if (inputs.withEvents) {
      const events = [];
      const value = await mapCalibrateParallel(inputs.scans, inputs.instructions, {
        ...inputs.options,
        onProgress: (e) => events.push(e),
      });
      return { value, events };
    }
    return mapCalibrateParallel(inputs.scans, inputs.instructions, inputs.options);
  },
  expects: ({ result, error, want }) => {
    if (want.throws) {
      expect(error?.message).toMatch(want.throws);
      return;
    }
    if (error) throw error;
    if ('value' in want && !want.outcome) expect(result).toEqual(want.value);
    if ('llmCalls' in want) expect(llm).toHaveBeenCalledTimes(want.llmCalls);
    if (want.firstPromptContains) {
      const prompt = vi.mocked(llm).mock.calls[0][0];
      for (const fragment of want.firstPromptContains) expect(prompt).toContain(fragment);
    }
    if (want.outcome) {
      expect(result.value[0]).toEqual(want.value[0]);
      expect(result.value[1]).toBeUndefined();
      const complete = result.events.find(
        (e) => e.event === 'chain:complete' && e.step === 'calibrate:parallel'
      );
      expect(complete).toMatchObject({
        outcome: want.outcome,
        ...(want.failedItems !== undefined && { failedItems: want.failedItems }),
      });
    }
  },
});

runTable({
  describe: 'mapCalibrate',
  examples: [
    {
      name: 'routes through the map chain with the batch responseFormat',
      inputs: {
        scans: [makeScan(['pii-name'], [0.9]), makeScan(['pii-name'], [0.8])],
        instructions: { text: 'x', spec: mockSpec },
      },
      mocks: { map: [[mockResult, mockResult]] },
      want: { value: [mockResult, mockResult], schemaName: 'calibrate_batch' },
    },
    {
      name: 'generates spec once when not bundled',
      inputs: { scans: [makeScan(['pii-name'], [0.9])], instructions: 'classify privacy risk' },
      mocks: { llm: [mockSpec], map: [[mockResult]] },
      want: { llmCalls: 1, mapInstructionsContains: '<calibration-specification>' },
    },
    {
      name: 'reports partial outcome when map returns undefined slots',
      inputs: {
        scans: [makeScan(['pii-name'], [0.9]), makeScan(['pii-name'], [0.8])],
        instructions: { text: 'x', spec: mockSpec },
        withEvents: true,
      },
      mocks: { map: [[mockResult, undefined]] },
      want: { value: [mockResult, undefined], outcome: 'partial' },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { llm, map });
    if (inputs.withEvents) {
      const events = [];
      const value = await mapCalibrate(inputs.scans, inputs.instructions, {
        onProgress: (e) => events.push(e),
      });
      return { value, events };
    }
    return mapCalibrate(inputs.scans, inputs.instructions);
  },
  expects: ({ result, want }) => {
    if ('value' in want && !want.outcome) expect(result).toEqual(want.value);
    if ('llmCalls' in want) expect(llm).toHaveBeenCalledTimes(want.llmCalls);
    if (want.schemaName) {
      const mapConfig = vi.mocked(map).mock.calls[0][2];
      expect(mapConfig.responseFormat?.json_schema?.name).toBe(want.schemaName);
    }
    if (want.mapInstructionsContains) {
      expect(vi.mocked(map).mock.calls[0][1]).toContain(want.mapInstructionsContains);
    }
    if (want.outcome) {
      expect(result.value[0]).toEqual(want.value[0]);
      expect(result.value[1]).toBeUndefined();
      const complete = result.events.find(
        (e) => e.event === 'chain:complete' && e.step === 'calibrate:map'
      );
      expect(complete.outcome).toBe(want.outcome);
    }
  },
});
