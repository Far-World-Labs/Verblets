import { describe, it, expect, vi } from 'vitest';
import glossary from './index.js';

vi.mock('../map/index.js', () => ({
  default: vi.fn(() =>
    Promise.resolve([{ terms: ['qubits', 'entanglement'] }, { terms: ['decoherence', 'qubits'] }])
  ),
}));

vi.mock('../sort/index.js', () => ({
  default: vi.fn((list, _criteria, _config) => Promise.resolve(list)),
}));

describe('glossary', () => {
  it('collects unique terms', async () => {
    const text = 'para1\n\npara2';
    const result = await glossary(text, { maxTerms: 5 });
    expect(result).toStrictEqual(['qubits', 'entanglement', 'decoherence']);
  });
});
