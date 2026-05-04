import { expect } from 'vitest';
import chunkSentences from './index.js';
import { runTable } from '../examples-runner/index.js';

runTable({
  describe: 'chunkSentences',
  examples: [
    {
      name: 'returns single chunk when text fits within maxLen',
      inputs: { text: 'Short text.', maxLen: 100, want: { chunks: ['Short text.'] } },
    },
    {
      name: 'empty string → empty array',
      inputs: { text: '', maxLen: 100, want: { chunks: [] } },
    },
    {
      name: 'null → empty array',
      inputs: { text: null, maxLen: 100, want: { chunks: [] } },
    },
    {
      name: 'undefined → empty array',
      inputs: { text: undefined, maxLen: 100, want: { chunks: [] } },
    },
    {
      name: 'splits at sentence boundaries and preserves content',
      inputs: {
        text: 'First sentence. Second sentence. Third sentence.',
        maxLen: 20,
        want: { multipleChunks: true, contentPreserved: true },
      },
    },
    {
      name: 'falls back to character chunking for a single long sentence',
      inputs: {
        text: 'a'.repeat(100),
        maxLen: 30,
        want: { multipleChunks: true, contentPreserved: true },
      },
    },
    {
      name: 'preserves all text across multiple sentences',
      inputs: {
        text:
          'The quick brown fox jumped over the lazy dog. ' +
          'It was a sunny day in the park. ' +
          'Birds were singing in the trees.',
        maxLen: 50,
        want: { contentPreserved: true },
      },
    },
    {
      name: 'respects maxLen constraint',
      inputs: {
        text: 'One sentence here. Another sentence there. Yet another sentence follows.',
        maxLen: 40,
        want: { multipleChunks: true },
      },
    },
    {
      name: 'text exactly maxLen returns single chunk',
      inputs: { text: 'Exact length.', maxLen: 13, want: { chunks: ['Exact length.'] } },
    },
  ],
  process: ({ text, maxLen }) => {
    const chunks = chunkSentences(text, maxLen);
    return {
      chunks,
      multipleChunks: chunks.length > 1,
      contentPreserved: chunks.join('') === (text ?? ''),
    };
  },
  expects: ({ result, inputs }) => expect(result).toMatchObject(inputs.want),
});
