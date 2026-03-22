import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../sensitivity-scan/index.js', () => ({
  default: vi.fn(),
}));

vi.mock('../depersonalize/index.js', () => ({
  default: vi.fn(),
  applyDepersonalize: vi.fn(),
}));

vi.mock('../redact/index.js', () => ({
  default: vi.fn(),
  applyRedact: vi.fn(),
}));

vi.mock('../../lib/sensitivity-classify/index.js', () => ({
  default: vi.fn(),
}));

const { default: sensitivityScan } = await import('../sensitivity-scan/index.js');
const { default: depersonalize, applyDepersonalize } = await import('../depersonalize/index.js');
const { default: redact, applyRedact } = await import('../redact/index.js');
const { default: sensitivityClassify } = await import('../../lib/sensitivity-classify/index.js');
const {
  default: sensitivityGuard,
  createSensitivityGuard,
  protectionStrategy,
  mapInstructions,
  filterInstructions,
  reduceInstructions,
  findInstructions,
  groupInstructions,
} = await import('./index.js');

beforeEach(() => {
  sensitivityScan.mockReset();
  depersonalize.mockReset();
  redact.mockReset();
  applyRedact.mockReset();
  applyDepersonalize.mockReset();
  sensitivityClassify.mockReset();
});

const cleanScan = { flagged: false, hits: [] };
const cleanClassification = {
  level: 'none',
  maxScore: 0,
  categories: {},
  summary: 'No sensitive content detected.',
};
const flaggedScan = {
  flagged: true,
  hits: [
    {
      category: 'pii-name',
      label: 'Personal Names',
      score: 0.85,
      chunk: { text: 'John Smith', start: 0, end: 10 },
    },
  ],
};
const classificationResult = {
  level: 'high',
  maxScore: 0.85,
  categories: { 'pii-name': { count: 1, maxScore: 0.85, severity: 'high' } },
  summary: 'high risk: 1 category detected (pii-name)',
};
const depersonalizedResult = {
  text: 'A person was seen at the location.',
  stages: { distinctiveContentRemoved: 'A person was seen at the location.' },
};
const redactedResult = {
  text: '[NAME] was seen at the park.',
  replacements: [{ original: 'John Smith', replacement: '[NAME]', start: 0, end: 10 }],
};

/** Set up mocks for a flagged depersonalize path */
const setupFlaggedDepersonalize = () => {
  sensitivityScan.mockResolvedValueOnce(flaggedScan);
  sensitivityClassify.mockReturnValueOnce(classificationResult);
  depersonalize.mockResolvedValueOnce(depersonalizedResult);
};

/** Set up mocks for a flagged redact path */
const setupFlaggedRedact = () => {
  sensitivityScan.mockResolvedValueOnce(flaggedScan);
  sensitivityClassify.mockReturnValueOnce(classificationResult);
  redact.mockResolvedValueOnce(redactedResult);
};

describe('protectionStrategy', () => {
  it('REDACT matches string literal', () => {
    expect(protectionStrategy.REDACT).toBe('redact');
  });

  it('DEPERSONALIZE matches string literal', () => {
    expect(protectionStrategy.DEPERSONALIZE).toBe('depersonalize');
  });
});

