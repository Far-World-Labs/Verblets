import { beforeEach, describe, expect, it, vi } from 'vitest';

// ==========================================
// Centralized Chain Interface Contract Tests
// ==========================================
//
// Stress-test files in /tmp historically asserted the same cross-cutting
// concerns over and over per chain: knownTexts shape, chain:start/complete
// emission on success, chain:error emission on LLM failure. This spec
// folds those interface contracts into table-driven tests across a small
// set of representative chains spanning the four common shapes:
//
//   - single LLM call           → date
//   - two-pass (spec + apply)   → calibrate
//   - batched list processing   → map
//   - parallel multi-strategy   → veiled-variants
//
// Chain-specific BEHAVIOR (e.g. statistics aggregation, anchor handling)
// belongs in the chain's own spec.
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

// Each row supplies enough to drive the cross-cutting contract assertions
// without leaking chain-specific behavior into this file.
//
// `invoke(config)` is the canonical success-path call.
// `invokeWith(instructions, config)` swaps the chain's instructions / prompt
//   slot — used by the bundle-context contract to verify that all chains
//   accept both a string and an object-form `{ text, ...context }` instruction
//   bundle through `resolveTexts`.
// `findInPrompts(marker)` searches every prompt seen by the chain's primary
//   LLM proxy (callLlm directly, or listBatch for batched chains).
const chains = [
  {
    name: 'date',
    step: 'date',
    expectedKnownTexts: [],
    fn: date,
    invoke: (config) => date('March 5 2024', { rigor: 'low', ...config }),
    invokeWith: (instructions, config) => date(instructions, { rigor: 'low', ...config }),
    findInPrompts: (marker) =>
      callLlm.mock.calls.some(([prompt]) => typeof prompt === 'string' && prompt.includes(marker)),
    setupSuccess: () => {
      callLlm.mockResolvedValue('2024-03-05');
      bool.mockResolvedValue(true);
    },
    setupFailure: () => {
      callLlm.mockRejectedValueOnce(new Error('LLM failure'));
    },
  },
  {
    name: 'calibrate',
    step: 'calibrate',
    expectedKnownTexts: ['spec'],
    fn: calibrate,
    invoke: (config) => calibrate(makeScan(['pii']), 'classify', config),
    invokeWith: (instructions, config) => calibrate(makeScan(['pii']), instructions, config),
    findInPrompts: (marker) =>
      callLlm.mock.calls.some(([prompt]) => typeof prompt === 'string' && prompt.includes(marker)),
    setupSuccess: () => {
      callLlm.mockResolvedValueOnce(calibrateSpec).mockResolvedValueOnce(calibrateResult);
    },
    setupFailure: () => {
      callLlm.mockRejectedValueOnce(new Error('LLM failure'));
    },
    // Known-key skip: when the bundle includes `spec`, calibrate skips Pass 1
    // (spec generation) and makes exactly one LLM call instead of two.
    knownKey: {
      key: 'spec',
      value: calibrateSpec,
      invoke: (config) =>
        calibrate(makeScan(['pii']), { text: 'classify', spec: calibrateSpec }, config),
      setupOnce: () => {
        callLlm.mockResolvedValueOnce(calibrateResult);
      },
      expectedLlmCalls: 1,
    },
  },
  {
    name: 'map',
    step: 'map',
    expectedKnownTexts: [],
    fn: map,
    invoke: (config) => map(['a'], 'transform', { batchSize: 1, ...config }),
    invokeWith: (instructions, config) => map(['a'], instructions, { batchSize: 1, ...config }),
    findInPrompts: (marker) =>
      listBatch.mock.calls.some(
        ([, prompt]) => typeof prompt === 'string' && prompt.includes(marker)
      ),
    setupSuccess: () => {
      listBatch.mockResolvedValue(['a-x']);
    },
    setupFailure: () => {
      listBatch.mockRejectedValue(new Error('LLM failure'));
    },
  },
  {
    name: 'veiled-variants',
    step: 'veiled-variants',
    expectedKnownTexts: [],
    fn: veiledVariants,
    invoke: (config) => veiledVariants('test prompt', { coverage: 'low', ...config }),
    invokeWith: (instructions, config) =>
      veiledVariants(instructions, { coverage: 'low', ...config }),
    findInPrompts: (marker) =>
      callLlm.mock.calls.some(([prompt]) => typeof prompt === 'string' && prompt.includes(marker)),
    setupSuccess: () => {
      callLlm.mockResolvedValue(['a', 'b', 'c']);
    },
    setupFailure: () => {
      callLlm.mockRejectedValue(new Error('LLM failure'));
    },
  },
];

