import { describe, it, expect, vi, beforeEach } from 'vitest';
import calibrateItem, {
  calibrateSpec,
  calibrateInstructions,
  mapCalibrate,
  mapCalibrateParallel,
} from './index.js';
import map from '../map/index.js';
import llm from '../../lib/llm/index.js';

vi.mock('../../lib/llm/index.js', async (importOriginal) => ({
  ...(await importOriginal()),
  default: vi.fn(),
}));

vi.mock('../../lib/parallel-batch/index.js', () => ({
  default: vi.fn(async (items, processor) => {
    for (let i = 0; i < items.length; i++) {
      await processor(items[i], i);
    }
  }),
}));

vi.mock('../map/index.js', () => ({
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

describe('calibrateInstructions', () => {
  it('returns instruction bundle with spec', () => {
    const bundle = calibrateInstructions({ spec: mockSpec });

    expect(bundle.text).toContain('calibration specification');
    expect(bundle.spec).toBe(mockSpec);
  });

  it('passes through additional context keys', () => {
    const bundle = calibrateInstructions({ spec: mockSpec, domain: 'medical records' });

    expect(bundle.domain).toBe('medical records');
  });
});

describe('calibrateItem (default export)', () => {
  it('classifies a scan with spec + apply in one call', async () => {
    vi.mocked(llm)
      .mockResolvedValueOnce(mockSpec) // calibrateSpec call
      .mockResolvedValueOnce(mockResult); // applyCalibrate call

    const scan = makeScan(['pii-name', 'financial-card'], [0.9, 0.8]);
    const result = await calibrateItem(scan, 'Classify privacy risk');

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

  it('skips spec generation when spec provided via instruction bundle', async () => {
    vi.mocked(llm).mockResolvedValueOnce(mockResult);

    const scan = makeScan(['pii-name'], [0.9]);
    const result = await calibrateItem(scan, { text: 'Classify', spec: mockSpec });

    expect(result).toEqual(mockResult);
    // Only one LLM call — spec generation skipped
    expect(llm).toHaveBeenCalledTimes(1);

    const [applyPrompt] = vi.mocked(llm).mock.calls[0];
    expect(applyPrompt).toContain('<calibration-specification>');
  });
});

describe('mapCalibrateParallel', () => {
  it('classifies a list of scans, generating spec once', async () => {
    vi.mocked(llm)
      .mockResolvedValueOnce(mockSpec) // spec
      .mockResolvedValueOnce(mockResult)
      .mockResolvedValueOnce(mockResult);

    const scans = [makeScan(['pii-name'], [0.9]), makeScan(['financial-card'], [0.8])];
    const result = await mapCalibrateParallel(scans, 'Classify privacy risk');

    expect(result).toEqual([mockResult, mockResult]);
    expect(llm).toHaveBeenCalledTimes(3);
    const specPrompt = vi.mocked(llm).mock.calls[0][0];
    expect(specPrompt).toContain('"totalScans": 2');
  });

  it('skips spec generation when spec provided in bundle', async () => {
    vi.mocked(llm).mockResolvedValueOnce(mockResult).mockResolvedValueOnce(mockResult);
    const scans = [makeScan(['pii-name'], [0.9]), makeScan(['pii-name'], [0.7])];
    const result = await mapCalibrateParallel(scans, { text: 'Classify', spec: mockSpec });
    expect(result).toEqual([mockResult, mockResult]);
    expect(llm).toHaveBeenCalledTimes(2);
  });

  it('returns partial outcome when some apply calls fail', async () => {
    vi.mocked(llm).mockResolvedValueOnce(mockResult).mockRejectedValueOnce(new Error('boom'));
    const events = [];
    const scans = [makeScan(['pii-name'], [0.9]), makeScan(['pii-name'], [0.8])];
    const result = await mapCalibrateParallel(
      scans,
      { text: 'x', spec: mockSpec },
      { onProgress: (e) => events.push(e), maxAttempts: 1 }
    );
    expect(result[0]).toEqual(mockResult);
    expect(result[1]).toBeUndefined();
    const complete = events.find(
      (e) => e.event === 'chain:complete' && e.step === 'calibrate:parallel'
    );
    expect(complete.outcome).toBe('partial');
    expect(complete.failedItems).toBe(1);
  });

  it('throws when all scans fail', async () => {
    vi.mocked(llm).mockRejectedValue(new Error('boom'));
    const scans = [makeScan(['pii-name'], [0.9])];
    await expect(
      mapCalibrateParallel(scans, { text: 'x', spec: mockSpec }, { maxAttempts: 1 })
    ).rejects.toThrow(/all 1 scans failed/);
  });
});

describe('mapCalibrate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('routes through the map chain with the batch responseFormat', async () => {
    vi.mocked(map).mockResolvedValueOnce([mockResult, mockResult]);
    const scans = [makeScan(['pii-name'], [0.9]), makeScan(['pii-name'], [0.8])];
    const result = await mapCalibrate(scans, { text: 'x', spec: mockSpec });
    expect(result).toEqual([mockResult, mockResult]);
    const mapConfig = vi.mocked(map).mock.calls[0][2];
    expect(mapConfig.responseFormat?.json_schema?.name).toBe('calibrate_batch');
  });

  it('generates spec once when not bundled', async () => {
    vi.mocked(llm).mockResolvedValueOnce(mockSpec);
    vi.mocked(map).mockResolvedValueOnce([mockResult]);
    const scans = [makeScan(['pii-name'], [0.9])];
    await mapCalibrate(scans, 'classify privacy risk');
    // spec call only — map() does the per-scan dispatch
    expect(llm).toHaveBeenCalledTimes(1);
    const mapInstructions = vi.mocked(map).mock.calls[0][1];
    expect(mapInstructions).toContain('<calibration-specification>');
  });

  it('reports partial outcome when map returns undefined slots', async () => {
    vi.mocked(map).mockResolvedValueOnce([mockResult, undefined]);
    const events = [];
    const scans = [makeScan(['pii-name'], [0.9]), makeScan(['pii-name'], [0.8])];
    const result = await mapCalibrate(
      scans,
      { text: 'x', spec: mockSpec },
      { onProgress: (e) => events.push(e) }
    );
    expect(result[0]).toEqual(mockResult);
    expect(result[1]).toBeUndefined();
    const complete = events.find((e) => e.event === 'chain:complete' && e.step === 'calibrate:map');
    expect(complete.outcome).toBe('partial');
  });
});
