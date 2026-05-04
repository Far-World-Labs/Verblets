import { vi, beforeEach, expect } from 'vitest';
import truncate from './index.js';
import { runTable } from '../../lib/examples-runner/index.js';

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
        mock: () => score.mockResolvedValueOnce([8, 7, 9]),
        wantFullLength: true,
      },
    },
    {
      name: 'truncates when a chunk from the end scores below threshold',
      inputs: {
        text: 'Important content at the beginning. Less important content at the end.',
        instructions: 'Remove boring content',
        mock: () => score.mockResolvedValueOnce([3]),
        wantTruncated: true,
      },
    },
    {
      name: 'strictness=high triggers removal when scores below threshold 7',
      inputs: {
        text: 'Short test text.',
        instructions: 'criteria',
        options: { strictness: 'high' },
        mock: () => score.mockResolvedValueOnce([5, 5, 5]),
        wantTruncated: true,
      },
    },
    {
      name: 'strictness=low keeps everything when scores above threshold 4',
      inputs: {
        text: 'Short test text.',
        instructions: 'criteria',
        options: { strictness: 'low' },
        mock: () => score.mockResolvedValueOnce([5, 5, 5]),
        wantFullLength: true,
      },
    },
    {
      name: 'accepts raw number for strictness',
      inputs: {
        text: 'Short test text.',
        instructions: 'criteria',
        options: { strictness: 3 },
        mock: () => score.mockResolvedValueOnce([5, 5, 5]),
        wantFullLength: true,
      },
    },
    {
      name: 'forwards config to score chain',
      inputs: {
        text: 'Test text',
        instructions: 'Remove boring content',
        options: { llm: 'custom-model', customOption: 'value' },
        mock: () => score.mockResolvedValueOnce([8]),
        wantScoreConfig: { llm: 'custom-model', customOption: 'value' },
      },
    },
    {
      name: 'handles single-chunk text',
      inputs: {
        text: 'Hi',
        instructions: 'Remove boring content',
        mock: () => score.mockResolvedValueOnce([8]),
        want: 2,
      },
    },
  ],
  process: async ({ text, instructions, options, mock }) => {
    if (mock) mock();
    return truncate(text, instructions, options);
  },
  expects: ({ result, inputs }) => {
    if (inputs.wantFullLength) expect(result).toBe(inputs.text.length);
    if (inputs.wantTruncated) {
      expect(result).toBeLessThan(inputs.text.length);
      expect(result).toBeGreaterThanOrEqual(0);
    }
    if ('want' in inputs) expect(result).toBe(inputs.want);
    if (inputs.wantScoreConfig) {
      expect(score).toHaveBeenCalledWith(
        expect.any(Array),
        expect.stringContaining(inputs.instructions),
        expect.objectContaining(inputs.wantScoreConfig)
      );
    }
  },
});
