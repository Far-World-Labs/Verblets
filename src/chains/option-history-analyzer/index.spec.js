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

runTable({
  describe: 'createOptionHistoryAnalyzer (basic)',
  examples: [
    {
      name: 'creates a suggester with observe, write, analyze, reader, stats, clear',
      inputs: { mode: 'create' },
      want: { hasMethods: ['observe', 'write', 'analyze', 'reader', 'stats', 'clear'] },
    },
    {
      name: 'write accumulates traces reflected in stats',
      inputs: {
        build: (s) => {
          s.write(makeTrace());
          s.write(makeTrace({ option: 'thoroughness' }));
        },
      },
      want: { stats: { traceCount: 2, sequence: 2 } },
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
      want: { traceCount: 1 },
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
      want: { traceCount: 1 },
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
      want: { traceCount: 0 },
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
      want: { traceCount: 0 },
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
      want: { batch: [{ value: 'low' }, { value: 'high' }] },
    },
    {
      name: 'analyze returns empty array when no traces exist',
      inputs: { mode: 'analyze' },
      want: { rules: [], noLlm: true },
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
      want: { stats: { traceCount: 0, sequence: 0 } },
    },
    {
      name: 'works with custom buffer size',
      inputs: {
        ctorOptions: { bufferSize: 5 },
        build: (s) => {
          for (let i = 0; i < 10; i++) s.write(makeTrace({ value: `v${i}` }));
        },
      },
      want: { stats: { traceCount: 10, maxSize: 5 } },
    },
  ],
  process: async ({ inputs }) => {
    const s = createOptionHistoryAnalyzer(inputs.ctorOptions);
    if (inputs.mode === 'create') return s;
    if (inputs.mode === 'reader') {
      const batch = await inputs.build(s);
      return { ...s, batch, stats: s.stats };
    }
    if (inputs.mode === 'analyze') {
      const rules = await s.analyze();
      return { rules };
    }
    if (inputs.build) await inputs.build(s);
    return s;
  },
  expects: ({ result, want }) => {
    if (want.hasMethods) {
      for (const m of want.hasMethods) {
        expect(typeof result[m]).toBe('function');
      }
    }
    if (want.stats) {
      expect(result.stats()).toMatchObject(want.stats);
    }
    if ('traceCount' in want) {
      expect(result.stats().traceCount).toBe(want.traceCount);
    }
    if (want.batch) {
      expect(result.batch).toHaveLength(want.batch.length);
      want.batch.forEach((shape, i) => expect(result.batch[i]).toMatchObject(shape));
    }
    if ('rules' in want) expect(result.rules).toEqual(want.rules);
    if (want.noLlm) expect(callLlm).not.toHaveBeenCalled();
  },
});

