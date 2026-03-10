import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRedactionResult = {
  text: '[PERSON_1] was seen at [ADDRESS_1].',
  replacements: [
    { category: 'pii-name', original: 'John Smith', replacement: '[PERSON_1]' },
    { category: 'contact-address', original: '123 Main St', replacement: '[ADDRESS_1]' },
  ],
};

const mockGeneralizeResult = {
  text: 'A person was seen at a physical address.',
  replacements: [
    { category: 'pii-name', original: 'John Smith', replacement: 'a person' },
    { category: 'contact-address', original: '123 Main St', replacement: 'a physical address' },
  ],
};

const mockSpec = {
  mode: 'placeholder',
  targetCategories: ['pii-name', 'contact-email', 'gov-id'],
  replacementRules: 'Use HIPAA Safe Harbor placeholders for all PHI',
  edgeCases: 'Treat partial names as PII when combined with other identifiers',
  contextNotes: 'Medical record context — treat all dates as potentially sensitive',
};

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn().mockImplementation((prompt) => {
    if (prompt.includes('redaction-instructions')) {
      return Promise.resolve(mockSpec);
    }
    return Promise.resolve(mockRedactionResult);
  }),
}));

const { default: callLlm } = await import('../../lib/llm/index.js');
const {
  default: redact,
  createRedactor,
  redactMode,
  redactSpec,
  applyRedact,
  mapInstructions,
  filterInstructions,
  reduceInstructions,
  findInstructions,
  groupInstructions,
} = await import('./index.js');

beforeEach(() => {
  callLlm.mockReset();
  callLlm.mockImplementation((prompt) => {
    if (prompt.includes('redaction-instructions')) {
      return Promise.resolve(mockSpec);
    }
    return Promise.resolve(mockRedactionResult);
  });
});

const sampleText = 'John Smith lives at 123 Main St.';
const flaggedScan = {
  flagged: true,
  hits: [
    {
      category: 'pii-name',
      label: 'Personal Names',
      score: 0.85,
      chunk: { text: 'John Smith', start: 0, end: 10 },
    },
    {
      category: 'contact-address',
      label: 'Physical Address',
      score: 0.72,
      chunk: { text: '123 Main St', start: 20, end: 31 },
    },
  ],
};
const cleanScan = { flagged: false, hits: [] };

describe('redact', () => {
  it('validates text is non-empty string', async () => {
    await expect(redact('')).rejects.toThrow('non-empty string');
    await expect(redact(undefined)).rejects.toThrow('non-empty string');
  });

  it('validates mode', async () => {
    await expect(redact(sampleText, { mode: 'invalid' })).rejects.toThrow('Mode must be one of');
  });

  describe('unguided mode (no scan)', () => {
    it('prompts LLM to find PII itself', async () => {
      const result = await redact(sampleText);

      expect(result.text).toBe('[PERSON_1] was seen at [ADDRESS_1].');
      expect(result.replacements).toHaveLength(2);
      expect(result.scan).toBeUndefined();

      const prompt = callLlm.mock.calls[0][0];
      expect(prompt).toContain('Identify and redact');
      expect(prompt).toContain(sampleText);
    });

    it('includes category hints when categories provided', async () => {
      await redact(sampleText, { categories: ['pii-name', 'contact-email'] });
      const prompt = callLlm.mock.calls[0][0];
      expect(prompt).toContain('pii-name');
      expect(prompt).toContain('PERSON');
    });
  });

  describe('guided mode (scan provided)', () => {
    it('includes flagged regions in prompt', async () => {
      const result = await redact(sampleText, { scan: flaggedScan });

      expect(result.scan).toBe(flaggedScan);
      const prompt = callLlm.mock.calls[0][0];
      expect(prompt).toContain('flagged by a sensitivity scan');
      expect(prompt).toContain('John Smith');
      expect(prompt).toContain('pii-name');
    });

    it('short-circuits when scan is not flagged', async () => {
      const result = await redact(sampleText, { scan: cleanScan });

      expect(result.text).toBe(sampleText);
      expect(result.replacements).toEqual([]);
      expect(result.scan).toBe(cleanScan);
      expect(callLlm).not.toHaveBeenCalled();
    });
  });

  describe('modes', () => {
    it('placeholder mode (default) instructs placeholder format', async () => {
      await redact(sampleText);
      const prompt = callLlm.mock.calls[0][0];
      expect(prompt).toContain('placeholder');
      expect(prompt).toContain('[PERSON_1]');
    });

    it('generalize mode instructs natural-language replacements', async () => {
      callLlm.mockResolvedValueOnce(mockGeneralizeResult);
      const result = await redact(sampleText, { mode: 'generalize' });
      const prompt = callLlm.mock.calls[0][0];
      expect(prompt).toContain('generalize');
      expect(prompt).toContain('a person');
      expect(result.text).toBe('A person was seen at a physical address.');
    });
  });

  it('uses response_format with JSON schema', async () => {
    await redact(sampleText);
    const opts = callLlm.mock.calls[0][1];
    expect(opts.modelOptions.response_format.type).toBe('json_schema');
    expect(opts.modelOptions.response_format.json_schema.name).toBe('redaction_result');
  });

  it('defaults llm to { sensitive: true, good: true }', async () => {
    await redact(sampleText);
    const opts = callLlm.mock.calls[0][1];
    expect(opts.llm).toEqual({ sensitive: true, good: true });
  });

  it('passes custom llm config', async () => {
    await redact(sampleText, { llm: { fast: true } });
    const opts = callLlm.mock.calls[0][1];
    expect(opts.llm).toEqual({ fast: true });
  });
});

