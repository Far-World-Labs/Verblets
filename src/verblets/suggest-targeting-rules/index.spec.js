import { vi, beforeEach, expect } from 'vitest';
import suggestTargetingRules, { buildPrompt } from './index.js';
import callLlm from '../../lib/llm/index.js';
import { OptionSource } from '../../lib/progress/constants.js';
import { runTable, applyMocks } from '../../lib/examples-runner/index.js';

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

// ─── buildPrompt: substring presence/absence ─────────────────────────────

runTable({
  describe: 'buildPrompt',
  examples: [
    {
      name: 'includes trace count and trace details',
      inputs: {
        traces: [makeTrace(), makeTrace({ value: 'low', source: OptionSource.fallback })],
      },
      want: { contains: ['2 total', 'option="strictness"', 'source="fallback"'] },
    },
    {
      name: 'includes policyReturned when present',
      inputs: { traces: [makeTrace({ policyReturned: 'high' })] },
      want: { contains: ['policyReturned="high"'] },
    },
    {
      name: 'omits policyReturned when undefined',
      inputs: { traces: [makeTrace({ policyReturned: undefined })] },
      want: { notContains: ['policyReturned'] },
    },
    {
      name: 'includes error when present',
      inputs: { traces: [makeTrace({ error: 'provider down' })] },
      want: { contains: ['error="provider down"'] },
    },
    {
      name: 'appends instruction when provided',
      inputs: { traces: [makeTrace()], instruction: 'Focus on compliance' },
      want: { contains: ['Focus on compliance'] },
    },
    {
      name: 'omits instruction section when not provided',
      inputs: { traces: [makeTrace()] },
      want: { notContains: ['Additional guidance'] },
    },
  ],
  process: ({ inputs }) => buildPrompt(inputs.traces, inputs.instruction),
  expects: ({ result, want }) => {
    if (want.contains) {
      for (const fragment of want.contains) expect(result).toContain(fragment);
    }
    if (want.notContains) {
      for (const fragment of want.notContains) expect(result).not.toContain(fragment);
    }
  },
});

// ─── suggestTargetingRules: result + LLM-call-shape ─────────────────────

runTable({
  describe: 'suggestTargetingRules',
  examples: [
    {
      name: 'empty traces → empty array, no LLM call',
      inputs: { traces: [] },
      want: { value: [], noLlm: true },
    },
    { name: 'undefined traces → empty array', inputs: { traces: undefined }, want: { value: [] } },
    {
      name: 'returns rules from LLM and embeds traces in prompt',
      inputs: {
        traces: [
          makeTrace(),
          makeTrace({ source: OptionSource.fallback, policyReturned: undefined }),
        ],
        instruction: 'Focus on defaults',
      },
      mocks: { callLlm: [{ rules: [makeRule()] }] },
      want: {
        value: [makeRule()],
        promptContains: ['decision traces', 'strictness', 'Focus on defaults'],
        schemaName: 'targeting_rules',
      },
    },
    {
      name: 'handles LLM returning a bare array',
      inputs: { traces: [makeTrace()] },
      mocks: { callLlm: [[makeRule()]] },
      want: { value: [makeRule()] },
    },
    {
      name: 'passes config through to callLlm',
      inputs: { traces: [makeTrace()], options: { llm: { fast: true, good: true } } },
      mocks: { callLlm: [{ rules: [] }] },
      want: { llmConfig: { fast: true, good: true } },
    },
    {
      name: 'rule output preserves targeting-rule AST shape',
      inputs: { traces: [makeTrace()] },
      mocks: {
        callLlm: [
          {
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
          },
        ],
      },
      want: {
        clauses: [
          { attribute: 'domain', op: 'in', values: ['medical', 'financial'] },
          { attribute: 'plan', op: 'in', values: ['enterprise'] },
        ],
        option: 'strictness',
        ruleValue: 'high',
      },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { callLlm });
    return suggestTargetingRules(inputs.traces, inputs.instruction, inputs.options);
  },
  expects: ({ result, want }) => {
    if ('value' in want) expect(result).toEqual(want.value);
    if (want.noLlm) expect(callLlm).not.toHaveBeenCalled();
    if (want.promptContains) {
      const [prompt, config] = callLlm.mock.calls[0];
      for (const fragment of want.promptContains) expect(prompt).toContain(fragment);
      if (want.schemaName) {
        expect(config.responseFormat.json_schema.name).toBe(want.schemaName);
      }
    }
    if (want.llmConfig) {
      const config = callLlm.mock.calls[0][1];
      expect(config.llm).toEqual(want.llmConfig);
    }
    if (want.clauses) {
      expect(result[0].clauses).toEqual(want.clauses);
      expect(result[0].option).toBe(want.option);
      expect(result[0].value).toBe(want.ruleValue);
    }
  },
});
