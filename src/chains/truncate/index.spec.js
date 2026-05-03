import { vi, beforeEach, expect } from 'vitest';
import truncate from './index.js';
import { runTable, equals } from '../../lib/examples-runner/index.js';

vi.mock('../score/index.js', () => ({
  default: vi.fn(),
  scoreItem: vi.fn(),
}));

import score from '../score/index.js';

beforeEach(() => vi.clearAllMocks());

runTable({
  describe: 'truncate',
  examples: [
    {
      name: 'returns full length when all chunks score above threshold',
      inputs: {
        text: 'All content is important and should stay.',
        instructions: 'Remove boring content',
        preMock: () => score.mockResolvedValueOnce([8, 7, 9]),
      },
      check: ({ result, inputs }) => expect(result).toBe(inputs.text.length),
    },
    {
      name: 'truncates when a chunk from the end scores below threshold',
      inputs: {
        text: 'Important content at the beginning. Less important content at the end.',
        instructions: 'Remove boring content',
        preMock: () => score.mockResolvedValueOnce([3]),
      },
      check: ({ result, inputs }) => {
        expect(result).toBeLessThan(inputs.text.length);
        expect(result).toBeGreaterThanOrEqual(0);
      },
    },
    {
      name: 'strictness=high triggers removal when scores below threshold 7',
      inputs: {
        text: 'Short test text.',
        instructions: 'criteria',
        options: { strictness: 'high' },
        preMock: () => score.mockResolvedValueOnce([5, 5, 5]),
      },
      check: ({ result, inputs }) => expect(result).toBeLessThan(inputs.text.length),
    },
    {
      name: 'strictness=low keeps everything when scores above threshold 4',
      inputs: {
        text: 'Short test text.',
        instructions: 'criteria',
        options: { strictness: 'low' },
        preMock: () => score.mockResolvedValueOnce([5, 5, 5]),
      },
      check: ({ result, inputs }) => expect(result).toBe(inputs.text.length),
    },
    {
      name: 'accepts raw number for strictness',
      inputs: {
        text: 'Short test text.',
        instructions: 'criteria',
        options: { strictness: 3 },
        preMock: () => score.mockResolvedValueOnce([5, 5, 5]),
      },
      check: ({ result, inputs }) => expect(result).toBe(inputs.text.length),
    },
    {
      name: 'forwards config to score chain',
      inputs: {
        text: 'Test text',
        instructions: 'Remove boring content',
        options: { llm: 'custom-model', customOption: 'value' },
        preMock: () => score.mockResolvedValueOnce([8]),
      },
      check: () =>
        expect(score).toHaveBeenCalledWith(
          expect.any(Array),
          expect.stringContaining('Remove boring content'),
          expect.objectContaining({ llm: 'custom-model', customOption: 'value' })
        ),
    },
    {
      name: 'handles single-chunk text',
      inputs: {
        text: 'Hi',
        instructions: 'Remove boring content',
        preMock: () => score.mockResolvedValueOnce([8]),
      },
      check: equals(2),
    },
  ],
  process: async ({ text, instructions, options, preMock }) => {
    if (preMock) preMock();
    return truncate(text, instructions, options);
  },
});
