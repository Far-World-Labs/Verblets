import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../lib/embed-probes/index.js', () => ({
  default: vi.fn(),
}));

vi.mock('../probe-scan/index.js', () => ({
  default: vi.fn(),
}));

const { default: embedProbes } = await import('../../lib/embed-probes/index.js');
const { default: probeScan } = await import('../probe-scan/index.js');
const { default: sensitivityScan, createSensitivityScanner } = await import('./index.js');

const { default: sensitivityProbes } = await import('../../prompts/sensitivity-probes.js');

beforeEach(() => {
  embedProbes.mockReset();
  probeScan.mockReset();
});

const fakeEmbeddedProbes = [
  { category: 'pii-name', label: 'Personal Names', vector: new Float32Array([1, 0]) },
  { category: 'contact-email', label: 'Email Addresses', vector: new Float32Array([0, 1]) },
];

describe('sensitivityScan', () => {
  it('embeds the built-in sensitivityProbes and passes them to probeScan', async () => {
    embedProbes.mockResolvedValueOnce(fakeEmbeddedProbes);
    probeScan.mockResolvedValueOnce({ flagged: true, hits: [{ category: 'pii-name' }] });

    const result = await sensitivityScan('John Smith');

    expect(embedProbes).toHaveBeenCalledWith(sensitivityProbes);
    expect(probeScan).toHaveBeenCalledWith('John Smith', fakeEmbeddedProbes, {});
    expect(result).toEqual({ flagged: true, hits: [{ category: 'pii-name' }] });
  });

  it('passes options through to probeScan', async () => {
    embedProbes.mockResolvedValueOnce(fakeEmbeddedProbes);
    probeScan.mockResolvedValueOnce({ flagged: false, hits: [] });

    const options = { threshold: 0.6, categories: ['contact-email'], maxTokens: 128 };
    await sensitivityScan('some text', options);

    expect(probeScan).toHaveBeenCalledWith('some text', fakeEmbeddedProbes, options);
  });

  it('returns the probeScan result unchanged', async () => {
    const scanResult = {
      flagged: true,
      hits: [
        {
          category: 'pii-name',
          label: 'Personal Names',
          score: 0.85,
          chunk: { text: 'John', start: 0, end: 4 },
        },
        {
          category: 'contact-email',
          label: 'Email Addresses',
          score: 0.72,
          chunk: { text: 'john@x.com', start: 5, end: 15 },
        },
      ],
    };
    embedProbes.mockResolvedValueOnce(fakeEmbeddedProbes);
    probeScan.mockResolvedValueOnce(scanResult);

    const result = await sensitivityScan('John john@x.com');

    expect(result).toBe(scanResult);
  });

  it('defaults to empty options when none provided', async () => {
    embedProbes.mockResolvedValueOnce(fakeEmbeddedProbes);
    probeScan.mockResolvedValueOnce({ flagged: false, hits: [] });

    await sensitivityScan('hello world');

    expect(probeScan).toHaveBeenCalledWith('hello world', fakeEmbeddedProbes, {});
  });
});

describe('createSensitivityScanner', () => {
  it('returns a function with enumerable .options', () => {
    const options = { threshold: 0.6, categories: ['pii-name'] };
    const scanner = createSensitivityScanner(options);

    expect(typeof scanner).toBe('function');
    expect(scanner.options).toBe(options);
    expect(Object.keys(scanner)).toContain('options');
  });

  it('delegates to sensitivityScan with configured options', async () => {
    const options = { threshold: 0.6, categories: ['pii-name'], maxTokens: 128 };
    const scanner = createSensitivityScanner(options);

    embedProbes.mockResolvedValueOnce(fakeEmbeddedProbes);
    probeScan.mockResolvedValueOnce({ flagged: true, hits: [{ category: 'pii-name' }] });

    const result = await scanner('John Smith');

    expect(probeScan).toHaveBeenCalledWith('John Smith', fakeEmbeddedProbes, options);
    expect(result).toEqual({ flagged: true, hits: [{ category: 'pii-name' }] });
  });

  it('works with default options', async () => {
    const scanner = createSensitivityScanner();

    embedProbes.mockResolvedValueOnce(fakeEmbeddedProbes);
    probeScan.mockResolvedValueOnce({ flagged: false, hits: [] });

    const result = await scanner('hello');

    expect(probeScan).toHaveBeenCalledWith('hello', fakeEmbeddedProbes, {});
    expect(result.flagged).toBe(false);
    expect(scanner.options).toEqual({});
  });
});
