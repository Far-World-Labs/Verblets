import { vi, beforeEach, expect } from 'vitest';
import suggestTargetingRules, { buildPrompt } from './index.js';
import callLlm from '../../lib/llm/index.js';
import { OptionSource } from '../../lib/progress/constants.js';
import { runTable, equals, contains, all } from '../../lib/examples-runner/index.js';

vi.mock('../../lib/llm/index.js', () => ({
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
  default: vi.fn(),
}));

beforeEach(() => vi.resetAllMocks());

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

// ─── buildPrompt: pure prompt-shape assertions ───────────────────────────

const promptExamples = [
  {
    name: 'includes trace count and trace details',
    inputs: { traces: [makeTrace(), makeTrace({ value: 'low', source: OptionSource.fallback })] },
    check: all(contains('2 total'), contains('option="strictness"'), contains('source="fallback"')),
  },
  {
    name: 'includes policyReturned when present',
    inputs: { traces: [makeTrace({ policyReturned: 'high' })] },
    check: contains('policyReturned="high"'),
  },
  {
    name: 'omits policyReturned when undefined',
    inputs: { traces: [makeTrace({ policyReturned: undefined })] },
    check: ({ result }) => expect(result).not.toContain('policyReturned'),
  },
  {
    name: 'includes error when present',
    inputs: { traces: [makeTrace({ error: 'provider down' })] },
    check: contains('error="provider down"'),
  },
  {
    name: 'appends instruction when provided',
    inputs: { traces: [makeTrace()], instruction: 'Focus on compliance' },
    check: contains('Focus on compliance'),
  },
  {
    name: 'omits instruction section when not provided',
    inputs: { traces: [makeTrace()] },
    check: ({ result }) => expect(result).not.toContain('Additional guidance'),
  },
];

runTable({
  describe: 'buildPrompt',
  examples: promptExamples,
  process: ({ traces, instruction }) => buildPrompt(traces, instruction),
});

// ─── suggestTargetingRules: behaviour ────────────────────────────────────

const ruleExamples = [
  {
    name: 'empty traces → empty array, no LLM call',
    inputs: { traces: [] },
    check: all(equals([]), () => expect(callLlm).not.toHaveBeenCalled()),
  },
  {
    name: 'undefined traces → empty array',
    inputs: { traces: undefined },
    check: equals([]),
  },
  {
    name: 'returns rules from LLM and embeds traces in prompt',
    inputs: {
      traces: [
        makeTrace(),
        makeTrace({ source: OptionSource.fallback, policyReturned: undefined }),
      ],
      instruction: 'Focus on defaults',
      preMock: () => callLlm.mockResolvedValueOnce({ rules: [makeRule()] }),
    },
    check: all(equals([makeRule()]), () => {
      const [prompt, config] = callLlm.mock.calls[0];
      expect(prompt).toContain('decision traces');
      expect(prompt).toContain('strictness');
      expect(prompt).toContain('Focus on defaults');
      expect(config.responseFormat.json_schema.name).toBe('targeting_rules');
    }),
  },
  {
    name: 'handles LLM returning a bare array',
    inputs: {
      traces: [makeTrace()],
      preMock: () => callLlm.mockResolvedValueOnce([makeRule()]),
    },
    check: equals([makeRule()]),
  },
  {
    name: 'passes config through to callLlm',
    inputs: {
      traces: [makeTrace()],
      options: { llm: { fast: true, good: true } },
      preMock: () => callLlm.mockResolvedValueOnce({ rules: [] }),
    },
    check: () => {
      const config = callLlm.mock.calls[0][1];
      expect(config.llm).toEqual({ fast: true, good: true });
    },
  },
  {
    name: 'rule output preserves targeting-rule AST shape',
    inputs: {
      traces: [makeTrace()],
      preMock: () =>
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
        }),
    },
    check: ({ result }) => {
      expect(result[0].clauses).toHaveLength(2);
      expect(result[0].clauses[0]).toEqual({
        attribute: 'domain',
        op: 'in',
        values: ['medical', 'financial'],
      });
      expect(result[0].option).toBe('strictness');
      expect(result[0].value).toBe('high');
    },
  },
];

runTable({
  describe: 'suggestTargetingRules',
  examples: ruleExamples,
  process: async ({ traces, instruction, options, preMock }) => {
    if (preMock) preMock();
    return suggestTargetingRules(traces, instruction, options);
  },
});
