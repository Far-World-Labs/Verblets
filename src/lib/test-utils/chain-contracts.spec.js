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
    primaryInput: () => 'March 5 2024',
    invokeWithInput: (input, config) => date(input, { rigor: 'low', ...config }),
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
    primaryInput: () => makeScan(['pii']),
    invokeWithInput: (input, config) => calibrate(input, 'classify', config),
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
    primaryInput: () => ['a', 'b'],
    invokeWithInput: (input, config) => map(input, 'transform', { batchSize: 2, ...config }),
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
    primaryInput: () => 'test prompt',
    invokeWithInput: (input, config) => veiledVariants(input, { coverage: 'low', ...config }),
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

// ─── 9. abortSignal threads through to the LLM callsite ─────────────────

runTable({
  describe: 'chain interface — abortSignal threads through',
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
    const ctrl = new AbortController();
    await harness[inputs.kind].invoke({ abortSignal: ctrl.signal });
    const { llmCallsite, llmCallsiteConfigArg } = harness[inputs.kind];
    return llmCallsite().mock.calls.some((args) => {
      const cfg = args[llmCallsiteConfigArg];
      return cfg?.abortSignal === ctrl.signal;
    });
  },
  expects: ({ result, want }) => {
    expect(result).toBe(want.reaches);
  },
});

// ─── 10. Inputs are not mutated ──────────────────────────────────────────

runTable({
  describe: 'chain interface — does not mutate primary input',
  examples: [
    {
      name: 'date',
      inputs: { kind: 'date' },
      mocks: { callLlm: ['2024-03-05'], bool: [true] },
      want: {},
    },
    {
      name: 'calibrate',
      inputs: { kind: 'calibrate' },
      mocks: { callLlm: [calibrateSpec, calibrateResult] },
      want: {},
    },
    {
      name: 'map',
      inputs: { kind: 'map' },
      mocks: { listBatch: [['a-x', 'b-x']] },
      want: {},
    },
    {
      name: 'veiled-variants',
      inputs: { kind: 'veiled-variants' },
      mocks: { callLlm: [['a', 'b', 'c']] },
      want: {},
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, mockRegistry);
    const input = harness[inputs.kind].primaryInput();
    const before = JSON.parse(JSON.stringify(input));
    await harness[inputs.kind].invokeWithInput(input, {});
    return { input, before };
  },
  expects: ({ result }) => {
    expect(result.input).toEqual(result.before);
  },
});

// ─── 11. Every emitted progress event carries trace metadata ────────────

runTable({
  describe: 'chain interface — emitted events carry trace metadata',
  examples: [
    {
      name: 'date',
      inputs: { kind: 'date' },
      mocks: { callLlm: ['2024-03-05'], bool: [true] },
      want: {},
    },
    {
      name: 'calibrate',
      inputs: { kind: 'calibrate' },
      mocks: { callLlm: [calibrateSpec, calibrateResult] },
      want: {},
    },
    {
      name: 'map',
      inputs: { kind: 'map' },
      mocks: { listBatch: [['a-x']] },
      want: {},
    },
    {
      name: 'veiled-variants',
      inputs: { kind: 'veiled-variants' },
      mocks: { callLlm: [['a', 'b', 'c']] },
      want: {},
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, mockRegistry);
    const events = [];
    await harness[inputs.kind].invoke({ onProgress: (e) => events.push(e) });
    return events;
  },
  expects: ({ result }) => {
    expect(result.length).toBeGreaterThan(0);
    // Every event must identify its kind, the chain step, and the event
    // name — these are the fields downstream consumers (loggers, span
    // builders, telemetry pipes) rely on.
    for (const ev of result) {
      expect(typeof ev.kind).toBe('string');
      expect(typeof ev.step).toBe('string');
      expect(typeof ev.event).toBe('string');
      expect(typeof ev.operation).toBe('string');
    }
  },
});

// ─── 12. Caller's config object is not mutated ──────────────────────────