describe('redactSpec', () => {
  it('returns structured JSON (not free text)', async () => {
    const spec = await redactSpec('Redact all PHI using HIPAA Safe Harbor method');
    expect(spec).toEqual(mockSpec);
    expect(spec).toHaveProperty('mode');
    expect(spec).toHaveProperty('targetCategories');
    expect(spec).toHaveProperty('replacementRules');
    expect(spec).toHaveProperty('edgeCases');
    expect(spec).toHaveProperty('contextNotes');
  });

  it('uses response_format with JSON schema', async () => {
    await redactSpec('Redact PII');
    const opts = callLlm.mock.calls.at(-1)[1];
    expect(opts.modelOptions.response_format.type).toBe('json_schema');
    expect(opts.modelOptions.response_format.json_schema.name).toBe('redaction_specification');
  });

  it('wraps instructions in redaction-instructions XML tag', async () => {
    await redactSpec('Remove all names and emails');
    const prompt = callLlm.mock.calls.at(-1)[0];
    expect(prompt).toContain('redaction-instructions');
    expect(prompt).toContain('Remove all names and emails');
  });

  it('defaults llm to { sensitive: true, good: true }', async () => {
    await redactSpec('Redact PII');
    const opts = callLlm.mock.calls.at(-1)[1];
    expect(opts.llm).toEqual({ sensitive: true, good: true });
  });

  it('passes custom llm config', async () => {
    await redactSpec('Redact PII', { llm: { fast: true } });
    const opts = callLlm.mock.calls.at(-1)[1];
    expect(opts.llm).toEqual({ fast: true });
  });
});

describe('applyRedact', () => {
  it('includes spec as redaction-rules in prompt', async () => {
    await applyRedact(sampleText, mockSpec);
    const prompt = callLlm.mock.calls.at(-1)[0];
    expect(prompt).toContain('redaction-rules');
    expect(prompt).toContain(mockSpec.replacementRules);
    expect(prompt).toContain(mockSpec.edgeCases);
  });

  it('derives mode from specification', async () => {
    await applyRedact(sampleText, mockSpec);
    const prompt = callLlm.mock.calls.at(-1)[0];
    expect(prompt).toContain('placeholder');
    expect(prompt).toContain('[PERSON_1]');
  });

  it('derives categories from specification.targetCategories', async () => {
    await applyRedact(sampleText, mockSpec);
    const prompt = callLlm.mock.calls.at(-1)[0];
    expect(prompt).toContain('pii-name');
    expect(prompt).toContain('gov-id');
  });

  it('guided mode with scan includes flagged regions', async () => {
    const result = await applyRedact(sampleText, mockSpec, { scan: flaggedScan });
    const prompt = callLlm.mock.calls.at(-1)[0];
    expect(prompt).toContain('flagged by a sensitivity scan');
    expect(prompt).toContain('redaction-rules');
    expect(result.scan).toBe(flaggedScan);
  });

  it('short-circuits on clean scan', async () => {
    const result = await applyRedact(sampleText, mockSpec, { scan: cleanScan });
    expect(result.text).toBe(sampleText);
    expect(result.replacements).toEqual([]);
    expect(result.scan).toBe(cleanScan);
    expect(callLlm).not.toHaveBeenCalled();
  });

  it('validates text is non-empty string', async () => {
    await expect(applyRedact('', mockSpec)).rejects.toThrow('non-empty string');
    await expect(applyRedact(undefined, mockSpec)).rejects.toThrow('non-empty string');
  });

  it('uses response_format with redaction_result schema', async () => {
    await applyRedact(sampleText, mockSpec);
    const opts = callLlm.mock.calls.at(-1)[1];
    expect(opts.modelOptions.response_format.json_schema.name).toBe('redaction_result');
  });

  it('defaults llm to { sensitive: true, good: true }', async () => {
    await applyRedact(sampleText, mockSpec);
    const opts = callLlm.mock.calls.at(-1)[1];
    expect(opts.llm).toEqual({ sensitive: true, good: true });
  });
});

