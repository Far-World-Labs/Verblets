import { describe, expect, it, vi } from 'vitest';

const mockSpec = {
  method: 'balanced',
  preservationRules: 'Preserve factual content and technical accuracy',
  removalTargets: 'Remove idioms, personal anecdotes, distinctive sentence structures',
  consistencyGuidelines: 'Maintain uniform tone across all processed texts',
  contextNotes: 'General-purpose depersonalization',
};

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn().mockImplementation((prompt) => {
    if (prompt.includes('depersonalization-instructions')) {
      return Promise.resolve(mockSpec);
    }
    return Promise.resolve('depersonalized text');
  }),
}));

const { default: callLlm } = await import('../../lib/llm/index.js');

const {
  default: depersonalize,
  depersonalizeMethod,
  depersonalizeSpec,
  applyDepersonalize,
  createDepersonalizer,
  mapInstructions,
  filterInstructions,
  reduceInstructions,
  findInstructions,
  groupInstructions,
} = await import('./index.js');

const sampleText = 'John Smith met Sarah at Apple Inc on January 1st, 2024.';

describe('depersonalize', () => {
  it('accepts (text, options?) signature', async () => {
    const result = await depersonalize(sampleText);
    expect(result).toMatchObject({
      text: expect.any(String),
      stages: expect.any(Object),
    });
  });

  it('validates text is non-empty string', async () => {
    await expect(depersonalize('')).rejects.toThrow('non-empty string');
    await expect(depersonalize(42)).rejects.toThrow('non-empty string');
    await expect(depersonalize(undefined)).rejects.toThrow('non-empty string');
  });

  it('validates method', async () => {
    await expect(depersonalize(sampleText, { method: 'invalid' })).rejects.toThrow(
      'Method must be one of'
    );
  });

  it('validates context type', async () => {
    await expect(depersonalize(sampleText, { context: 42 })).rejects.toThrow(
      'Context must be a string'
    );
  });

  it('defaults to balanced method (2 stages)', async () => {
    const result = await depersonalize(sampleText);
    expect(result.stages).toHaveProperty('distinctiveContentRemoved');
    expect(result.stages).toHaveProperty('structureNormalized');
    expect(result.stages).not.toHaveProperty('patternsSuppressed');
  });

  it('light method runs 1 stage', async () => {
    const result = await depersonalize(sampleText, { method: 'light' });
    expect(result.stages).toHaveProperty('distinctiveContentRemoved');
    expect(result.stages).not.toHaveProperty('structureNormalized');
  });

  it('strict method runs 3 stages', async () => {
    const result = await depersonalize(sampleText, { method: 'strict' });
    expect(result.stages).toHaveProperty('distinctiveContentRemoved');
    expect(result.stages).toHaveProperty('structureNormalized');
    expect(result.stages).toHaveProperty('patternsSuppressed');
  });

  it('passes context to stage prompts', async () => {
    await depersonalize(sampleText, { method: 'light', context: 'Academic paper' });
    const prompt = callLlm.mock.calls.at(-1)[0];
    expect(prompt).toContain('Context: Academic paper');
  });

  it('defaults llm to { sensitive: true, good: true }', async () => {
    await depersonalize(sampleText, { method: 'light' });
    const opts = callLlm.mock.calls.at(-1)[1];
    expect(opts.llm).toEqual({ sensitive: true, good: true });
  });
});

describe('depersonalizeSpec', () => {
  it('returns structured JSON (not free text)', async () => {
    const spec = await depersonalizeSpec('Remove all personal writing style');
    expect(spec).toEqual(mockSpec);
    expect(spec).toHaveProperty('method');
    expect(spec).toHaveProperty('preservationRules');
    expect(spec).toHaveProperty('removalTargets');
    expect(spec).toHaveProperty('consistencyGuidelines');
  });

  it('uses response_format with JSON schema', async () => {
    await depersonalizeSpec('Remove personal style');
    const opts = callLlm.mock.calls.at(-1)[1];
    expect(opts.modelOptions.response_format.type).toBe('json_schema');
    expect(opts.modelOptions.response_format.json_schema.name).toBe('depersonalize_specification');
  });
});

