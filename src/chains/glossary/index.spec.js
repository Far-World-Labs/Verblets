import { vi, beforeEach, expect } from 'vitest';
import glossary from './index.js';
import map from '../map/index.js';
import sort from '../sort/index.js';
import { runTable, equals, length, all } from '../../lib/examples-runner/index.js';

vi.mock('../map/index.js', () => ({
  default: vi.fn(() =>
    Promise.resolve([{ terms: ['qubits', 'entanglement'] }, { terms: ['decoherence', 'qubits'] }])
  ),
}));

vi.mock('../sort/index.js', () => ({ default: vi.fn((list) => Promise.resolve(list)) }));

beforeEach(() => vi.clearAllMocks());

runTable({
  describe: 'glossary',
  examples: [
    {
      name: 'collects unique terms from map results',
      inputs: { text: 'para1\n\npara2', options: { maxTerms: 5 } },
      check: equals(['qubits', 'entanglement', 'decoherence']),
    },
    {
      name: 'limits output to maxTerms',
      inputs: { text: 'para1\n\npara2', options: { maxTerms: 2 } },
      check: length(2),
    },
    {
      name: 'returns empty array for empty string',
      inputs: { text: '' },
      check: all(equals([]), () => expect(map).not.toHaveBeenCalled()),
    },
    {
      name: 'returns empty array for whitespace text',
      inputs: { text: '  ' },
      check: all(equals([]), () => expect(map).not.toHaveBeenCalled()),
    },
    {
      name: 'passes sortBy criteria to sort',
      inputs: { text: 'some text here.', options: { sortBy: 'alphabetical' } },
      check: () => expect(sort.mock.calls[0][1]).toBe('alphabetical'),
    },
    {
      name: 'deduplicates terms across chunks',
      inputs: { text: 'para1\n\npara2' },
      check: ({ result }) => expect(result.filter((t) => t === 'qubits').length).toBe(1),
    },
    {
      name: 'skips non-string and falsy terms',
      inputs: {
        text: 'some text here.',
        preMock: () => map.mockResolvedValueOnce([{ terms: ['valid', null, undefined, '', 42] }]),
      },
      check: equals(['valid']),
    },
  ],
  process: async ({ text, options, preMock }) => {
    if (preMock) preMock();
    return glossary(text, options);
  },
});
