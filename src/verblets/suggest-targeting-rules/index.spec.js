import { vi, beforeEach, expect } from 'vitest';
import suggestTargetingRules, { buildPrompt } from './index.js';
import callLlm from '../../lib/llm/index.js';
import { OptionSource } from '../../lib/progress/constants.js';
import { runTable } from '../../lib/examples-runner/index.js';

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
        wantContains: ['2 total', 'option="strictness"', 'source="fallback"'],
      },
    },
    {
      name: 'includes policyReturned when present',
      inputs: {
        traces: [makeTrace({ policyReturned: 'high' })],
        wantContains: ['policyReturned="high"'],
      },
    },
    {
      name: 'omits policyReturned when undefined',
      inputs: {
        traces: [makeTrace({ policyReturned: undefined })],
        wantNotContains: ['policyReturned'],
      },
    },
    {
      name: 'includes error when present',
      inputs: {
        traces: [makeTrace({ error: 'provider down' })],
        wantContains: ['error="provider down"'],
      },
    },
    {
      name: 'appends instruction when provided',
      inputs: {
        traces: [makeTrace()],
        instruction: 'Focus on compliance',
        wantContains: ['Focus on compliance'],
      },
    },
    {
      name: 'omits instruction section when not provided',
      inputs: { traces: [makeTrace()], wantNotContains: ['Additional guidance'] },
    },
  ],
  process: ({ traces, instruction }) => buildPrompt(traces, instruction),
  expects: ({ result, inputs }) => {
    if (inputs.wantContains) {
      for (const fragment of inputs.wantContains) expect(result).toContain(fragment);
    }
    if (inputs.wantNotContains) {
      for (const fragment of inputs.wantNotContains) expect(result).not.toContain(fragment);
    }
  },
});

// ─── suggestTargetingRules: result + LLM-call-shape ─────────────────────

runTable({
  describe: 'suggestTargetingRules',
  examples: [
    {
      name: 'empty traces → empty array, no LLM call',
      inputs: { traces: [], want: [], wantNoLlm: true },
    },
    {
      name: 'undefined traces → empty array',
      inputs: { traces: undefined, want: [] },
    },
    {
      name: 'returns rules from LLM and embeds traces in prompt',
      inputs: {
        traces: [
          makeTrace(),
          makeTrace({ source: OptionSource.fallback, policyReturned: undefined }),
        ],
        instruction: 'Focus on defaults',
        mock: () => callLlm.mockResolvedValueOnce({ rules: [makeRule()] }),
        want: [makeRule()],
        wantPromptContains: ['decision traces', 'strictness', 'Focus on defaults'],
        wantSchemaName: 'targeting_rules',
      },
    },
    {
      name: 'handles LLM returning a bare array',
      inputs: {
        traces: [makeTrace()],
        mock: () => callLlm.mockResolvedValueOnce([makeRule()]),
        want: [makeRule()],
      },
    },
    {
      name: 'passes config through to callLlm',
      inputs: {
        traces: [makeTrace()],
        options: { llm: { fast: true, good: true } },
        mock: () => callLlm.mockResolvedValueOnce({ rules: [] }),
        wantLlmConfig: { fast: true, good: true },
      },
    },
    {
      name: 'rule output preserves targeting-rule AST shape',
      inputs: {
        traces: [makeTrace()],
        mock: () =>
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
        wantClauses: [
          { attribute: 'domain', op: 'in', values: ['medical', 'financial'] },
          { attribute: 'plan', op: 'in', values: ['enterprise'] },
        ],
        wantOption: 'strictness',
        wantValue: 'high',
      },
    },
  ],
  process: async ({ traces, instruction, options, mock }) => {
    if (mock) mock();
    return suggestTargetingRules(traces, instruction, options);
  },
  expects: ({ result, inputs }) => {
    if ('want' in inputs) expect(result).toEqual(inputs.want);
    if (inputs.wantNoLlm) expect(callLlm).not.toHaveBeenCalled();
    if (inputs.wantPromptContains) {
      const [prompt, config] = callLlm.mock.calls[0];
      for (const fragment of inputs.wantPromptContains) expect(prompt).toContain(fragment);
      if (inputs.wantSchemaName) {
        expect(config.responseFormat.json_schema.name).toBe(inputs.wantSchemaName);
      }
    }
    if (inputs.wantLlmConfig) {
      const config = callLlm.mock.calls[0][1];
      expect(config.llm).toEqual(inputs.wantLlmConfig);
    }
    if (inputs.wantClauses) {
      expect(result[0].clauses).toEqual(inputs.wantClauses);
      expect(result[0].option).toBe(inputs.wantOption);
      expect(result[0].value).toBe(inputs.wantValue);
    }
  },
});