describe('applyDepersonalize', () => {
  it('injects specification into stage prompts', async () => {
    await applyDepersonalize(sampleText, mockSpec);
    const prompt = callLlm.mock.calls.at(-1)[0];
    expect(prompt).toContain('depersonalization-rules');
    expect(prompt).toContain(mockSpec.preservationRules);
  });

  it('uses specification.method to control stage count', async () => {
    const lightSpec = { ...mockSpec, method: 'light' };
    const result = await applyDepersonalize(sampleText, lightSpec);
    expect(result.stages).toHaveProperty('distinctiveContentRemoved');
    expect(result.stages).not.toHaveProperty('structureNormalized');
  });

  it('defaults method to balanced when specification.method is missing', async () => {
    const noMethodSpec = { ...mockSpec, method: undefined };
    const result = await applyDepersonalize(sampleText, noMethodSpec);
    expect(result.stages).toHaveProperty('structureNormalized');
    expect(result.stages).not.toHaveProperty('patternsSuppressed');
  });
});

describe('createDepersonalizer', () => {
  it('returns a function with .specification property', () => {
    const fn = createDepersonalizer(mockSpec);
    expect(typeof fn).toBe('function');
    expect(fn.specification).toBe(mockSpec);
  });

  it('.specification is enumerable', () => {
    const fn = createDepersonalizer(mockSpec);
    expect(Object.keys(fn)).toContain('specification');
  });

  it('delegates to applyDepersonalize with baked spec', async () => {
    const fn = createDepersonalizer(mockSpec);
    const result = await fn(sampleText);
    expect(result).toHaveProperty('text');
    expect(result).toHaveProperty('stages');
  });
});

describe('instruction builders', () => {
  const toText = (s) => s.toString();

  it('mapInstructions with custom processing', () => {
    const instructions = mapInstructions({
      specification: mockSpec,
      processing: 'Process each review independently',
    });
    const text = toText(instructions);
    expect(text).toContain('processing-instructions');
    expect(text).toContain('depersonalization-specification');
  });

  it('mapInstructions without processing', () => {
    const instructions = mapInstructions({ specification: mockSpec });
    const text = toText(instructions);
    expect(text).toContain('depersonalization-specification');
    expect(text).not.toContain('processing-instructions');
  });

  it('filterInstructions with criteria and defaults', () => {
    const withCriteria = filterInstructions({
      specification: mockSpec,
      processing: 'Keep financial information',
    });
    expect(toText(withCriteria)).toContain('filter-criteria');

    const defaults = filterInstructions({ specification: mockSpec });
    expect(toText(defaults)).toContain('moderate threshold');
    expect(toText(defaults)).toContain('depersonalization-specification');
  });

  it('reduceInstructions combines properly', () => {
    const instructions = reduceInstructions({
      specification: mockSpec,
      processing: 'Combine customer feedback',
    });
    expect(toText(instructions)).toContain('reduce-operation');
    expect(toText(instructions)).toContain('final accumulated result');
  });

  it('findInstructions selects correctly', () => {
    const withCriteria = findInstructions({
      specification: mockSpec,
      processing: 'Find most distinctive',
    });
    expect(toText(withCriteria)).toContain('selection-criteria');

    const defaults = findInstructions({ specification: mockSpec });
    expect(toText(defaults)).toContain('selected item');
  });

  it('groupInstructions organizes properly', () => {
    const withStrategy = groupInstructions({
      specification: mockSpec,
      processing: 'Group by type and distinctiveness',
    });
    expect(toText(withStrategy)).toContain('grouping-strategy');

    const defaults = groupInstructions({ specification: mockSpec });
    expect(toText(defaults)).toContain('within each group');
  });
});

describe('depersonalizeMethod enum', () => {
  it('exposes all method values', () => {
    expect(depersonalizeMethod.STRICT).toBe('strict');
    expect(depersonalizeMethod.BALANCED).toBe('balanced');
    expect(depersonalizeMethod.LIGHT).toBe('light');
  });
});
