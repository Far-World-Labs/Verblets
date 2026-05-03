import { vi, beforeEach, expect } from 'vitest';
import createOptionHistoryAnalyzer from './index.js';
import callLlm from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import {
  Kind,
  ChainEvent,
  OpEvent,
  TelemetryEvent,
  OptionSource,
  ModelSource,
} from '../../lib/progress/constants.js';
import { runTable } from '../../lib/examples-runner/index.js';

vi.mock('../../lib/llm/index.js', () => ({
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
  default: vi.fn(),
}));

vi.mock('../../lib/retry/index.js', () => ({ default: vi.fn() }));

const makeTrace = (overrides = {}) => ({
  option: 'strictness',
  operation: 'filter',
  source: OptionSource.policy,
  value: 'high',
  policyReturned: 'high',
  ...overrides,
});

const makeRule = (overrides = {}) => ({
  clauses: [{ attribute: 'domain', op: 'in', values: ['medical'] }],
  option: 'strictness',
  value: 'high',
  reasoning: 'All medical-domain traces resolved to high',
  ...overrides,
});

beforeEach(() => {
  vi.resetAllMocks();
  retry.mockImplementation(async (fn) => fn());
});

const examples = [
  {
    name: 'creates a suggester with observe, write, analyze, reader, stats, clear',
    inputs: { mode: 'create' },
    check: ({ result }) => {
      for (const m of ['observe', 'write', 'analyze', 'reader', 'stats', 'clear']) {
        expect(typeof result[m]).toBe('function');
      }
    },
  },
  {
    name: 'write accumulates traces reflected in stats',
    inputs: {
      build: (s) => {
        s.write(makeTrace());
        s.write(makeTrace({ option: 'thoroughness' }));
      },
    },
    check: ({ result }) => {
      const s = result.stats();
      expect(s.traceCount).toBe(2);
      expect(s.sequence).toBe(2);
    },
  },
  {
    name: 'observe captures option:resolve events as traces',
    inputs: {
      build: (s) =>
        s.observe({
          kind: Kind.telemetry,
          event: TelemetryEvent.optionResolve,
          step: 'strictness',
          operation: 'filter',
          source: OptionSource.policy,
          value: 'high',
          policyReturned: 'high',
        }),
    },
    check: ({ result }) => expect(result.stats().traceCount).toBe(1),
  },
  {
    name: 'observe captures llm:model events as traces',
    inputs: {
      build: (s) =>
        s.observe({
          kind: Kind.telemetry,
          event: TelemetryEvent.llmModel,
          step: 'llm',
          operation: 'filter',
          model: 'gpt-4o',
          source: ModelSource.negotiated,
          negotiation: { fast: true, good: true },
        }),
    },
    check: ({ result }) => expect(result.stats().traceCount).toBe(1),
  },
  {
    name: 'observe ignores non-trace events',
    inputs: {
      build: (s) => {
        s.observe({ kind: Kind.telemetry, event: ChainEvent.complete, step: 'filter' });
        s.observe({ kind: Kind.telemetry, event: TelemetryEvent.llmCall, step: 'llm' });
        s.observe({ kind: Kind.operation, event: OpEvent.start, step: 'filter' });
      },
    },
    check: ({ result }) => expect(result.stats().traceCount).toBe(0),
  },
  {
    name: 'observe handles undefined and null gracefully',
    inputs: {
      build: (s) => {
        expect(() => s.observe(undefined)).not.toThrow();
        expect(() => s.observe(null)).not.toThrow();
        expect(() => s.observe({})).not.toThrow();
      },
    },
    check: ({ result }) => expect(result.stats().traceCount).toBe(0),
  },
  {
    name: 'reader returns a ring buffer reader that sees written traces',
    inputs: {
      mode: 'reader',
      build: async (s) => {
        const r = s.reader();
        s.write(makeTrace({ value: 'low' }));
        s.write(makeTrace({ value: 'high' }));
        const batch = await r.take(2);
        r.close();
        return batch;
      },
    },
    check: ({ result }) => {
      expect(result.batch).toHaveLength(2);
      expect(result.batch[0].value).toBe('low');
      expect(result.batch[1].value).toBe('high');
    },
  },
  {
    name: 'analyze returns empty array when no traces exist',
    inputs: { mode: 'analyze' },
    check: ({ result }) => {
      expect(result.rules).toEqual([]);
      expect(callLlm).not.toHaveBeenCalled();
    },
  },
  {
    name: 'clear resets traces and stats',
    inputs: {
      build: (s) => {
        s.write(makeTrace());
        s.write(makeTrace());
        s.clear();
      },
    },
    check: ({ result }) => {
      const s = result.stats();
      expect(s.traceCount).toBe(0);
      expect(s.sequence).toBe(0);
    },
  },
  {
    name: 'works with custom buffer size',
    inputs: {
      ctorOptions: { bufferSize: 5 },
      build: (s) => {
        for (let i = 0; i < 10; i++) s.write(makeTrace({ value: `v${i}` }));
      },
    },
    check: ({ result }) => {
      const s = result.stats();
      expect(s.traceCount).toBe(10);
      expect(s.maxSize).toBe(5);
    },
  },
];