runTable({
  describe: 'chain interface — does not mutate caller config',
  examples: [
    {
      name: 'date',
      inputs: { kind: 'date' },
      mocks: { callLlm: ['2024-03-05'], bool: [true] },
      want: {},
    },
    {
      name: 'calibrate',
      inputs: { kind: 'calibrate' },
      mocks: { callLlm: [calibrateSpec, calibrateResult] },
      want: {},
    },
    {
      name: 'map',
      inputs: { kind: 'map' },
      mocks: { listBatch: [['a-x']] },
      want: {},
    },
    {
      name: 'veiled-variants',
      inputs: { kind: 'veiled-variants' },
      mocks: { callLlm: [['a', 'b', 'c']] },
      want: {},
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, mockRegistry);
    const config = { llm: { fast: true }, customKey: 'preserve-me' };
    const before = JSON.parse(JSON.stringify(config));
    await harness[inputs.kind].invoke(config);
    return { config, before };
  },
  expects: ({ result }) => {
    // Caller-visible keys must survive untouched. The chain may add internal
    // bookkeeping keys (operation, now, …) under nameStep, but those keys
    // weren't present before, so the original keys must still match.
    for (const key of Object.keys(result.before)) {
      expect(result.config[key]).toEqual(result.before[key]);
    }
  },
});

// ─── 13. chain:complete event shape ─────────────────────────────────────

runTable({
  describe: 'chain interface — chain:complete event shape',
  examples: [
    {
      name: 'date',
      inputs: { kind: 'date' },
      mocks: { callLlm: ['2024-03-05'], bool: [true] },
      want: {},
    },
    {
      name: 'calibrate',
      inputs: { kind: 'calibrate' },
      mocks: { callLlm: [calibrateSpec, calibrateResult] },
      want: {},
    },
    {
      name: 'map',
      inputs: { kind: 'map' },
      mocks: { listBatch: [['a-x']] },
      want: {},
    },
    {
      name: 'veiled-variants',
      inputs: { kind: 'veiled-variants' },
      mocks: { callLlm: [['a', 'b', 'c']] },
      want: {},
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, mockRegistry);
    const events = [];
    await harness[inputs.kind].invoke({ onProgress: (e) => events.push(e) });
    const { step } = harness[inputs.kind];
    return events.find((e) => e.step === step && e.event === 'chain:complete');
  },
  expects: ({ result }) => {
    expect(result).toBeDefined();
    expect(result.kind).toBe('telemetry');
    expect(result.statusCode).toBe('ok');
    expect(typeof result.durationMs).toBe('number');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  },
});

// ─── 14. chain:error event shape ────────────────────────────────────────

runTable({
  describe: 'chain interface — chain:error event shape',
  examples: [
    {
      name: 'date',
      inputs: { kind: 'date' },
      mocks: { callLlm: [llmFailure] },
      want: {},
    },
    {
      name: 'calibrate',
      inputs: { kind: 'calibrate' },
      mocks: { callLlm: [llmFailure] },
      want: {},
    },
    {
      name: 'map',
      inputs: { kind: 'map' },
      mocks: { listBatch: [llmFailure] },
      want: {},
    },
    {
      name: 'veiled-variants',
      inputs: { kind: 'veiled-variants' },
      mocks: { callLlm: [llmFailure] },
      want: {},
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, mockRegistry);
    const events = [];
    try {
      await harness[inputs.kind].invoke({
        onProgress: (e) => events.push(e),
        maxAttempts: 1,
      });
    } catch {
      // expected
    }
    const { step } = harness[inputs.kind];
    return events.find((e) => e.step === step && e.event === 'chain:error');
  },
  expects: ({ result }) => {
    expect(result).toBeDefined();
    expect(result.kind).toBe('telemetry');
    expect(result.statusCode).toBe('error');
    expect(typeof result.durationMs).toBe('number');
    expect(result.error).toBeDefined();
    expect(typeof result.error.message).toBe('string');
    expect(result.error.message.length).toBeGreaterThan(0);
    expect(typeof result.error.type).toBe('string');
  },
});

// ─── 15. Every emitted event carries trace context (traceId, spanId,
//        libraryName) ─────────────────────────────────────────────────────

runTable({
  describe: 'chain interface — events carry traceId / spanId / libraryName',
  examples: [
    {
      name: 'date',
      inputs: { kind: 'date' },
      mocks: { callLlm: ['2024-03-05'], bool: [true] },
      want: {},
    },
    {
      name: 'calibrate',
      inputs: { kind: 'calibrate' },
      mocks: { callLlm: [calibrateSpec, calibrateResult] },
      want: {},
    },
    {
      name: 'map',
      inputs: { kind: 'map' },
      mocks: { listBatch: [['a-x']] },
      want: {},
    },
    {
      name: 'veiled-variants',
      inputs: { kind: 'veiled-variants' },
      mocks: { callLlm: [['a', 'b', 'c']] },
      want: {},
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, mockRegistry);
    const events = [];
    await harness[inputs.kind].invoke({ onProgress: (e) => events.push(e) });
    return events;
  },
  expects: ({ result }) => {
    expect(result.length).toBeGreaterThan(0);
    for (const ev of result) {
      expect(typeof ev.traceId).toBe('string');
      expect(ev.traceId.length).toBeGreaterThan(0);
      expect(typeof ev.spanId).toBe('string');
      expect(ev.spanId.length).toBeGreaterThan(0);
      expect(ev.libraryName).toBe('verblets');
    }
  },
});

