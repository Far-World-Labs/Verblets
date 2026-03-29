import { describe, it, expect, vi, beforeEach } from 'vitest';
import suggestTargetingRules, { buildPrompt } from './index.js';
import callLlm from '../../lib/llm/index.js';
import { OptionSource } from '../../lib/progress/constants.js';

vi.mock('../../lib/llm/index.js', () => ({
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

describe('suggest-targeting-rules', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('buildPrompt', () => {
    it('includes trace count and trace details', () => {
      const prompt = buildPrompt([
        makeTrace(),
        makeTrace({ value: 'low', source: OptionSource.fallback }),
      ]);
      expect(prompt).toContain('2 total');
      expect(prompt).toContain('option="strictness"');
      expect(prompt).toContain('source="fallback"');
    });

    it('includes policyReturned when present', () => {
      const prompt = buildPrompt([makeTrace({ policyReturned: 'high' })]);
      expect(prompt).toContain('policyReturned="high"');
    });

    it('omits policyReturned when undefined', () => {
      const prompt = buildPrompt([makeTrace({ policyReturned: undefined })]);
      expect(prompt).not.toContain('policyReturned');
    });

    it('includes error when present', () => {
      const prompt = buildPrompt([makeTrace({ error: 'provider down' })]);
      expect(prompt).toContain('error="provider down"');
    });

    it('appends instruction when provided', () => {
      const prompt = buildPrompt([makeTrace()], 'Focus on compliance');
      expect(prompt).toContain('Focus on compliance');
    });

    it('omits instruction section when not provided', () => {
      const prompt = buildPrompt([makeTrace()]);
      expect(prompt).not.toContain('Additional guidance');
    });
  });

  describe('suggestTargetingRules', () => {
    it('returns empty array for empty traces', async () => {
      const rules = await suggestTargetingRules([]);
      expect(rules).toEqual([]);
      expect(callLlm).not.toHaveBeenCalled();
    });

    it('returns empty array for undefined traces', async () => {
      const rules = await suggestTargetingRules(undefined);
      expect(rules).toEqual([]);
    });

    it('calls LLM with traces and returns rules', async () => {
      const mockRules = [makeRule()];
      callLlm.mockResolvedValueOnce({ rules: mockRules });

      const rules = await suggestTargetingRules(
        [makeTrace(), makeTrace({ source: OptionSource.fallback, policyReturned: undefined })],
        'Focus on defaults'
      );

      expect(rules).toEqual(mockRules);
      expect(callLlm).toHaveBeenCalledTimes(1);

      const [prompt, config] = callLlm.mock.calls[0];
      expect(prompt).toContain('decision traces');
      expect(prompt).toContain('strictness');
      expect(prompt).toContain('Focus on defaults');
      expect(config.response_format.json_schema.name).toBe('targeting_rules');
    });

    it('handles LLM returning bare array', async () => {
      const bare = [makeRule()];
      callLlm.mockResolvedValueOnce(bare);

      const rules = await suggestTargetingRules([makeTrace()]);
      expect(rules).toEqual(bare);
    });

    it('passes config through to callLlm', async () => {
      callLlm.mockResolvedValueOnce({ rules: [] });

      await suggestTargetingRules([makeTrace()], undefined, { llm: 'fastGood' });

      const config = callLlm.mock.calls[0][1];
      expect(config.llm).toBe('fastGood');
    });

    it('rule output matches targeting-rule AST shape', async () => {
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

      const rules = await suggestTargetingRules([makeTrace()]);

      expect(rules[0].clauses).toHaveLength(2);
      expect(rules[0].clauses[0]).toEqual({
        attribute: 'domain',
        op: 'in',
        values: ['medical', 'financial'],
      });
      expect(rules[0].option).toBe('strictness');
      expect(rules[0].value).toBe('high');
    });
  });
});
