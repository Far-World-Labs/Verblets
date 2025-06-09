import { describe, it, expect, vi } from 'vitest';
import glossary from './index.js';

vi.mock('../bulk-map/index.js', () => ({
  bulkMapRetry: vi.fn(() => Promise.resolve(['qubits, entanglement', 'decoherence, qubits'])),
  default: vi.fn(),
}));

vi.mock('../sort/index.js', () => ({
  default: vi.fn((opts, list) => Promise.resolve(list)),
}));

describe('glossary', () => {
  it('collects unique terms', async () => {
    const text = 'para1\n\npara2';
    const result = await glossary(text, { maxTerms: 5 });
    expect(result).toStrictEqual(['qubits', 'entanglement', 'decoherence']);
  });
});