// ─── 16. spanId is consistent within a single invocation ────────────────

runTable({
  describe: 'chain interface — spanId is consistent within an invocation',
  examples: [
    {
      name: 'date',
      inputs: { kind: 'date' },
      mocks: { callLlm: ['2024-03-05'], bool: [true] },
      want: {},
    },
    {
      name: 'calibrate',
      inputs: { kind: 'calibrate' },
      mocks: { callLlm: [calibrateSpec, calibrateResult] },
      want: {},
    },
    {
      name: 'map',
      inputs: { kind: 'map' },
      mocks: { listBatch: [['a-x']] },
      want: {},
    },
    {
      name: 'veiled-variants',
      inputs: { kind: 'veiled-variants' },
      mocks: { callLlm: [['a', 'b', 'c']] },
      want: {},
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, mockRegistry);
    const events = [];
    await harness[inputs.kind].invoke({ onProgress: (e) => events.push(e) });
    const { step } = harness[inputs.kind];
    // Restrict to the chain's own emitter step — sub-emitters (e.g.
    // calibrate:spec inside calibrate) own different spans, which is
    // expected and tested elsewhere.
    return events.filter((e) => e.step === step).map((e) => e.spanId);
  },
  expects: ({ result }) => {
    expect(result.length).toBeGreaterThan(0);
    expect(new Set(result).size).toBe(1);
  },
});

// ─── 17. spanId differs across consecutive invocations ──────────────────

runTable({
  describe: 'chain interface — spanId differs across invocations',
  examples: [
    {
      name: 'date',
      inputs: { kind: 'date' },
      mocks: {
        callLlm: ['2024-03-05', '2024-03-05'],
        bool: [true, true],
      },
      want: {},
    },
    {
      name: 'calibrate',
      inputs: { kind: 'calibrate' },
      mocks: {
        callLlm: [calibrateSpec, calibrateResult, calibrateSpec, calibrateResult],
      },
      want: {},
    },
    {
      name: 'map',
      inputs: { kind: 'map' },
      mocks: { listBatch: [['a-x'], ['a-x']] },
      want: {},
    },
    {
      name: 'veiled-variants',
      inputs: { kind: 'veiled-variants' },
      mocks: {
        callLlm: [
          ['a', 'b', 'c'],
          ['a', 'b', 'c'],
        ],
      },
      want: {},
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, mockRegistry);
    const eventsA = [];
    const eventsB = [];
    await harness[inputs.kind].invoke({ onProgress: (e) => eventsA.push(e) });
    await harness[inputs.kind].invoke({ onProgress: (e) => eventsB.push(e) });
    const { step } = harness[inputs.kind];
    const spanA = eventsA.find((e) => e.step === step)?.spanId;
    const spanB = eventsB.find((e) => e.step === step)?.spanId;
    return { spanA, spanB };
  },
  expects: ({ result }) => {
    expect(result.spanA).toBeDefined();
    expect(result.spanB).toBeDefined();
    expect(result.spanA).not.toBe(result.spanB);
  },
});

// ─── 18. chain:start event shape ────────────────────────────────────────

runTable({
  describe: 'chain interface — chain:start event shape',
  examples: [
    {
      name: 'date',
      inputs: { kind: 'date' },
      mocks: { callLlm: ['2024-03-05'], bool: [true] },
      want: {},
    },
    {
      name: 'calibrate',
      inputs: { kind: 'calibrate' },
      mocks: { callLlm: [calibrateSpec, calibrateResult] },
      want: {},
    },
    {
      name: 'map',
      inputs: { kind: 'map' },
      mocks: { listBatch: [['a-x']] },
      want: {},
    },
    {
      name: 'veiled-variants',
      inputs: { kind: 'veiled-variants' },
      mocks: { callLlm: [['a', 'b', 'c']] },
      want: {},
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, mockRegistry);
    const events = [];
    await harness[inputs.kind].invoke({ onProgress: (e) => events.push(e) });
    const { step } = harness[inputs.kind];
    return events.find((e) => e.step === step && e.event === 'chain:start');
  },
  expects: ({ result }) => {
    expect(result).toBeDefined();
    expect(result.kind).toBe('telemetry');
    // chain:start fires before any work is done — there's no outcome,
    // no duration, and no error to report yet.
    expect(result.statusCode).toBeUndefined();
    expect(result.durationMs).toBeUndefined();
    expect(result.error).toBeUndefined();
  },
});