describe('sensitivityGuard', () => {
  it('returns original text when scan is clean', async () => {
    sensitivityScan.mockResolvedValueOnce(cleanScan);
    sensitivityClassify.mockReturnValueOnce(cleanClassification);

    const result = await sensitivityGuard('The weather is nice today.');

    expect(result.flagged).toBe(false);
    expect(result.text).toBe('The weather is nice today.');
    expect(result.scan).toBe(cleanScan);
    expect(result.classification).toEqual(cleanClassification);
    expect(result).toHaveProperty('protection', undefined);
    expect(result).toHaveProperty('verification', undefined);
    expect(depersonalize).not.toHaveBeenCalled();
    expect(redact).not.toHaveBeenCalled();
  });

  it('depersonalizes text when scan is flagged (default protection)', async () => {
    setupFlaggedDepersonalize();

    const result = await sensitivityGuard('John Smith was seen at the park.');

    expect(result.flagged).toBe(true);
    expect(result.text).toBe('A person was seen at the location.');
    expect(result.scan).toBe(flaggedScan);
    expect(result.classification).toEqual(classificationResult);
    expect(result.protection.strategy).toBe('depersonalize');
    expect(result.protection.text).toBe('A person was seen at the location.');
    expect(result.protection.stages).toBe(depersonalizedResult.stages);
    expect(result).toHaveProperty('verification', undefined);
  });

  it('passes threshold, categories, maxTokens to sensitivityScan', async () => {
    sensitivityScan.mockResolvedValueOnce(cleanScan);
    sensitivityClassify.mockReturnValueOnce(cleanClassification);

    await sensitivityGuard('text', { threshold: 0.6, categories: ['pii-name'], maxTokens: 128 });

    expect(sensitivityScan).toHaveBeenCalledWith('text', {
      threshold: 0.6,
      categories: ['pii-name'],
      maxTokens: 128,
    });
  });

  it('passes method, llm, maxAttempts, onProgress to depersonalize', async () => {
    setupFlaggedDepersonalize();

    const onProgress = vi.fn();
    await sensitivityGuard('John Smith', {
      method: 'strict',
      llm: { sensitive: true },
      maxAttempts: 5,
      onProgress,
    });

    expect(depersonalize).toHaveBeenCalledWith('John Smith', {
      method: 'strict',
      context: undefined,
      llm: { sensitive: true },
      maxAttempts: 5,
      onProgress,
    });
  });

  it('uses default method "balanced" when not specified', async () => {
    setupFlaggedDepersonalize();

    await sensitivityGuard('John Smith');

    expect(depersonalize).toHaveBeenCalledWith('John Smith', {
      method: 'balanced',
      context: undefined,
      llm: undefined,
      maxAttempts: undefined,
      onProgress: undefined,
    });
  });

  it('rescans protected text when verify is true', async () => {
    const verificationScan = { flagged: false, hits: [] };
    sensitivityScan.mockResolvedValueOnce(flaggedScan).mockResolvedValueOnce(verificationScan);
    sensitivityClassify.mockReturnValueOnce(classificationResult);
    depersonalize.mockResolvedValueOnce(depersonalizedResult);

    const result = await sensitivityGuard('John Smith', { verify: true });

    expect(sensitivityScan).toHaveBeenCalledTimes(2);
    expect(sensitivityScan).toHaveBeenLastCalledWith('A person was seen at the location.', {
      threshold: 0.4,
      categories: undefined,
      maxTokens: 256,
    });
    expect(result.verification).toEqual({ flagged: false, scan: verificationScan });
    expect(result.text).toBe('A person was seen at the location.');
  });

  it('verification reflects residual sensitivity issues', async () => {
    const stillFlaggedScan = {
      flagged: true,
      hits: [
        {
          category: 'contact-email',
          label: 'Email',
          score: 0.5,
          chunk: { text: 'john@x.com', start: 0, end: 10 },
        },
      ],
    };
    sensitivityScan.mockResolvedValueOnce(flaggedScan).mockResolvedValueOnce(stillFlaggedScan);
    sensitivityClassify.mockReturnValueOnce(classificationResult);
    depersonalize.mockResolvedValueOnce(depersonalizedResult);

    const result = await sensitivityGuard('John Smith john@x.com', { verify: true });

    expect(result.verification.flagged).toBe(true);
    expect(result.verification.scan).toBe(stillFlaggedScan);
  });

  it('does not include verification when verify is false', async () => {
    setupFlaggedDepersonalize();

    const result = await sensitivityGuard('John Smith', { verify: false });

    expect(result).toHaveProperty('verification', undefined);
    expect(sensitivityScan).toHaveBeenCalledTimes(1);
  });

  it('result.text is always the usable output', async () => {
    // Clean text: result.text === original
    sensitivityScan.mockResolvedValueOnce(cleanScan);
    sensitivityClassify.mockReturnValueOnce(cleanClassification);
    const clean = await sensitivityGuard('safe text');
    expect(clean.text).toBe('safe text');

    // Flagged text: result.text === depersonalized
    setupFlaggedDepersonalize();
    const guarded = await sensitivityGuard('John Smith secret data');
    expect(guarded.text).toBe('A person was seen at the location.');
  });
});

describe('redact protection', () => {
  it('calls redact (not depersonalize) when protection is "redact"', async () => {
    setupFlaggedRedact();

    const result = await sensitivityGuard('John Smith at the park.', { protection: 'redact' });

    expect(redact).toHaveBeenCalledWith(
      'John Smith at the park.',
      expect.objectContaining({ scan: flaggedScan, mode: 'placeholder' })
    );
    expect(depersonalize).not.toHaveBeenCalled();
    expect(result.flagged).toBe(true);
    expect(result.text).toBe('[NAME] was seen at the park.');
    expect(result.protection.strategy).toBe('redact');
    expect(result.protection.text).toBe('[NAME] was seen at the park.');
    expect(result.protection.replacements).toBe(redactedResult.replacements);
    expect(result.classification).toEqual(classificationResult);
  });

  it('passes scan for guided mode', async () => {
    setupFlaggedRedact();

    await sensitivityGuard('John Smith', { protection: 'redact' });

    expect(redact).toHaveBeenCalledWith(
      'John Smith',
      expect.objectContaining({ scan: flaggedScan })
    );
  });

  it('passes custom mode to redact', async () => {
    setupFlaggedRedact();

    await sensitivityGuard('John Smith', { protection: 'redact', mode: 'generalize' });

    expect(redact).toHaveBeenCalledWith(
      'John Smith',
      expect.objectContaining({ mode: 'generalize' })
    );
  });
});