runTable({
  describe: 'createOptionHistoryAnalyzer (analyze)',
  examples: [
    {
      name: 'analyze calls LLM with accumulated traces and returns targeting rules',
      inputs: {
        setupMock: () => callLlm.mockResolvedValueOnce({ rules: [makeRule()] }),
        build: (s) => {
          s.write(makeTrace());
          s.write(makeTrace({ value: 'med', policyReturned: 'med' }));
          s.write(makeTrace({ source: OptionSource.fallback, policyReturned: undefined }));
        },
      },
      want: {
        rules: [makeRule()],
        llmCalls: 1,
        promptContains: ['decision traces', 'strictness', 'fallback'],
        schemaName: 'rule_suggestions',
      },
    },
    {
      name: 'analyze passes instruction through to the prompt',
      inputs: {
        setupMock: () => callLlm.mockResolvedValueOnce({ rules: [] }),
        build: (s) => s.write(makeTrace()),
        instruction: 'Focus on compliance patterns',
      },
      want: { promptContains: ['Focus on compliance patterns'] },
    },
    {
      name: 'analyze respects lookback limit',
      inputs: {
        ctorOptions: { lookback: 2 },
        setupMock: () => callLlm.mockResolvedValueOnce({ rules: [] }),
        build: (s) => {
          for (let i = 0; i < 10; i++) s.write(makeTrace({ value: `v${i}` }));
        },
      },
      want: { promptContains: ['2 total', 'v8', 'v9'], promptNotContains: ['v0'] },
    },
    {
      name: 'fires onRules callback when rules are non-empty',
      inputs: {
        ctorOptionsFactory: () => {
          const onRules = vi.fn();
          return { onRules, ctor: { onRules } };
        },
        setupMock: () => callLlm.mockResolvedValueOnce({ rules: [makeRule()] }),
        build: (s) => s.write(makeTrace()),
      },
      want: { onRulesCalledWith: [makeRule()] },
    },
    {
      name: 'does not fire onRules when rules are empty',
      inputs: {
        ctorOptionsFactory: () => {
          const onRules = vi.fn();
          return { onRules, ctor: { onRules } };
        },
        setupMock: () => callLlm.mockResolvedValueOnce({ rules: [] }),
        build: (s) => s.write(makeTrace()),
      },
      want: { onRulesNotCalled: true },
    },
    {
      name: 'clear followed by analyze returns empty',
      inputs: {
        build: (s) => {
          s.write(makeTrace());
          s.clear();
        },
      },
      want: { rules: [], noLlm: true },
    },
    {
      name: 'analyze merges config overrides',
      inputs: {
        ctorOptions: { llm: { fast: true, cheap: true } },
        setupMock: () => callLlm.mockResolvedValueOnce({ rules: [] }),
        build: (s) => s.write(makeTrace()),
        analyzeArgs: [undefined, { llm: { fast: true, good: true } }],
      },
      want: { configDefined: true },
    },
    {
      name: 'integrates with option:resolve telemetry event format',
      inputs: {
        setupMock: () => callLlm.mockResolvedValueOnce({ rules: [] }),
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
      want: { promptContains: ['strictness', 'thoroughness', 'filter', 'score', 'fallback'] },
    },
    {
      name: 'handles LLM returning bare array instead of wrapped rules',
      inputs: {
        setupMock: () => callLlm.mockResolvedValueOnce([makeRule()]),
        build: (s) => s.write(makeTrace()),
      },
      want: { rules: [makeRule()] },
    },
    {
      name: 'uses retry for LLM calls',
      inputs: {
        setupMock: () => callLlm.mockResolvedValueOnce({ rules: [] }),
        build: (s) => s.write(makeTrace()),
      },
      want: { retryLabel: 'option-history-analyzer' },
    },
    {
      name: 'prompt includes error info from failed policy evaluations',
      inputs: {
        setupMock: () => callLlm.mockResolvedValueOnce({ rules: [] }),
        build: (s) =>
          s.write(
            makeTrace({
              source: OptionSource.fallback,
              error: 'provider down',
              policyReturned: undefined,
            })
          ),
      },
      want: { promptContains: ['provider down'] },
    },
    {
      name: 'rule output includes multi-clause structure',
      inputs: {
        setupMock: () => {
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
      want: {
        ruleClauses: [
          { attribute: 'domain', op: 'in', values: ['medical', 'financial'] },
          { attribute: 'plan', op: 'in', values: ['enterprise'] },
        ],
        ruleOption: 'strictness',
        ruleValue: 'high',
      },
    },
    {
      name: 'observe converts option:resolve event to trace shape for analysis',
      inputs: {
        setupMock: () => callLlm.mockResolvedValueOnce({ rules: [] }),
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
      want: { promptContains: ['thoroughness', 'score', 'fallback'] },
    },
    {
      name: 'observe converts llm:model event to trace shape with source normalization',
      inputs: {
        setupMock: () => callLlm.mockResolvedValueOnce({ rules: [] }),
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
      want: {
        promptContains: ['option="llm"', 'source="fallback"', 'value="gpt-4o-mini"'],
      },
    },
    {
      name: 'observe captures error from option:resolve event',
      inputs: {
        setupMock: () => callLlm.mockResolvedValueOnce({ rules: [] }),
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
      want: { promptContains: ['provider down'] },
    },
  ],
  process: async ({ inputs }) => {
    inputs.setupMock?.();
    let factoryResult;
    let opts = inputs.ctorOptions;
    if (inputs.ctorOptionsFactory) {
      factoryResult = inputs.ctorOptionsFactory();
      opts = factoryResult.ctor;
    }
    const s = createOptionHistoryAnalyzer(opts);
    if (inputs.build) await inputs.build(s);
    const rules = inputs.analyzeArgs
      ? await s.analyze(...inputs.analyzeArgs)
      : await s.analyze(inputs.instruction);
    return { rules, ...(factoryResult ?? {}) };
  },
  expects: ({ result, want }) => {
    if ('rules' in want) expect(result.rules).toEqual(want.rules);
    if ('llmCalls' in want) expect(callLlm).toHaveBeenCalledTimes(want.llmCalls);
    if (want.promptContains) {
      const prompt = callLlm.mock.calls[0][0];
      for (const fragment of want.promptContains) expect(prompt).toContain(fragment);
    }
    if (want.promptNotContains) {
      const prompt = callLlm.mock.calls[0][0];
      for (const fragment of want.promptNotContains) expect(prompt).not.toContain(fragment);
    }
    if (want.schemaName) {
      const config = callLlm.mock.calls[0][1];
      expect(config.responseFormat.json_schema.name).toBe(want.schemaName);
    }
    if (want.noLlm) expect(callLlm).not.toHaveBeenCalled();
    if (want.onRulesCalledWith) {
      expect(result.onRules).toHaveBeenCalledTimes(1);
      expect(result.onRules).toHaveBeenCalledWith(want.onRulesCalledWith);
    }
    if (want.onRulesNotCalled) {
      expect(result.onRules).not.toHaveBeenCalled();
    }
    if (want.configDefined) {
      const config = callLlm.mock.calls[0][1];
      expect(config).toBeDefined();
    }
    if (want.ruleClauses) {
      const [rule] = result.rules;
      expect(rule.clauses).toHaveLength(want.ruleClauses.length);
      want.ruleClauses.forEach((clause, i) => expect(rule.clauses[i]).toEqual(clause));
      expect(rule.option).toBe(want.ruleOption);
      expect(rule.value).toBe(want.ruleValue);
    }
    if (want.retryLabel) {
      expect(retry).toHaveBeenCalledTimes(1);
      expect(retry).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ label: want.retryLabel })
      );
    }
  },
});
