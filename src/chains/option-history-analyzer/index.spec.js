import { describe, it, expect, vi, beforeEach } from 'vitest';
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

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(),
}));

vi.mock('../../lib/retry/index.js', () => ({
  default: vi.fn(),
}));

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

describe('createOptionHistoryAnalyzer', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    retry.mockImplementation(async (fn) => fn());
  });

  it('creates a suggester with observe, write, analyze, reader, stats, clear', () => {
    const suggester = createOptionHistoryAnalyzer();

    expect(typeof suggester.observe).toBe('function');
    expect(typeof suggester.write).toBe('function');
    expect(typeof suggester.analyze).toBe('function');
    expect(typeof suggester.reader).toBe('function');
    expect(typeof suggester.stats).toBe('function');
    expect(typeof suggester.clear).toBe('function');
  });

  it('write accumulates traces reflected in stats', () => {
    const suggester = createOptionHistoryAnalyzer();

    suggester.write(makeTrace());
    suggester.write(makeTrace({ option: 'thoroughness' }));

    const s = suggester.stats();
    expect(s.traceCount).toBe(2);
    expect(s.sequence).toBe(2);
  });

  it('observe captures option:resolve events as traces', () => {
    const suggester = createOptionHistoryAnalyzer();

    suggester.observe({
      kind: Kind.telemetry,
      event: TelemetryEvent.optionResolve,
      step: 'strictness',
      operation: 'filter',
      source: OptionSource.policy,
      value: 'high',
      policyReturned: 'high',
    });

    expect(suggester.stats().traceCount).toBe(1);
  });

  it('observe captures llm:model events as traces', () => {
    const suggester = createOptionHistoryAnalyzer();

    suggester.observe({
      kind: Kind.telemetry,
      event: TelemetryEvent.llmModel,
      step: 'llm',
      operation: 'filter',
      model: 'gpt-4o',
      source: ModelSource.negotiated,
      negotiation: { fast: true, good: true },
    });

    expect(suggester.stats().traceCount).toBe(1);
  });

  it('observe ignores non-trace events', () => {
    const suggester = createOptionHistoryAnalyzer();

    suggester.observe({ kind: Kind.telemetry, event: ChainEvent.complete, step: 'filter' });
    suggester.observe({ kind: Kind.telemetry, event: TelemetryEvent.llmCall, step: 'llm' });
    suggester.observe({ kind: Kind.operation, event: OpEvent.start, step: 'filter' });

    expect(suggester.stats().traceCount).toBe(0);
  });

  it('observe handles undefined and null gracefully', () => {
    const suggester = createOptionHistoryAnalyzer();

    expect(() => suggester.observe(undefined)).not.toThrow();
    expect(() => suggester.observe(null)).not.toThrow();
    expect(() => suggester.observe({})).not.toThrow();
    expect(suggester.stats().traceCount).toBe(0);
  });

  it('observe converts option:resolve event to trace shape for analysis', async () => {
    callLlm.mockResolvedValueOnce({ rules: [] });

    const suggester = createOptionHistoryAnalyzer();
    suggester.observe({
      kind: Kind.telemetry,
      event: TelemetryEvent.optionResolve,
      step: 'thoroughness',
      operation: 'score',
      source: OptionSource.fallback,
      value: 'med',
    });

    await suggester.analyze();

    const prompt = callLlm.mock.calls[0][0];
    expect(prompt).toContain('thoroughness');
    expect(prompt).toContain('score');
    expect(prompt).toContain('fallback');
  });

  it('observe converts llm:model event to trace shape with source normalization', async () => {
    callLlm.mockResolvedValueOnce({ rules: [] });

    const suggester = createOptionHistoryAnalyzer();
    suggester.observe({
      kind: Kind.telemetry,
      event: TelemetryEvent.llmModel,
      step: 'llm',
      operation: 'filter',
      model: 'gpt-4o-mini',
      source: ModelSource.default,
    });

    await suggester.analyze();

    const prompt = callLlm.mock.calls[0][0];
    expect(prompt).toContain('option="llm"');
    expect(prompt).toContain('source="fallback"');
    expect(prompt).toContain('value="gpt-4o-mini"');
  });

  it('observe captures error from option:resolve event', async () => {
    callLlm.mockResolvedValueOnce({ rules: [] });

    const suggester = createOptionHistoryAnalyzer();
    suggester.observe({
      kind: Kind.telemetry,
      event: TelemetryEvent.optionResolve,
      step: 'strictness',
      operation: 'filter',
      source: OptionSource.fallback,
      value: 'med',
      error: { message: 'provider down' },
    });

    await suggester.analyze();

    const prompt = callLlm.mock.calls[0][0];
    expect(prompt).toContain('provider down');
  });

  it('reader returns a ring buffer reader that sees written traces', async () => {
    const suggester = createOptionHistoryAnalyzer();
    const r = suggester.reader();

    suggester.write(makeTrace({ value: 'low' }));
    suggester.write(makeTrace({ value: 'high' }));

    const batch = await r.take(2);
    expect(batch).toHaveLength(2);
    expect(batch[0].value).toBe('low');
    expect(batch[1].value).toBe('high');

    r.close();
  });

  it('analyze returns empty array when no traces exist', async () => {
    const suggester = createOptionHistoryAnalyzer();

    const rules = await suggester.analyze();

    expect(rules).toEqual([]);
    expect(callLlm).not.toHaveBeenCalled();
  });

  it('analyze calls LLM with accumulated traces and returns targeting rules', async () => {
    const mockRules = [makeRule()];

    callLlm.mockResolvedValueOnce({ rules: mockRules });

    const suggester = createOptionHistoryAnalyzer();
    suggester.write(makeTrace());
    suggester.write(
      makeTrace({
        value: 'med',
        policyReturned: 'med',
      })
    );
    suggester.write(makeTrace({ source: OptionSource.fallback, policyReturned: undefined }));

    const rules = await suggester.analyze();

    expect(rules).toEqual(mockRules);
    expect(rules[0].clauses[0].attribute).toBe('domain');
    expect(rules[0].clauses[0].op).toBe('in');
    expect(rules[0].clauses[0].values).toEqual(['medical']);
    expect(rules[0].option).toBe('strictness');
    expect(rules[0].value).toBe('high');
    expect(callLlm).toHaveBeenCalledTimes(1);

    const [prompt, config] = callLlm.mock.calls[0];
    expect(prompt).toContain('decision traces');
    expect(prompt).toContain('strictness');
    expect(prompt).toContain('fallback');
    expect(config.response_format.json_schema.name).toBe('rule_suggestions');
  });

  it('analyze passes instruction through to the prompt', async () => {
    callLlm.mockResolvedValueOnce({ rules: [] });

    const suggester = createOptionHistoryAnalyzer();
    suggester.write(makeTrace());

    await suggester.analyze('Focus on compliance patterns');

    const prompt = callLlm.mock.calls[0][0];
    expect(prompt).toContain('Focus on compliance patterns');
  });

  it('analyze respects lookback limit', async () => {
    callLlm.mockResolvedValueOnce({ rules: [] });

    const suggester = createOptionHistoryAnalyzer({ lookback: 2 });

    for (let i = 0; i < 10; i++) {
      suggester.write(makeTrace({ value: `v${i}` }));
    }

    await suggester.analyze();

    const prompt = callLlm.mock.calls[0][0];
    // Should only include the last 2 traces (v8, v9)
    expect(prompt).toContain('2 total');
    expect(prompt).toContain('v8');
    expect(prompt).toContain('v9');
    expect(prompt).not.toContain('v0');
  });

  it('fires onRules callback when rules are non-empty', async () => {
    const mockRules = [makeRule()];
    callLlm.mockResolvedValueOnce({ rules: mockRules });

    const onRules = vi.fn();
    const suggester = createOptionHistoryAnalyzer({ onRules });
    suggester.write(makeTrace());

    await suggester.analyze();

    expect(onRules).toHaveBeenCalledTimes(1);
    expect(onRules).toHaveBeenCalledWith(mockRules);
  });

  it('does not fire onRules when rules are empty', async () => {
    callLlm.mockResolvedValueOnce({ rules: [] });

    const onRules = vi.fn();
    const suggester = createOptionHistoryAnalyzer({ onRules });
    suggester.write(makeTrace());

    await suggester.analyze();

    expect(onRules).not.toHaveBeenCalled();
  });

  it('clear resets traces and stats', () => {
    const suggester = createOptionHistoryAnalyzer();
    suggester.write(makeTrace());
    suggester.write(makeTrace());

    suggester.clear();

    const s = suggester.stats();
    expect(s.traceCount).toBe(0);
    expect(s.sequence).toBe(0);
  });

  it('clear followed by analyze returns empty', async () => {
    const suggester = createOptionHistoryAnalyzer();
    suggester.write(makeTrace());

    suggester.clear();
    const rules = await suggester.analyze();

    expect(rules).toEqual([]);
    expect(callLlm).not.toHaveBeenCalled();
  });

  it('analyze merges config overrides', async () => {
    callLlm.mockResolvedValueOnce({ rules: [] });

    const suggester = createOptionHistoryAnalyzer({ llm: { fast: true, cheap: true } });
    suggester.write(makeTrace());

    await suggester.analyze(undefined, { llm: { fast: true, good: true } });

    const config = callLlm.mock.calls[0][1];
    expect(config).toBeDefined();
  });

  it('integrates with option:resolve telemetry event format', async () => {
    callLlm.mockResolvedValueOnce({ rules: [] });

    const suggester = createOptionHistoryAnalyzer();

    // Simulates what getOptionDetail emits through onProgress
    suggester.observe({
      kind: Kind.telemetry,
      event: TelemetryEvent.optionResolve,
      step: 'strictness',
      operation: 'filter',
      source: OptionSource.policy,
      value: 'high',
      policyReturned: 'high',
    });
    suggester.observe({
      kind: Kind.telemetry,
      event: TelemetryEvent.optionResolve,
      step: 'thoroughness',
      operation: 'score',
      source: OptionSource.fallback,
      value: 'med',
    });

    await suggester.analyze();

    const prompt = callLlm.mock.calls[0][0];
    expect(prompt).toContain('strictness');
    expect(prompt).toContain('thoroughness');
    expect(prompt).toContain('filter');
    expect(prompt).toContain('score');
    expect(prompt).toContain('fallback');
  });

  it('handles LLM returning bare array instead of wrapped rules', async () => {
    const bare = [makeRule()];
    callLlm.mockResolvedValueOnce(bare);

    const suggester = createOptionHistoryAnalyzer();
    suggester.write(makeTrace());

    const rules = await suggester.analyze();

    expect(rules).toEqual(bare);
  });

  it('uses retry for LLM calls', async () => {
    callLlm.mockResolvedValueOnce({ rules: [] });

    const suggester = createOptionHistoryAnalyzer();
    suggester.write(makeTrace());

    await suggester.analyze();

    expect(retry).toHaveBeenCalledTimes(1);
    expect(retry).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ label: 'option-history-analyzer' })
    );
  });

  it('prompt includes error info from failed policy evaluations', async () => {
    callLlm.mockResolvedValueOnce({ rules: [] });

    const suggester = createOptionHistoryAnalyzer();
    suggester.write(
      makeTrace({
        source: OptionSource.fallback,
        error: 'provider down',
        policyReturned: undefined,
      })
    );

    await suggester.analyze();

    const prompt = callLlm.mock.calls[0][0];
    expect(prompt).toContain('provider down');
  });

  it('works with custom buffer size', () => {
    const suggester = createOptionHistoryAnalyzer({ bufferSize: 5 });

    for (let i = 0; i < 10; i++) {
      suggester.write(makeTrace({ value: `v${i}` }));
    }

    expect(suggester.stats().traceCount).toBe(10);
    expect(suggester.stats().maxSize).toBe(5);
  });

  it('rule output includes multi-clause structure', async () => {
    const mockRules = [
      {
        clauses: [
          { attribute: 'domain', op: 'in', values: ['medical', 'financial'] },
          { attribute: 'plan', op: 'in', values: ['enterprise'] },
        ],
        option: 'strictness',
        value: 'high',
        reasoning: 'Regulated domains on enterprise plans consistently use high strictness',
      },
    ];
    callLlm.mockResolvedValueOnce({ rules: mockRules });

    const suggester = createOptionHistoryAnalyzer();
    suggester.write(makeTrace());

    const rules = await suggester.analyze();

    expect(rules[0].clauses).toHaveLength(2);
    expect(rules[0].clauses[0]).toEqual({
      attribute: 'domain',
      op: 'in',
      values: ['medical', 'financial'],
    });
    expect(rules[0].clauses[1]).toEqual({
      attribute: 'plan',
      op: 'in',
      values: ['enterprise'],
    });
    expect(rules[0].option).toBe('strictness');
    expect(rules[0].value).toBe('high');
  });
});
