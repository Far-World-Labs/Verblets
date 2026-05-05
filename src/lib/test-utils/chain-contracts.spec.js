import { beforeEach, expect, vi } from 'vitest';
import { runTable, applyMocks } from '../examples-runner/index.js';

// ==========================================
// Centralized Chain Interface Contract Tests
// ==========================================
//
// Stress-test files in /tmp historically asserted the same cross-cutting
// concerns over and over per chain: knownTexts shape, chain:start/complete
// emission on success, chain:error emission on LLM failure, instruction
// bundle acceptance, and known-key skip. This spec folds those interface
// contracts into example-based table-driven tests across a small set of
// representative chains spanning the four common shapes:
//
//   - single LLM call           → date
//   - two-pass (spec + apply)   → calibrate
//   - batched list processing   → map
//   - parallel multi-strategy   → veiled-variants
//
// Each row is a self-describing example: { name, inputs, mocks, want }.
// Chain-specific behavior belongs in each chain's own spec.
// ==========================================

vi.mock('../llm/index.js', async (importOriginal) => ({
  ...(await importOriginal()),
  default: vi.fn(),
}));

vi.mock('../retry/index.js', () => ({
  default: vi.fn(async (fn) => fn()),
}));

vi.mock('../parallel-batch/index.js', () => ({
  default: vi.fn(async (items, processor) => {
    const out = [];
    for (let i = 0; i < items.length; i++) out.push(await processor(items[i], i));
    return out;
  }),
}));

vi.mock('../text-batch/index.js', () => ({
  default: vi.fn((list, config) => {
    const size = config?.batchSize || list.length;
    const batches = [];
    for (let i = 0; i < list.length; i += size) {
      batches.push({ items: list.slice(i, i + size), startIndex: i });
    }
    return batches;
  }),
}));

vi.mock('../../verblets/bool/index.js', () => ({ default: vi.fn() }));

vi.mock('../../verblets/list-batch/index.js', () => ({
  default: vi.fn(),
  ListStyle: { AUTO: 'auto', XML: 'xml', NEWLINE: 'newline' },
  determineStyle: vi.fn(() => 'newline'),
}));

const callLlm = (await import('../llm/index.js')).default;
const bool = (await import('../../verblets/bool/index.js')).default;
const listBatch = (await import('../../verblets/list-batch/index.js')).default;

const date = (await import('../../chains/date/index.js')).default;
const calibrate = (await import('../../chains/calibrate/index.js')).default;
const map = (await import('../../chains/map/index.js')).default;
const veiledVariants = (await import('../../chains/veiled-variants/index.js')).default;

const mockRegistry = { callLlm, bool, listBatch };

const makeScan = (categories = []) => ({
  flagged: categories.length > 0,
  hits: categories.map((category) => ({
    category,
    score: 0.7,
    chunk: { text: 't', start: 0, end: 1 },
  })),
});

const calibrateSpec = {
  corpusProfile: 'mixed',
  classificationCriteria: 'critical for credentials',
  salienceCriteria: 'exceptional when stacked',
  categoryNotes: 'pii common',
};

const calibrateResult = {
  severity: 'high',
  salience: 'notable',
  categories: { pii: { severity: 'medium', salience: 'routine' } },
  summary: 'Contains PII',
};

// Per-chain glue — kept separate from the example rows so the rows stay
// pure data ({ inputs, mocks, want }). The `kind` discriminator on each row
// looks up its harness here.
const harness = {
  date: {
    fn: date,
    step: 'date',
    expectedKnownTexts: [],
    invoke: (config) => date('March 5 2024', { rigor: 'low', ...config }),
    invokeWith: (instructions, config) => date(instructions, { rigor: 'low', ...config }),
    findInPrompts: (marker) =>
      callLlm.mock.calls.some(([p]) => typeof p === 'string' && p.includes(marker)),
    llmCallsite: () => callLlm,
    llmCallsiteConfigArg: 1,
  },
  calibrate: {
    fn: calibrate,
    step: 'calibrate',
    expectedKnownTexts: ['spec'],
    invoke: (config) => calibrate(makeScan(['pii']), 'classify', config),
    invokeWith: (instructions, config) => calibrate(makeScan(['pii']), instructions, config),
    findInPrompts: (marker) =>
      callLlm.mock.calls.some(([p]) => typeof p === 'string' && p.includes(marker)),
    invokeWithKnownKey: (config) =>
      calibrate(makeScan(['pii']), { text: 'classify', spec: calibrateSpec }, config),
    llmCallsite: () => callLlm,
    llmCallsiteConfigArg: 1,
  },
  map: {
    fn: map,
    step: 'map',
    expectedKnownTexts: [],
    invoke: (config) => map(['a'], 'transform', { batchSize: 1, ...config }),
    invokeWith: (instructions, config) => map(['a'], instructions, { batchSize: 1, ...config }),
    findInPrompts: (marker) =>
      listBatch.mock.calls.some(([, p]) => typeof p === 'string' && p.includes(marker)),
    llmCallsite: () => listBatch,
    llmCallsiteConfigArg: 2,
  },
  'veiled-variants': {
    fn: veiledVariants,
    step: 'veiled-variants',
    expectedKnownTexts: [],
    invoke: (config) => veiledVariants('test prompt', { coverage: 'low', ...config }),
    invokeWith: (instructions, config) =>
      veiledVariants(instructions, { coverage: 'low', ...config }),
    findInPrompts: (marker) =>
      callLlm.mock.calls.some(([p]) => typeof p === 'string' && p.includes(marker)),
    llmCallsite: () => callLlm,
    llmCallsiteConfigArg: 1,
  },
};