describe('createRedactor', () => {
  it('returns a function with .specification property', () => {
    const fn = createRedactor(mockSpec);
    expect(typeof fn).toBe('function');
    expect(fn.specification).toBe(mockSpec);
  });

  it('.specification is enumerable', () => {
    const fn = createRedactor(mockSpec);
    expect(Object.keys(fn)).toContain('specification');
  });

  it('delegates to applyRedact with baked spec', async () => {
    const fn = createRedactor(mockSpec);
    const result = await fn(sampleText);
    expect(result.text).toBe('[PERSON_1] was seen at [ADDRESS_1].');

    const prompt = callLlm.mock.calls.at(-1)[0];
    expect(prompt).toContain('redaction-rules');
    expect(prompt).toContain(mockSpec.replacementRules);
  });
});

describe('instruction builders', () => {
  const toText = (s) => s.toString();

  it('mapInstructions with custom processing', () => {
    const instructions = mapInstructions({
      specification: mockSpec,
      processing: 'Redact each medical record independently',
    });
    const text = toText(instructions);
    expect(text).toContain('processing-instructions');
    expect(text).toContain('redaction-specification');
  });

  it('mapInstructions without processing', () => {
    const instructions = mapInstructions({ specification: mockSpec });
    const text = toText(instructions);
    expect(text).toContain('redaction-specification');
    expect(text).not.toContain('processing-instructions');
  });

  it('filterInstructions with criteria and defaults', () => {
    const withCriteria = filterInstructions({
      specification: mockSpec,
      processing: 'Keep items with medical PII',
    });
    expect(toText(withCriteria)).toContain('filter-criteria');

    const defaults = filterInstructions({ specification: mockSpec });
    expect(toText(defaults)).toContain('moderate threshold');
    expect(toText(defaults)).toContain('redaction-specification');
  });

  it('reduceInstructions combines properly', () => {
    const instructions = reduceInstructions({
      specification: mockSpec,
      processing: 'Combine patient records',
    });
    expect(toText(instructions)).toContain('reduce-operation');
    expect(toText(instructions)).toContain('final accumulated result');
  });

  it('findInstructions selects correctly', () => {
    const withCriteria = findInstructions({
      specification: mockSpec,
      processing: 'Find most sensitive record',
    });
    expect(toText(withCriteria)).toContain('selection-criteria');

    const defaults = findInstructions({ specification: mockSpec });
    expect(toText(defaults)).toContain('selected item');
  });

  it('groupInstructions organizes properly', () => {
    const withStrategy = groupInstructions({
      specification: mockSpec,
      processing: 'Group by PII type and severity',
    });
    expect(toText(withStrategy)).toContain('grouping-strategy');

    const defaults = groupInstructions({ specification: mockSpec });
    expect(toText(defaults)).toContain('within each group');
  });
});

describe('redactMode enum', () => {
  it('exposes mode values', () => {
    expect(redactMode.PLACEHOLDER).toBe('placeholder');
    expect(redactMode.GENERALIZE).toBe('generalize');
  });
});