describe('custom function protection', () => {
  it('calls custom function with text and context', async () => {
    const customResult = { text: 'custom output', metadata: 42 };
    const customFn = vi.fn().mockResolvedValueOnce(customResult);

    sensitivityScan.mockResolvedValueOnce(flaggedScan);
    sensitivityClassify.mockReturnValueOnce(classificationResult);

    const result = await sensitivityGuard('John Smith', {
      protection: customFn,
      llm: { fast: true },
      maxAttempts: 3,
    });

    expect(customFn).toHaveBeenCalledWith('John Smith', {
      scan: flaggedScan,
      llm: { fast: true },
      maxAttempts: 3,
      onProgress: undefined,
    });
    expect(result.flagged).toBe(true);
    expect(result.text).toBe('custom output');
    expect(result.protection.strategy).toBe('custom');
    expect(result.protection.text).toBe('custom output');
    expect(result.protection.metadata).toBe(42);
    expect(result.classification).toEqual(classificationResult);
  });
});

describe('scan passthrough', () => {
  it('skips sensitivityScan when scan is provided', async () => {
    sensitivityClassify.mockReturnValueOnce(classificationResult);
    depersonalize.mockResolvedValueOnce(depersonalizedResult);

    const result = await sensitivityGuard('John Smith', { scan: flaggedScan });

    expect(sensitivityScan).not.toHaveBeenCalled();
    expect(result.scan).toBe(flaggedScan);
    expect(result.flagged).toBe(true);
  });

  it('short-circuits when provided scan is clean', async () => {
    sensitivityClassify.mockReturnValueOnce(cleanClassification);

    const result = await sensitivityGuard('safe text', { scan: cleanScan });

    expect(sensitivityScan).not.toHaveBeenCalled();
    expect(depersonalize).not.toHaveBeenCalled();
    expect(result.flagged).toBe(false);
    expect(result.text).toBe('safe text');
    expect(result.classification).toEqual(cleanClassification);
  });

  it('proceeds to protection when provided scan is flagged', async () => {
    sensitivityClassify.mockReturnValueOnce(classificationResult);
    depersonalize.mockResolvedValueOnce(depersonalizedResult);

    const result = await sensitivityGuard('John Smith', { scan: flaggedScan });

    expect(result.flagged).toBe(true);
    expect(result.protection.strategy).toBe('depersonalize');
  });
});

describe('specification support', () => {
  const spec = { mode: 'placeholder', targetCategories: ['pii-name'] };

  it('routes specification + redact to applyRedact', async () => {
    const appliedResult = {
      text: '[PERSON]',
      replacements: [{ original: 'John', replacement: '[PERSON]' }],
    };
    sensitivityScan.mockResolvedValueOnce(flaggedScan);
    sensitivityClassify.mockReturnValueOnce(classificationResult);
    applyRedact.mockResolvedValueOnce(appliedResult);

    const result = await sensitivityGuard('John Smith', {
      protection: 'redact',
      specification: spec,
    });

    expect(applyRedact).toHaveBeenCalledWith(
      'John Smith',
      spec,
      expect.objectContaining({ scan: flaggedScan })
    );
    expect(redact).not.toHaveBeenCalled();
    expect(result.protection.strategy).toBe('redact');
    expect(result.protection.text).toBe('[PERSON]');
    expect(result.protection.replacements).toBe(appliedResult.replacements);
  });

  it('routes specification + depersonalize to applyDepersonalize', async () => {
    const depersonalizeSpec = { method: 'strict', stylistic: true };
    const appliedResult = { text: 'Someone was there.', stages: {} };
    sensitivityScan.mockResolvedValueOnce(flaggedScan);
    sensitivityClassify.mockReturnValueOnce(classificationResult);
    applyDepersonalize.mockResolvedValueOnce(appliedResult);

    const result = await sensitivityGuard('John Smith', {
      protection: 'depersonalize',
      specification: depersonalizeSpec,
    });

    expect(applyDepersonalize).toHaveBeenCalledWith(
      'John Smith',
      depersonalizeSpec,
      expect.objectContaining({})
    );
    expect(depersonalize).not.toHaveBeenCalled();
    expect(result.protection.strategy).toBe('depersonalize');
    expect(result.protection.text).toBe('Someone was there.');
  });
});

