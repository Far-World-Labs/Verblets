import { describe, it, expect, vi, beforeEach } from 'vitest';
import calibrate, { calibrateSpec, applyCalibrate, createCalibratedClassifier } from './index.js';
import llm from '../../lib/llm/index.js';

vi.mock('../../lib/llm/index.js', async (importOriginal) => ({
  ...(await importOriginal()),
  default: vi.fn(),
}));

const mockSpec = {
  corpusProfile: 'Mixed PII and financial data across 3 documents',
  classificationCriteria: 'Critical for government IDs and credentials, high for financial',
  salienceCriteria: 'Exceptional if multiple critical categories co-occur',
  categoryNotes: 'pii-name appears in 80% of scans — routine baseline',
};

const mockResult = {
  severity: 'high',
  salience: 'notable',
  categories: {
    'pii-name': { severity: 'medium', salience: 'routine' },
    'financial-card': { severity: 'critical', salience: 'notable' },
  },
  summary: 'Contains PII names (routine) plus a payment card number (notable for this corpus)',
};

const makeScan = (categories, scores) => ({
  flagged: categories.length > 0,
  hits: categories.map((category, i) => ({
    category,
    label: category,
    score: scores[i],
    chunk: { text: 'test', start: 0, end: 4 },
  })),
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('calibrateSpec', () => {
  it('computes statistics from scans and passes to LLM with schema', async () => {
    vi.mocked(llm).mockResolvedValueOnce(mockSpec);

    const scans = [
      makeScan(['pii-name', 'financial-card'], [0.9, 0.8]),
      makeScan(['pii-name'], [0.7]),
      makeScan([], []),
    ];

    const result = await calibrateSpec(scans);

    expect(result).toEqual(mockSpec);

    const [prompt, options] = vi.mocked(llm).mock.calls[0];
    expect(prompt).toContain('<scan-statistics>');
    expect(prompt).toContain('"totalScans": 3');
    expect(prompt).toContain('"flaggedScans": 2');
    expect(prompt).toContain('"flaggedPercent": 67');
    expect(prompt).toContain('"pii-name"');
    expect(prompt).toContain('"financial-card"');
    expect(prompt).not.toContain('<classification-instructions>');

    expect(options.systemPrompt).toContain('calibration specification generator');
  });

  it('includes instructions when provided', async () => {
    vi.mocked(llm).mockResolvedValueOnce(mockSpec);

    await calibrateSpec([makeScan(['pii-name'], [0.9])], {
      instructions: 'Classify privacy risk in medical records',
    });

    const [prompt] = vi.mocked(llm).mock.calls[0];
    expect(prompt).toContain('<classification-instructions>');
    expect(prompt).toContain('Classify privacy risk in medical records');
  });

  it('handles empty scans array', async () => {
    vi.mocked(llm).mockResolvedValueOnce(mockSpec);

    await calibrateSpec([]);

    const [prompt] = vi.mocked(llm).mock.calls[0];
    expect(prompt).toContain('"totalScans": 0');
    expect(prompt).toContain('"flaggedScans": 0');
    expect(prompt).toContain('"flaggedPercent": 0');
  });

  it.each([
    ['low', 'conservative', true],
    ['high', 'sensitive', true],
    [undefined, 'Classification posture', false],
  ])(
    'sensitivity %s — prompt %s posture marker: %s',
    async (sensitivity, marker, shouldContain) => {
      vi.mocked(llm).mockResolvedValueOnce(mockSpec);

      await calibrateSpec(
        [makeScan(['pii-name'], [0.9])],
        sensitivity ? { sensitivity } : undefined
      );

      const [prompt] = vi.mocked(llm).mock.calls[0];
      if (shouldContain) {
        expect(prompt).toContain(marker);
      } else {
        expect(prompt).not.toContain(marker);
      }
    }
  );
});

describe('applyCalibrate', () => {
  it('passes scan + spec to LLM and returns result with severity + salience', async () => {
    vi.mocked(llm).mockResolvedValueOnce(mockResult);

    const scan = makeScan(['pii-name', 'financial-card'], [0.9, 0.8]);
    const result = await applyCalibrate(scan, mockSpec);

    expect(result).toEqual(mockResult);
    expect(result.severity).toBe('high');
    expect(result.salience).toBe('notable');
    expect(result.categories['pii-name']).toEqual({ severity: 'medium', salience: 'routine' });
    expect(result.categories['financial-card']).toEqual({
      severity: 'critical',
      salience: 'notable',
    });
    expect(result.summary).toBeDefined();

    const [prompt] = vi.mocked(llm).mock.calls[0];
    expect(prompt).toContain('<calibration-specification>');
    expect(prompt).toContain('<scan-result>');
  });
});

describe('createCalibratedClassifier', () => {
  it('bakes in spec, exposes .specification, reuses across calls', async () => {
    vi.mocked(llm)
      .mockResolvedValueOnce(mockResult)
      .mockResolvedValueOnce({
        ...mockResult,
        severity: 'low',
        salience: 'routine',
      });

    const classify = createCalibratedClassifier(mockSpec);

    expect(classify.specification).toBe(mockSpec);

    const scan1 = makeScan(['pii-name'], [0.9]);
    const scan2 = makeScan(['financial-card'], [0.6]);
    const result1 = await classify(scan1);
    const result2 = await classify(scan2);

    expect(result1.severity).toBe('high');
    expect(result2.severity).toBe('low');
    expect(llm).toHaveBeenCalledTimes(2);

    // Both calls should include the same spec in the prompt
    const [prompt1] = vi.mocked(llm).mock.calls[0];
    const [prompt2] = vi.mocked(llm).mock.calls[1];
    expect(prompt1).toContain(mockSpec.corpusProfile);
    expect(prompt2).toContain(mockSpec.corpusProfile);
  });
});

describe('calibrate (default export)', () => {
  it('returns function with .instructions that calls spec + apply', async () => {
    vi.mocked(llm)
      .mockResolvedValueOnce(mockSpec) // calibrateSpec call
      .mockResolvedValueOnce(mockResult); // applyCalibrate call

    const classify = calibrate('Classify privacy risk');
    expect(classify.instructions).toBe('Classify privacy risk');

    const scan = makeScan(['pii-name', 'financial-card'], [0.9, 0.8]);
    const result = await classify(scan);

    expect(result).toEqual(mockResult);
    expect(llm).toHaveBeenCalledTimes(2);

    // First call should be calibrateSpec with instructions
    const [specPrompt] = vi.mocked(llm).mock.calls[0];
    expect(specPrompt).toContain('<classification-instructions>');
    expect(specPrompt).toContain('Classify privacy risk');

    // Second call should be applyCalibrate
    const [applyPrompt] = vi.mocked(llm).mock.calls[1];
    expect(applyPrompt).toContain('<calibration-specification>');
    expect(applyPrompt).toContain('<scan-result>');
  });

  it('works without instructions', async () => {
    vi.mocked(llm).mockResolvedValueOnce(mockSpec).mockResolvedValueOnce(mockResult);

    const classify = calibrate();
    expect(classify.instructions).toBeUndefined();

    const scan = makeScan(['pii-name'], [0.9]);
    await classify(scan);

    const [specPrompt] = vi.mocked(llm).mock.calls[0];
    expect(specPrompt).not.toContain('<classification-instructions>');
  });
});