beforeEach(() => {
  vi.resetAllMocks();
});

// ─── 1. knownTexts shape ─────────────────────────────────────────────────

runTable({
  describe: 'chain interface — knownTexts shape',
  examples: [
    { name: 'date', inputs: { kind: 'date' }, want: { knownTexts: [] } },
    { name: 'calibrate', inputs: { kind: 'calibrate' }, want: { knownTexts: ['spec'] } },
    { name: 'map', inputs: { kind: 'map' }, want: { knownTexts: [] } },
    { name: 'veiled-variants', inputs: { kind: 'veiled-variants' }, want: { knownTexts: [] } },
  ],
  process: ({ inputs }) => harness[inputs.kind].fn.knownTexts,
  expects: ({ result, want }) => {
    expect(Array.isArray(result)).toBe(true);
    for (const key of result) expect(typeof key).toBe('string');
    expect(result).toEqual(want.knownTexts);
  },
});

// ─── 2. Success lifecycle emits chain:start + chain:complete ────────────

runTable({
  describe: 'chain interface — success lifecycle',
  examples: [
    {
      name: 'date',
      inputs: { kind: 'date' },
      mocks: { callLlm: ['2024-03-05'], bool: [true] },
      want: { step: 'date' },
    },
    {
      name: 'calibrate',
      inputs: { kind: 'calibrate' },
      mocks: { callLlm: [calibrateSpec, calibrateResult] },
      want: { step: 'calibrate' },
    },
    {
      name: 'map',
      inputs: { kind: 'map' },
      mocks: { listBatch: [['a-x']] },
      want: { step: 'map' },
    },
    {
      name: 'veiled-variants',
      inputs: { kind: 'veiled-variants' },
      mocks: { callLlm: [['a', 'b', 'c']] },
      want: { step: 'veiled-variants' },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, mockRegistry);
    const events = [];
    await harness[inputs.kind].invoke({ onProgress: (e) => events.push(e) });
    return events;
  },
  expects: ({ result, want }) => {
    const start = result.find((e) => e.step === want.step && e.event === 'chain:start');
    const complete = result.find((e) => e.step === want.step && e.event === 'chain:complete');
    expect(start).toBeDefined();
    expect(complete).toBeDefined();
  },
});

// ─── 3. Failure lifecycle emits chain:error ─────────────────────────────

const llmFailure = new Error('LLM failure');

runTable({
  describe: 'chain interface — failure lifecycle',
  examples: [
    {
      name: 'date',
      inputs: { kind: 'date' },
      mocks: { callLlm: [llmFailure] },
      want: { step: 'date' },
    },
    {
      name: 'calibrate',
      inputs: { kind: 'calibrate' },
      mocks: { callLlm: [llmFailure] },
      want: { step: 'calibrate' },
    },
    {
      name: 'map',
      inputs: { kind: 'map' },
      mocks: { listBatch: [llmFailure] },
      want: { step: 'map' },
    },
    {
      name: 'veiled-variants',
      inputs: { kind: 'veiled-variants' },
      mocks: { callLlm: [llmFailure] },
      want: { step: 'veiled-variants' },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, mockRegistry);
    const events = [];
    let error;
    try {
      await harness[inputs.kind].invoke({
        onProgress: (e) => events.push(e),
        maxAttempts: 1,
      });
    } catch (e) {
      error = e;
    }
    return { events, error };
  },
  expects: ({ result, want }) => {
    // Contract: rejects with an Error (the message may be aggregated or
    // wrapped by chains that batch — that's chain-specific).
    expect(result.error).toBeInstanceOf(Error);
    const errorEvent = result.events.find((e) => e.step === want.step && e.event === 'chain:error');
    expect(errorEvent).toBeDefined();
  },
});

// ─── 4. Instruction bundle accepted in place of string ──────────────────

const contextMarker = 'context-marker-2c8e1f';

runTable({
  describe: 'chain interface — instruction bundle accepted in place of string',
  examples: [
    {
      name: 'date',
      inputs: { kind: 'date' },
      mocks: { callLlm: ['2024-03-05', '2024-03-05'], bool: [true] },
      want: { contextEmbedded: true },
    },
    {
      name: 'calibrate',
      inputs: { kind: 'calibrate' },
      mocks: { callLlm: [calibrateSpec, calibrateResult] },
      want: { contextEmbedded: true },
    },
    {
      name: 'map',
      inputs: { kind: 'map' },
      mocks: { listBatch: [['a-x']] },
      want: { contextEmbedded: true },
    },
    {
      name: 'veiled-variants',
      inputs: { kind: 'veiled-variants' },
      mocks: { callLlm: [['a', 'b', 'c']] },
      want: { contextEmbedded: true },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, mockRegistry);
    await harness[inputs.kind].invokeWith(
      { text: 'instruction text', extraContext: contextMarker },
      {}
    );
    return harness[inputs.kind].findInPrompts(contextMarker);
  },
  expects: ({ result, want }) => {
    expect(result).toBe(want.contextEmbedded);
  },
});

