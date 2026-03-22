import { describe, it, expect, vi, beforeEach } from 'vitest';
import glossary from './index.js';
import map from '../map/index.js';
import sort from '../sort/index.js';

vi.mock('../map/index.js', () => ({
  default: vi.fn(() =>
    Promise.resolve([{ terms: ['qubits', 'entanglement'] }, { terms: ['decoherence', 'qubits'] }])
  ),
}));

vi.mock('../sort/index.js', () => ({
  default: vi.fn((list) => Promise.resolve(list)),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('glossary', () => {
  it('collects unique terms from map results', async () => {
    const result = await glossary('para1\n\npara2', { maxTerms: 5 });
    expect(result).toStrictEqual(['qubits', 'entanglement', 'decoherence']);
  });

  it('limits output to maxTerms', async () => {
    const result = await glossary('para1\n\npara2', { maxTerms: 2 });
    expect(result).toHaveLength(2);
  });

  it('returns empty array for empty text', async () => {
    expect(await glossary('')).toStrictEqual([]);
    expect(await glossary('  ')).toStrictEqual([]);
    expect(map).not.toHaveBeenCalled();
  });

  it('forwards batchSize to map call', async () => {
    await glossary('some text here.', { batchSize: 7 });
    const mapConfig = map.mock.calls[0][2];
    expect(mapConfig.batchSize).toBe(7);
  });

  it('forwards llm config to both map and sort', async () => {
    const llm = { model: 'test-model' };
    await glossary('some text here.', { llm });

    const mapConfig = map.mock.calls[0][2];
    expect(mapConfig.llm).toBe(llm);

    const sortConfig = sort.mock.calls[0][2];
    expect(sortConfig.llm).toBe(llm);
  });

  it('forwards onProgress to both map and sort', async () => {
    const onProgress = vi.fn();
    await glossary('some text here.', { onProgress });

    const mapConfig = map.mock.calls[0][2];
    expect(mapConfig.onProgress).toBe(onProgress);

    const sortConfig = sort.mock.calls[0][2];
    expect(sortConfig.onProgress).toBe(onProgress);
  });

  it('passes sortBy criteria to sort', async () => {
    await glossary('some text here.', { sortBy: 'alphabetical' });
    const sortCriteria = sort.mock.calls[0][1];
    expect(sortCriteria).toBe('alphabetical');
  });

  it('deduplicates terms across chunks', async () => {
    // Mock returns 'qubits' in both chunks
    const result = await glossary('para1\n\npara2');
    const qubitCount = result.filter((t) => t === 'qubits').length;
    expect(qubitCount).toBe(1);
  });

  it('skips non-string and falsy terms', async () => {
    map.mockResolvedValueOnce([{ terms: ['valid', null, undefined, '', 42] }]);
    const result = await glossary('some text here.');
    expect(result).toStrictEqual(['valid']);
  });
});
