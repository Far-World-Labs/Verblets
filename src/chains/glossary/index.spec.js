import { vi, beforeEach, expect } from 'vitest';
import glossary from './index.js';
import map from '../map/index.js';
import sort from '../sort/index.js';
import { runTable } from '../../lib/examples-runner/index.js';

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
      inputs: {
        text: 'para1\n\npara2',
        options: { maxTerms: 5 },
        want: ['qubits', 'entanglement', 'decoherence'],
      },
    },
    {
      name: 'limits output to maxTerms',
      inputs: { text: 'para1\n\npara2', options: { maxTerms: 2 }, wantLength: 2 },
    },
    {
      name: 'returns empty array for empty string',
      inputs: { text: '', want: [], wantNoMap: true },
    },
    {
      name: 'returns empty array for whitespace text',
      inputs: { text: '  ', want: [], wantNoMap: true },
    },
    {
      name: 'passes sortBy criteria to sort',
      inputs: {
        text: 'some text here.',
        options: { sortBy: 'alphabetical' },
        wantSortBy: 'alphabetical',
      },
    },
    {
      name: 'deduplicates terms across chunks',
      inputs: { text: 'para1\n\npara2', wantQubitsCount: 1 },
    },
    {
      name: 'skips non-string and falsy terms',
      inputs: {
        text: 'some text here.',
        mock: () => map.mockResolvedValueOnce([{ terms: ['valid', null, undefined, '', 42] }]),
        want: ['valid'],
      },
    },
  ],
  process: async ({ text, options, mock }) => {
    if (mock) mock();
    return glossary(text, options);
  },
  expects: ({ result, inputs }) => {
    if ('want' in inputs) expect(result).toEqual(inputs.want);
    if ('wantLength' in inputs) expect(result).toHaveLength(inputs.wantLength);
    if (inputs.wantNoMap) expect(map).not.toHaveBeenCalled();
    if (inputs.wantSortBy) expect(sort.mock.calls[0][1]).toBe(inputs.wantSortBy);
    if ('wantQubitsCount' in inputs) {
      expect(result.filter((t) => t === 'qubits').length).toBe(inputs.wantQubitsCount);
    }
  },
});