// ─── 5. Known-text bundle key skips its derivation call ─────────────────

runTable({
  describe: 'chain interface — known-text bundle key skips its derivation call',
  examples: [
    {
      name: 'calibrate (spec)',
      inputs: { kind: 'calibrate', knownKey: 'spec' },
      mocks: { callLlm: [calibrateResult] },
      want: { llmCalls: 1 },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, mockRegistry);
    await harness[inputs.kind].invokeWithKnownKey({});
    return callLlm.mock.calls.length;
  },
  expects: ({ result, want }) => {
    expect(result).toBe(want.llmCalls);
  },
});

// ─── 6. onProgress is optional (no consumer is forced to subscribe) ─────

runTable({
  describe: 'chain interface — onProgress is optional',
  examples: [
    {
      name: 'date',
      inputs: { kind: 'date' },
      mocks: { callLlm: ['2024-03-05'], bool: [true] },
      want: { completes: true },
    },
    {
      name: 'calibrate',
      inputs: { kind: 'calibrate' },
      mocks: { callLlm: [calibrateSpec, calibrateResult] },
      want: { completes: true },
    },
    {
      name: 'map',
      inputs: { kind: 'map' },
      mocks: { listBatch: [['a-x']] },
      want: { completes: true },
    },
    {
      name: 'veiled-variants',
      inputs: { kind: 'veiled-variants' },
      mocks: { callLlm: [['a', 'b', 'c']] },
      want: { completes: true },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, mockRegistry);
    // Invoke with an empty config — no onProgress, no abortSignal, nothing.
    // The chain must still complete and return a non-undefined value.
    const value = await harness[inputs.kind].invoke({});
    return value !== undefined;
  },
  expects: ({ result, want }) => {
    expect(result).toBe(want.completes);
  },
});

// ─── 7. Lifecycle ordering: chain:start precedes chain:complete ─────────

runTable({
  describe: 'chain interface — lifecycle event ordering',
  examples: [
    {
      name: 'date',
      inputs: { kind: 'date' },
      mocks: { callLlm: ['2024-03-05'], bool: [true] },
      want: { startBeforeComplete: true },
    },
    {
      name: 'calibrate',
      inputs: { kind: 'calibrate' },
      mocks: { callLlm: [calibrateSpec, calibrateResult] },
      want: { startBeforeComplete: true },
    },
    {
      name: 'map',
      inputs: { kind: 'map' },
      mocks: { listBatch: [['a-x']] },
      want: { startBeforeComplete: true },
    },
    {
      name: 'veiled-variants',
      inputs: { kind: 'veiled-variants' },
      mocks: { callLlm: [['a', 'b', 'c']] },
      want: { startBeforeComplete: true },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, mockRegistry);
    const events = [];
    await harness[inputs.kind].invoke({ onProgress: (e) => events.push(e) });
    const { step } = harness[inputs.kind];
    const startIdx = events.findIndex((e) => e.step === step && e.event === 'chain:start');
    const completeIdx = events.findIndex((e) => e.step === step && e.event === 'chain:complete');
    return { startIdx, completeIdx };
  },
  expects: ({ result }) => {
    expect(result.startIdx).toBeGreaterThanOrEqual(0);
    expect(result.completeIdx).toBeGreaterThanOrEqual(0);
    expect(result.startIdx).toBeLessThan(result.completeIdx);
  },
});

// ─── 8. llm config threads through to the LLM callsite ──────────────────

const llmMarker = { sensitive: true, marker: 'llm-thread-test' };

runTable({
  describe: 'chain interface — llm config threads through',
  examples: [
    {
      name: 'date',
      inputs: { kind: 'date' },
      mocks: { callLlm: ['2024-03-05'], bool: [true] },
      want: { reaches: true },
    },
    {
      name: 'calibrate',
      inputs: { kind: 'calibrate' },
      mocks: { callLlm: [calibrateSpec, calibrateResult] },
      want: { reaches: true },
    },
    {
      name: 'map',
      inputs: { kind: 'map' },
      mocks: { listBatch: [['a-x']] },
      want: { reaches: true },
    },
    {
      name: 'veiled-variants',
      inputs: { kind: 'veiled-variants' },
      mocks: { callLlm: [['a', 'b', 'c']] },
      want: { reaches: true },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, mockRegistry);
    await harness[inputs.kind].invoke({ llm: llmMarker });
    const { llmCallsite, llmCallsiteConfigArg } = harness[inputs.kind];
    return llmCallsite().mock.calls.some((args) => {
      const cfg = args[llmCallsiteConfigArg];
      return cfg?.llm?.marker === llmMarker.marker;
    });
  },
  expects: ({ result, want }) => {
    expect(result).toBe(want.reaches);
  },
});