// ─── 19. Lifecycle exclusivity: complete and error never both fire ──────

runTable({
  describe: 'chain interface — lifecycle exclusivity (complete XOR error)',
  examples: [
    {
      name: 'date — success',
      inputs: { kind: 'date' },
      mocks: { callLlm: ['2024-03-05'], bool: [true] },
      want: { hasComplete: true, hasError: false },
    },
    {
      name: 'date — failure',
      inputs: { kind: 'date' },
      mocks: { callLlm: [llmFailure] },
      want: { hasComplete: false, hasError: true },
    },
    {
      name: 'calibrate — success',
      inputs: { kind: 'calibrate' },
      mocks: { callLlm: [calibrateSpec, calibrateResult] },
      want: { hasComplete: true, hasError: false },
    },
    {
      name: 'calibrate — failure',
      inputs: { kind: 'calibrate' },
      mocks: { callLlm: [llmFailure] },
      want: { hasComplete: false, hasError: true },
    },
    {
      name: 'map — success',
      inputs: { kind: 'map' },
      mocks: { listBatch: [['a-x']] },
      want: { hasComplete: true, hasError: false },
    },
    {
      name: 'map — failure',
      inputs: { kind: 'map' },
      mocks: { listBatch: [llmFailure] },
      want: { hasComplete: false, hasError: true },
    },
    {
      name: 'veiled-variants — success',
      inputs: { kind: 'veiled-variants' },
      mocks: { callLlm: [['a', 'b', 'c']] },
      want: { hasComplete: true, hasError: false },
    },
    {
      name: 'veiled-variants — failure',
      inputs: { kind: 'veiled-variants' },
      mocks: { callLlm: [llmFailure] },
      want: { hasComplete: false, hasError: true },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, mockRegistry);
    const events = [];
    try {
      await harness[inputs.kind].invoke({
        onProgress: (e) => events.push(e),
        maxAttempts: 1,
      });
    } catch {
      // failure rows swallow here — exclusivity is asserted on events
    }
    const { step } = harness[inputs.kind];
    return {
      hasComplete: events.some((e) => e.step === step && e.event === 'chain:complete'),
      hasError: events.some((e) => e.step === step && e.event === 'chain:error'),
    };
  },
  expects: ({ result, want }) => {
    expect(result.hasComplete).toBe(want.hasComplete);
    expect(result.hasError).toBe(want.hasError);
  },
});

// ─── 20. Failure-path ordering: chain:start precedes chain:error ────────

runTable({
  describe: 'chain interface — chain:start precedes chain:error on failure',
  examples: [
    {
      name: 'date',
      inputs: { kind: 'date' },
      mocks: { callLlm: [llmFailure] },
      want: {},
    },
    {
      name: 'calibrate',
      inputs: { kind: 'calibrate' },
      mocks: { callLlm: [llmFailure] },
      want: {},
    },
    {
      name: 'map',
      inputs: { kind: 'map' },
      mocks: { listBatch: [llmFailure] },
      want: {},
    },
    {
      name: 'veiled-variants',
      inputs: { kind: 'veiled-variants' },
      mocks: { callLlm: [llmFailure] },
      want: {},
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, mockRegistry);
    const events = [];
    try {
      await harness[inputs.kind].invoke({
        onProgress: (e) => events.push(e),
        maxAttempts: 1,
      });
    } catch {
      // expected
    }
    const { step } = harness[inputs.kind];
    const startIdx = events.findIndex((e) => e.step === step && e.event === 'chain:start');
    const errorIdx = events.findIndex((e) => e.step === step && e.event === 'chain:error');
    return { startIdx, errorIdx };
  },
  expects: ({ result }) => {
    expect(result.startIdx).toBeGreaterThanOrEqual(0);
    expect(result.errorIdx).toBeGreaterThanOrEqual(0);
    expect(result.startIdx).toBeLessThan(result.errorIdx);
  },
});
