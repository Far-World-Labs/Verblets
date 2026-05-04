import { vi, beforeEach, expect } from 'vitest';
import glossary from './index.js';
import map from '../map/index.js';
import sort from '../sort/index.js';
import { runTable, applyMocks } from '../../lib/examples-runner/index.js';

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
      want: { value: ['qubits', 'entanglement', 'decoherence'] },
    },
    {
      name: 'limits output to maxTerms',
      inputs: { text: 'para1\n\npara2', options: { maxTerms: 2 } },
      want: { length: 2 },
    },
    {
      name: 'returns empty array for empty string',
      inputs: { text: '' },
      want: { value: [], noMap: true },
    },
    {
      name: 'returns empty array for whitespace text',
      inputs: { text: '  ' },
      want: { value: [], noMap: true },
    },
    {
      name: 'passes sortBy criteria to sort',
      inputs: { text: 'some text here.', options: { sortBy: 'alphabetical' } },
      want: { sortBy: 'alphabetical' },
    },
    {
      name: 'deduplicates terms across chunks',
      inputs: { text: 'para1\n\npara2' },
      want: { qubitsCount: 1 },
    },
    {
      name: 'skips non-string and falsy terms',
      inputs: { text: 'some text here.' },
      mocks: { map: [[{ terms: ['valid', null, undefined, '', 42] }]] },
      want: { value: ['valid'] },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { map });
    return glossary(inputs.text, inputs.options);
  },
  expects: ({ result, want }) => {
    if ('value' in want) expect(result).toEqual(want.value);
    if ('length' in want) expect(result).toHaveLength(want.length);
    if (want.noMap) expect(map).not.toHaveBeenCalled();
    if (want.sortBy) expect(sort.mock.calls[0][1]).toBe(want.sortBy);
    if ('qubitsCount' in want) {
      expect(result.filter((t) => t === 'qubits').length).toBe(want.qubitsCount);
    }
  },
});