describe('classification', () => {
  it('includes classification in flagged results', async () => {
    setupFlaggedDepersonalize();

    const result = await sensitivityGuard('John Smith');

    expect(sensitivityClassify).toHaveBeenCalledWith(flaggedScan);
    expect(result.classification).toEqual(classificationResult);
  });

  it('includes none-level classification in clean results', async () => {
    sensitivityScan.mockResolvedValueOnce(cleanScan);
    sensitivityClassify.mockReturnValueOnce(cleanClassification);

    const result = await sensitivityGuard('safe text');

    expect(sensitivityClassify).toHaveBeenCalledWith(cleanScan);
    expect(result.classification).toEqual(cleanClassification);
    expect(result.classification.level).toBe('none');
  });
});

describe('createSensitivityGuard', () => {
  it('returns a function with .options property', () => {
    const options = { threshold: 0.3, method: 'strict' };
    const guard = createSensitivityGuard(options);

    expect(typeof guard).toBe('function');
    expect(guard.options).toBe(options);
  });

  it('.options is enumerable', () => {
    const guard = createSensitivityGuard({ threshold: 0.5 });
    const keys = Object.keys(guard);
    expect(keys).toContain('options');
  });

  it('delegates to sensitivityGuard with configured options', async () => {
    const options = { threshold: 0.6, categories: ['pii-name'], method: 'strict' };
    const guard = createSensitivityGuard(options);

    sensitivityScan.mockResolvedValueOnce(flaggedScan);
    sensitivityClassify.mockReturnValueOnce(classificationResult);
    depersonalize.mockResolvedValueOnce(depersonalizedResult);

    const result = await guard('John Smith');

    expect(result.flagged).toBe(true);
    expect(result.text).toBe('A person was seen at the location.');
    expect(sensitivityScan).toHaveBeenCalledWith('John Smith', {
      threshold: 0.6,
      categories: ['pii-name'],
      maxTokens: 256,
    });
    expect(depersonalize).toHaveBeenCalledWith('John Smith', {
      method: 'strict',
      context: undefined,
      llm: undefined,
      maxAttempts: undefined,
      onProgress: undefined,
    });
  });

  it('works with default options', async () => {
    const guard = createSensitivityGuard();

    sensitivityScan.mockResolvedValueOnce(cleanScan);
    sensitivityClassify.mockReturnValueOnce(cleanClassification);
    const result = await guard('safe text');

    expect(result.flagged).toBe(false);
    expect(result.text).toBe('safe text');
    expect(guard.options).toEqual({});
  });

  it('works with policy presets', async () => {
    const hipaaPreset = {
      threshold: 0.3,
      categories: ['medical-diagnosis', 'pii-name'],
      protection: 'redact',
      mode: 'placeholder',
    };
    const guard = createSensitivityGuard(hipaaPreset);

    expect(guard.options).toBe(hipaaPreset);

    sensitivityScan.mockResolvedValueOnce(cleanScan);
    sensitivityClassify.mockReturnValueOnce(cleanClassification);
    await guard('some text');

    expect(sensitivityScan).toHaveBeenCalledWith('some text', {
      threshold: 0.3,
      categories: ['medical-diagnosis', 'pii-name'],
      maxTokens: 256,
    });
  });
});

describe('instruction builders', () => {
  const mockSpec = {
    threshold: 0.35,
    categories: ['pii-name', 'medical-diagnosis'],
    protection: 'depersonalize',
    mode: 'placeholder',
    method: 'strict',
    verify: true,
    context: 'medical research dataset',
  };

  const toText = (s) => s.toString();

  it('mapInstructions with custom processing', () => {
    const instructions = mapInstructions({
      specification: mockSpec,
      processing: 'Guard each patient record independently',
    });
    const text = toText(instructions);
    expect(text).toContain('processing-instructions');
    expect(text).toContain('guard-specification');
  });

  it('mapInstructions without processing', () => {
    const instructions = mapInstructions({ specification: mockSpec });
    const text = toText(instructions);
    expect(text).toContain('guard-specification');
    expect(text).not.toContain('processing-instructions');
  });

  it('filterInstructions with criteria and defaults', () => {
    const withCriteria = filterInstructions({
      specification: mockSpec,
      processing: 'Keep items with medical PII',
    });
    expect(toText(withCriteria)).toContain('filter-criteria');

    const defaults = filterInstructions({ specification: mockSpec });
    expect(toText(defaults)).toContain('sensitive or personally identifiable');
    expect(toText(defaults)).toContain('guard-specification');
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
      processing: 'Group by sensitivity severity',
    });
    expect(toText(withStrategy)).toContain('grouping-strategy');

    const defaults = groupInstructions({ specification: mockSpec });
    expect(toText(defaults)).toContain('within each group');
  });
});