const knownKeyChains = chains.filter((c) => c.knownKey);

beforeEach(() => {
  vi.resetAllMocks();
});

describe('chain interface — knownTexts shape', () => {
  it.each(chains.map((c) => [c.name, c]))(
    '%s: exports knownTexts as a string array of expected shape',
    (_name, { fn, expectedKnownTexts }) => {
      expect(Array.isArray(fn.knownTexts)).toBe(true);
      for (const key of fn.knownTexts) expect(typeof key).toBe('string');
      expect(fn.knownTexts).toEqual(expectedKnownTexts);
    }
  );
});

describe('chain interface — success lifecycle emits chain:start and chain:complete', () => {
  it.each(chains.map((c) => [c.name, c]))(
    '%s: emits chain:start and chain:complete under its step name',
    async (_name, { step, invoke, setupSuccess }) => {
      setupSuccess();
      const events = [];
      await invoke({ onProgress: (e) => events.push(e) });
      const start = events.find((e) => e.step === step && e.event === 'chain:start');
      const complete = events.find((e) => e.step === step && e.event === 'chain:complete');
      expect(start).toBeDefined();
      expect(complete).toBeDefined();
    }
  );
});

describe('chain interface — failure lifecycle emits chain:error', () => {
  it.each(chains.map((c) => [c.name, c]))(
    '%s: rejects and emits chain:error when the LLM fails',
    async (_name, { step, invoke, setupFailure }) => {
      setupFailure();
      const events = [];
      let caught;
      try {
        await invoke({ onProgress: (e) => events.push(e), maxAttempts: 1 });
      } catch (e) {
        caught = e;
      }
      // Contract: the chain rejects with an Error (the message may be
      // aggregated or wrapped by chains that batch — that's chain-specific).
      expect(caught).toBeInstanceOf(Error);
      const errorEvent = events.find((e) => e.step === step && e.event === 'chain:error');
      expect(errorEvent).toBeDefined();
    }
  );
});

// All chains route their primary text through `resolveTexts`, so passing a
// `{ text, ...context }` bundle must be equivalent to passing the string
// alone — and any extra context keys must reach the LLM prompt as XML.
describe('chain interface — instruction bundle accepted in place of string', () => {
  it.each(chains.map((c) => [c.name, c]))(
    '%s: accepts an object-form bundle and embeds context in the prompt',
    async (_name, { invokeWith, setupSuccess, findInPrompts }) => {
      setupSuccess();
      const marker = 'context-marker-2c8e1f';
      await invokeWith({ text: 'instruction text', extraContext: marker }, {});
      expect(findInPrompts(marker)).toBe(true);
    }
  );
});

// Chains that declare a known-text key (`spec`, `anchors`, …) must skip the
// LLM call that would normally derive that artifact when it is supplied via
// the bundle. Verified by counting LLM calls.
describe('chain interface — known-text bundle key skips its derivation call', () => {
  it.each(knownKeyChains.map((c) => [c.name, c]))(
    '%s: supplying %p in the bundle skips the derivation LLM call',
    async (_name, { knownKey }) => {
      knownKey.setupOnce();
      await knownKey.invoke({});
      expect(callLlm).toHaveBeenCalledTimes(knownKey.expectedLlmCalls);
    }
  );
});
