import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../sensitivity-scan/index.js', () => ({
  default: vi.fn(),
}));

const { default: sensitivityScan } = await import('../sensitivity-scan/index.js');
const { default: sensitivityCheck, createSensitivityChecker } = await import('./index.js');

beforeEach(() => {
  sensitivityScan.mockReset();
});

const cleanScan = { flagged: false, hits: [] };
const flaggedScan = {
  flagged: true,
  hits: [
    { category: 'pii-name', score: 0.85 },
    { category: 'contact-email', score: 0.72 },
    { category: 'pii-name', score: 0.65 },
  ],
};

describe('sensitivityCheck', () => {
  it('returns unflagged result for clean text', async () => {
    sensitivityScan.mockResolvedValueOnce(cleanScan);

    const result = await sensitivityCheck('The weather is nice.');

    expect(result.flagged).toBe(false);
    expect(result.level).toBe('none');
    expect(result.maxScore).toBe(0);
    expect(result.categories).toEqual({});
    expect(result.summary).toContain('No sensitive');
    expect(result.scan).toBe(cleanScan);
  });

  it('returns classified result for flagged text', async () => {
    sensitivityScan.mockResolvedValueOnce(flaggedScan);

    const result = await sensitivityCheck('John Smith john@example.com');

    expect(result.flagged).toBe(true);
    expect(result.level).toBe('medium');
    expect(result.maxScore).toBe(0.85);
    expect(result.categories).toHaveProperty('pii-name');
    expect(result.categories['pii-name'].count).toBe(2);
    expect(result.categories).toHaveProperty('contact-email');
    expect(result.scan).toBe(flaggedScan);
  });

  it('passes options through to sensitivityScan', async () => {
    sensitivityScan.mockResolvedValueOnce(cleanScan);

    await sensitivityCheck('text', { threshold: 0.6, categories: ['pii-name'], maxTokens: 128 });

    expect(sensitivityScan).toHaveBeenCalledWith('text', {
      threshold: 0.6,
      categories: ['pii-name'],
      maxTokens: 128,
    });
  });

  it('flagged field is consistent with scan.flagged', async () => {
    sensitivityScan.mockResolvedValueOnce(cleanScan);
    const clean = await sensitivityCheck('safe');
    expect(clean.flagged).toBe(cleanScan.flagged);

    sensitivityScan.mockResolvedValueOnce(flaggedScan);
    const flagged = await sensitivityCheck('John Smith');
    expect(flagged.flagged).toBe(flaggedScan.flagged);
  });

  it('handles critical severity categories', async () => {
    const criticalScan = {
      flagged: true,
      hits: [{ category: 'pii-government-id', score: 0.9 }],
    };
    sensitivityScan.mockResolvedValueOnce(criticalScan);

    const result = await sensitivityCheck('SSN: 123-45-6789');

    expect(result.level).toBe('critical');
    expect(result.categories['pii-government-id'].severity).toBe('critical');
  });

  it('summary includes category count and names', async () => {
    sensitivityScan.mockResolvedValueOnce(flaggedScan);

    const result = await sensitivityCheck('John Smith john@example.com');

    expect(result.summary).toContain('2 categories');
    expect(result.summary).toContain('pii-name');
    expect(result.summary).toContain('contact-email');
  });
});

describe('createSensitivityChecker', () => {
  it('returns a function with enumerable .options', () => {
    const options = { threshold: 0.6, categories: ['pii-name'] };
    const checker = createSensitivityChecker(options);

    expect(typeof checker).toBe('function');
    expect(checker.options).toBe(options);
    expect(Object.keys(checker)).toContain('options');
  });

  it('delegates to sensitivityCheck with configured options', async () => {
    const options = { threshold: 0.6, categories: ['pii-name'] };
    const checker = createSensitivityChecker(options);

    sensitivityScan.mockResolvedValueOnce(flaggedScan);

    const result = await checker('John Smith');

    expect(sensitivityScan).toHaveBeenCalledWith('John Smith', options);
    expect(result.flagged).toBe(true);
    expect(result.level).toBe('medium');
  });

  it('works with default options', async () => {
    const checker = createSensitivityChecker();

    sensitivityScan.mockResolvedValueOnce(cleanScan);

    const result = await checker('safe text');

    expect(sensitivityScan).toHaveBeenCalledWith('safe text', {});
    expect(result.flagged).toBe(false);
    expect(checker.options).toEqual({});
  });
});