runTable({
  describe: 'createOptionHistoryAnalyzer (basic)',
  examples,
  process: async ({ ctorOptions, build, mode }) => {
    const s = createOptionHistoryAnalyzer(ctorOptions);
    if (mode === 'create') return s;
    if (mode === 'reader') {
      const batch = await build(s);
      return { ...s, batch, stats: s.stats };
    }
    if (mode === 'analyze') {
      const rules = await s.analyze();
      return { rules };
    }
    if (build) await build(s);
    return s;
  },
});

// ─── analyze (LLM-driven rule generation) ─────────────────────────────────

const analyzeExamples = [
  {
    name: 'analyze calls LLM with accumulated traces and returns targeting rules',
    inputs: {
      preMock: () => callLlm.mockResolvedValueOnce({ rules: [makeRule()] }),
      build: (s) => {
        s.write(makeTrace());
        s.write(makeTrace({ value: 'med', policyReturned: 'med' }));
        s.write(makeTrace({ source: OptionSource.fallback, policyReturned: undefined }));
      },
    },
    check: ({ result }) => {
      expect(result.rules).toEqual([makeRule()]);
      expect(callLlm).toHaveBeenCalledTimes(1);
      const [prompt, config] = callLlm.mock.calls[0];
      expect(prompt).toContain('decision traces');
      expect(prompt).toContain('strictness');
      expect(prompt).toContain('fallback');
      expect(config.responseFormat.json_schema.name).toBe('rule_suggestions');
    },
  },
  {
    name: 'analyze passes instruction through to the prompt',
    inputs: {
      preMock: () => callLlm.mockResolvedValueOnce({ rules: [] }),
      build: (s) => s.write(makeTrace()),
      instruction: 'Focus on compliance patterns',
    },
    check: () => {
      const prompt = callLlm.mock.calls[0][0];
      expect(prompt).toContain('Focus on compliance patterns');
    },
  },
  {
    name: 'analyze respects lookback limit',
    inputs: {
      ctorOptions: { lookback: 2 },
      preMock: () => callLlm.mockResolvedValueOnce({ rules: [] }),
      build: (s) => {
        for (let i = 0; i < 10; i++) s.write(makeTrace({ value: `v${i}` }));
      },
    },
    check: () => {
      const prompt = callLlm.mock.calls[0][0];
      expect(prompt).toContain('2 total');
      expect(prompt).toContain('v8');
      expect(prompt).toContain('v9');
      expect(prompt).not.toContain('v0');
    },
  },
  {
    name: 'fires onRules callback when rules are non-empty',
    inputs: {
      ctorOptionsFactory: () => {
        const onRules = vi.fn();
        return { onRules, ctor: { onRules } };
      },
      preMock: () => callLlm.mockResolvedValueOnce({ rules: [makeRule()] }),
      build: (s) => s.write(makeTrace()),
    },
    check: ({ result }) => {
      expect(result.onRules).toHaveBeenCalledTimes(1);
      expect(result.onRules).toHaveBeenCalledWith([makeRule()]);
    },
  },
  {
    name: 'does not fire onRules when rules are empty',
    inputs: {
      ctorOptionsFactory: () => {
        const onRules = vi.fn();
        return { onRules, ctor: { onRules } };
      },
      preMock: () => callLlm.mockResolvedValueOnce({ rules: [] }),
      build: (s) => s.write(makeTrace()),
    },
    check: ({ result }) => expect(result.onRules).not.toHaveBeenCalled(),
  },
  {
    name: 'clear followed by analyze returns empty',
    inputs: {
      build: (s) => {
        s.write(makeTrace());
        s.clear();
      },
    },
    check: ({ result }) => {
      expect(result.rules).toEqual([]);
      expect(callLlm).not.toHaveBeenCalled();
    },
  },
  {
    name: 'analyze merges config overrides',
    inputs: {
      ctorOptions: { llm: { fast: true, cheap: true } },
      preMock: () => callLlm.mockResolvedValueOnce({ rules: [] }),
      build: (s) => s.write(makeTrace()),
      analyzeArgs: [undefined, { llm: { fast: true, good: true } }],
    },
    check: () => {
      const config = callLlm.mock.calls[0][1];
      expect(config).toBeDefined();
    },
  },
  {
    name: 'integrates with option:resolve telemetry event format',
    inputs: {
      preMock: () => callLlm.mockResolvedValueOnce({ rules: [] }),
      build: (s) => {
        s.observe({
          kind: Kind.telemetry,
          event: TelemetryEvent.optionResolve,
          step: 'strictness',
          operation: 'filter',
          source: OptionSource.policy,
          value: 'high',
          policyReturned: 'high',
        });
        s.observe({
          kind: Kind.telemetry,
          event: TelemetryEvent.optionResolve,
          step: 'thoroughness',
          operation: 'score',
          source: OptionSource.fallback,
          value: 'med',
        });
      },
    },
    check: () => {
      const prompt = callLlm.mock.calls[0][0];
      expect(prompt).toContain('strictness');
      expect(prompt).toContain('thoroughness');
      expect(prompt).toContain('filter');
      expect(prompt).toContain('score');
      expect(prompt).toContain('fallback');
    },
  },
  {
    name: 'handles LLM returning bare array instead of wrapped rules',
    inputs: {
      preMock: () => callLlm.mockResolvedValueOnce([makeRule()]),
      build: (s) => s.write(makeTrace()),
    },
    check: ({ result }) => expect(result.rules).toEqual([makeRule()]),
  },
  {
    name: 'uses retry for LLM calls',
    inputs: {
      preMock: () => callLlm.mockResolvedValueOnce({ rules: [] }),
      build: (s) => s.write(makeTrace()),
    },
    check: () => {
      expect(retry).toHaveBeenCalledTimes(1);
      expect(retry).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ label: 'option-history-analyzer' })
      );
    },
  },
  {
    name: 'prompt includes error info from failed policy evaluations',
    inputs: {
      preMock: () => callLlm.mockResolvedValueOnce({ rules: [] }),
      build: (s) =>
        s.write(
          makeTrace({
            source: OptionSource.fallback,
            error: 'provider down',
            policyReturned: undefined,
          })
        ),
    },
    check: () => {
      const prompt = callLlm.mock.calls[0][0];
      expect(prompt).toContain('provider down');
    },
  },
  {
    name: 'rule output includes multi-clause structure',
    inputs: {
      preMock: () => {
        callLlm.mockResolvedValueOnce({
          rules: [
            {
              clauses: [
                { attribute: 'domain', op: 'in', values: ['medical', 'financial'] },
                { attribute: 'plan', op: 'in', values: ['enterprise'] },
              ],
              option: 'strictness',
              value: 'high',
              reasoning: 'Regulated domains on enterprise plans consistently use high strictness',
            },
          ],
        });
      },
      build: (s) => s.write(makeTrace()),
    },
    check: ({ result }) => {
      const [rule] = result.rules;
      expect(rule.clauses).toHaveLength(2);
      expect(rule.clauses[0]).toEqual({
        attribute: 'domain',
        op: 'in',
        values: ['medical', 'financial'],
      });
      expect(rule.clauses[1]).toEqual({
        attribute: 'plan',
        op: 'in',
        values: ['enterprise'],
      });
      expect(rule.option).toBe('strictness');
      expect(rule.value).toBe('high');
    },
  },
  // observe→analyze prompt-conversion cases
  {
    name: 'observe converts option:resolve event to trace shape for analysis',
    inputs: {
      preMock: () => callLlm.mockResolvedValueOnce({ rules: [] }),
      build: (s) =>
        s.observe({
          kind: Kind.telemetry,
          event: TelemetryEvent.optionResolve,
          step: 'thoroughness',
          operation: 'score',
          source: OptionSource.fallback,
          value: 'med',
        }),
    },
    check: () => {
      const prompt = callLlm.mock.calls[0][0];
      expect(prompt).toContain('thoroughness');
      expect(prompt).toContain('score');
      expect(prompt).toContain('fallback');
    },
  },
  {
    name: 'observe converts llm:model event to trace shape with source normalization',
    inputs: {
      preMock: () => callLlm.mockResolvedValueOnce({ rules: [] }),
      build: (s) =>
        s.observe({
          kind: Kind.telemetry,
          event: TelemetryEvent.llmModel,
          step: 'llm',
          operation: 'filter',
          model: 'gpt-4o-mini',
          source: ModelSource.default,
        }),
    },
    check: () => {
      const prompt = callLlm.mock.calls[0][0];
      expect(prompt).toContain('option="llm"');
      expect(prompt).toContain('source="fallback"');
      expect(prompt).toContain('value="gpt-4o-mini"');
    },
  },
  {
    name: 'observe captures error from option:resolve event',
    inputs: {
      preMock: () => callLlm.mockResolvedValueOnce({ rules: [] }),
      build: (s) =>
        s.observe({
          kind: Kind.telemetry,
          event: TelemetryEvent.optionResolve,
          step: 'strictness',
          operation: 'filter',
          source: OptionSource.fallback,
          value: 'med',
          error: { message: 'provider down' },
        }),
    },
    check: () => {
      const prompt = callLlm.mock.calls[0][0];
      expect(prompt).toContain('provider down');
    },
  },
];

runTable({
  describe: 'createOptionHistoryAnalyzer (analyze)',
  examples: analyzeExamples,
  process: async ({
    ctorOptions,
    ctorOptionsFactory,
    preMock,
    build,
    instruction,
    analyzeArgs,
  }) => {
    if (preMock) preMock();
    let factoryResult;
    let opts = ctorOptions;
    if (ctorOptionsFactory) {
      factoryResult = ctorOptionsFactory();
      opts = factoryResult.ctor;
    }
    const s = createOptionHistoryAnalyzer(opts);
    if (build) await build(s);
    const rules = analyzeArgs ? await s.analyze(...analyzeArgs) : await s.analyze(instruction);
    return { rules, ...(factoryResult ?? {}) };
  },
});
