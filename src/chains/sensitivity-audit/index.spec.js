import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../sensitivity-scan/index.js', () => ({
  default: vi.fn(),
}));

const { default: sensitivityScan } = await import('../sensitivity-scan/index.js');
const {
  default: sensitivityAudit,
  aggregateAudit,
  createSensitivityAuditor,
} = await import('./index.js');

const cleanScan = { flagged: false, hits: [] };

const piiScan = {
  flagged: true,
  hits: [
    {
      category: 'pii-name',
      label: 'Personal Names',
      score: 0.85,
      chunk: { text: 'John', start: 0, end: 4 },
    },
  ],
};

const medicalScan = {
  flagged: true,
  hits: [
    {
      category: 'medical-diagnosis',
      label: 'Medical Diagnosis',
      score: 0.9,
      chunk: { text: 'diabetes', start: 0, end: 8 },
    },
    {
      category: 'pii-name',
      label: 'Personal Names',
      score: 0.7,
      chunk: { text: 'Sarah', start: 10, end: 15 },
    },
  ],
};

const criticalScan = {
  flagged: true,
  hits: [
    {
      category: 'pii-government-id',
      label: 'Government ID',
      score: 0.95,
      chunk: { text: 'SSN', start: 0, end: 3 },
    },
  ],
};

beforeEach(() => {
  sensitivityScan.mockReset();
});

describe('aggregateAudit', () => {
  it('returns zeroed summary for empty array', () => {
    const summary = aggregateAudit([]);

    expect(summary).toEqual({
      totalItems: 0,
      flaggedCount: 0,
      maxLevel: 'none',
      categoryCounts: {},
      levelCounts: { none: 0, low: 0, medium: 0, high: 0, critical: 0 },
    });
  });

  it('counts flagged items correctly', () => {
    const items = [
      {
        text: 'clean',
        scan: cleanScan,
        classification: { level: 'none', maxScore: 0, categories: {}, summary: '' },
      },
      {
        text: 'pii',
        scan: piiScan,
        classification: {
          level: 'medium',
          maxScore: 0.85,
          categories: { 'pii-name': { count: 1, maxScore: 0.85, severity: 'medium' } },
          summary: '',
        },
      },
    ];

    const summary = aggregateAudit(items);

    expect(summary.totalItems).toBe(2);
    expect(summary.flaggedCount).toBe(1);
    expect(summary.levelCounts.none).toBe(1);
    expect(summary.levelCounts.medium).toBe(1);
  });

  it('tracks maxLevel as highest severity across all items', () => {
    const items = [
      {
        text: 'low',
        scan: piiScan,
        classification: {
          level: 'medium',
          maxScore: 0.85,
          categories: { 'pii-name': { count: 1, maxScore: 0.85, severity: 'medium' } },
          summary: '',
        },
      },
      {
        text: 'high',
        scan: medicalScan,
        classification: {
          level: 'high',
          maxScore: 0.9,
          categories: { 'medical-diagnosis': { count: 1, maxScore: 0.9, severity: 'high' } },
          summary: '',
        },
      },
      {
        text: 'clean',
        scan: cleanScan,
        classification: { level: 'none', maxScore: 0, categories: {}, summary: '' },
      },
    ];

    const summary = aggregateAudit(items);

    expect(summary.maxLevel).toBe('high');
  });

  it('aggregates category counts across items', () => {
    const items = [
      {
        text: 'a',
        scan: piiScan,
        classification: {
          level: 'medium',
          maxScore: 0.85,
          categories: { 'pii-name': { count: 1, maxScore: 0.85, severity: 'medium' } },
          summary: '',
        },
      },
      {
        text: 'b',
        scan: medicalScan,
        classification: {
          level: 'high',
          maxScore: 0.9,
          categories: {
            'medical-diagnosis': { count: 1, maxScore: 0.9, severity: 'high' },
            'pii-name': { count: 1, maxScore: 0.7, severity: 'medium' },
          },
          summary: '',
        },
      },
      {
        text: 'c',
        scan: criticalScan,
        classification: {
          level: 'critical',
          maxScore: 0.95,
          categories: { 'pii-government-id': { count: 1, maxScore: 0.95, severity: 'critical' } },
          summary: '',
        },
      },
    ];

    const summary = aggregateAudit(items);

    expect(summary.categoryCounts).toEqual({
      'pii-name': 2,
      'medical-diagnosis': 1,
      'pii-government-id': 1,
    });
    expect(summary.maxLevel).toBe('critical');
  });

  it('handles all clean items', () => {
    const items = [
      {
        text: 'a',
        scan: cleanScan,
        classification: { level: 'none', maxScore: 0, categories: {}, summary: '' },
      },
      {
        text: 'b',
        scan: cleanScan,
        classification: { level: 'none', maxScore: 0, categories: {}, summary: '' },
      },
    ];

    const summary = aggregateAudit(items);

    expect(summary.flaggedCount).toBe(0);
    expect(summary.maxLevel).toBe('none');
    expect(summary.categoryCounts).toEqual({});
    expect(summary.levelCounts.none).toBe(2);
  });
});

describe('sensitivityAudit', () => {
  it('returns empty items and zeroed summary for empty array', async () => {
    const result = await sensitivityAudit([]);

    expect(result.items).toEqual([]);
    expect(result.summary.totalItems).toBe(0);
    expect(result.summary.flaggedCount).toBe(0);
    expect(result.summary.maxLevel).toBe('none');
  });

  it('scans and classifies each text', async () => {
    sensitivityScan
      .mockResolvedValueOnce(cleanScan)
      .mockResolvedValueOnce(piiScan)
      .mockResolvedValueOnce(medicalScan);

    const result = await sensitivityAudit([
      'The weather is nice.',
      'John Smith is here.',
      'Sarah has diabetes.',
    ]);

    expect(result.items).toHaveLength(3);
    expect(result.items[0].classification.level).toBe('none');
    expect(result.items[1].classification.level).toBe('medium');
    expect(result.items[2].classification.level).toBe('high');
    expect(result.summary.totalItems).toBe(3);
    expect(result.summary.flaggedCount).toBe(2);
    expect(result.summary.maxLevel).toBe('high');
  });

  it('preserves original text in items', async () => {
    sensitivityScan.mockResolvedValueOnce(cleanScan);

    const texts = ['Hello world'];
    const result = await sensitivityAudit(texts);

    expect(result.items[0].text).toBe('Hello world');
  });

  it('passes scan options to sensitivityScan', async () => {
    sensitivityScan.mockResolvedValueOnce(cleanScan);

    await sensitivityAudit(['text'], {
      threshold: 0.6,
      categories: ['pii-name'],
      maxTokens: 128,
    });

    expect(sensitivityScan).toHaveBeenCalledWith('text', {
      threshold: 0.6,
      categories: ['pii-name'],
      maxTokens: 128,
    });
  });

  it('fires progress callbacks', async () => {
    sensitivityScan.mockResolvedValueOnce(cleanScan).mockResolvedValueOnce(piiScan);

    const events = [];
    const onProgress = (event) => events.push(event);

    await sensitivityAudit(['clean', 'pii'], { onProgress });

    const startEvents = events.filter((e) => e.event === 'start');
    const batchCompleteEvents = events.filter((e) => e.event === 'batch:complete');
    const completeEvents = events.filter((e) => e.event === 'complete');

    expect(startEvents.length).toBe(1);
    expect(startEvents[0].totalItems).toBe(2);
    expect(batchCompleteEvents.length).toBe(2);
    expect(completeEvents.length).toBe(1);
    expect(completeEvents[0].totalItems).toBe(2);
  });

  it('category counts aggregate across items in summary', async () => {
    sensitivityScan
      .mockResolvedValueOnce(piiScan)
      .mockResolvedValueOnce(medicalScan)
      .mockResolvedValueOnce(criticalScan);

    const result = await sensitivityAudit(['a', 'b', 'c']);

    expect(result.summary.categoryCounts['pii-name']).toBe(2);
    expect(result.summary.categoryCounts['medical-diagnosis']).toBe(1);
    expect(result.summary.categoryCounts['pii-government-id']).toBe(1);
    expect(result.summary.maxLevel).toBe('critical');
  });

  it('handles null/undefined texts gracefully', async () => {
    const result = await sensitivityAudit(null);
    expect(result.items).toEqual([]);
    expect(result.summary.totalItems).toBe(0);
  });
});

describe('createSensitivityAuditor', () => {
  it('returns a function with enumerable .options', () => {
    const options = { threshold: 0.6, categories: ['pii-name'], maxParallel: 3 };
    const auditor = createSensitivityAuditor(options);

    expect(typeof auditor).toBe('function');
    expect(auditor.options).toBe(options);
    expect(Object.keys(auditor)).toContain('options');
  });

  it('delegates to sensitivityAudit with configured options', async () => {
    const options = { threshold: 0.6, categories: ['pii-name'] };
    const auditor = createSensitivityAuditor(options);

    sensitivityScan.mockResolvedValueOnce(cleanScan).mockResolvedValueOnce(piiScan);

    const result = await auditor(['safe text', 'John Smith']);

    expect(sensitivityScan).toHaveBeenCalledWith('safe text', {
      threshold: 0.6,
      categories: ['pii-name'],
    });
    expect(sensitivityScan).toHaveBeenCalledWith('John Smith', {
      threshold: 0.6,
      categories: ['pii-name'],
    });
    expect(result.items).toHaveLength(2);
    expect(result.summary.totalItems).toBe(2);
    expect(result.summary.flaggedCount).toBe(1);
  });

  it('works with default options', async () => {
    const auditor = createSensitivityAuditor();

    sensitivityScan.mockResolvedValueOnce(cleanScan);

    const result = await auditor(['hello']);

    expect(result.items).toHaveLength(1);
    expect(result.summary.flaggedCount).toBe(0);
    expect(auditor.options).toEqual({});
  });
});
