import { vi, beforeEach, expect } from 'vitest';
import truncate from './index.js';
import { runTable, applyMocks } from '../../lib/examples-runner/index.js';

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
      },
      mocks: { score: [[8, 7, 9]] },
      want: { fullLength: true },
    },
    {
      name: 'truncates when a chunk from the end scores below threshold',
      inputs: {
        text: 'Important content at the beginning. Less important content at the end.',
        instructions: 'Remove boring content',
      },
      mocks: { score: [[3]] },
      want: { truncated: true },
    },
    {
      name: 'strictness=high triggers removal when scores below threshold 7',
      inputs: {
        text: 'Short test text.',
        instructions: 'criteria',
        options: { strictness: 'high' },
      },
      mocks: { score: [[5, 5, 5]] },
      want: { truncated: true },
    },
    {
      name: 'strictness=low keeps everything when scores above threshold 4',
      inputs: {
        text: 'Short test text.',
        instructions: 'criteria',
        options: { strictness: 'low' },
      },
      mocks: { score: [[5, 5, 5]] },
      want: { fullLength: true },
    },
    {
      name: 'accepts raw number for strictness',
      inputs: {
        text: 'Short test text.',
        instructions: 'criteria',
        options: { strictness: 3 },
      },
      mocks: { score: [[5, 5, 5]] },
      want: { fullLength: true },
    },
    {
      name: 'forwards config to score chain',
      inputs: {
        text: 'Test text',
        instructions: 'Remove boring content',
        options: { llm: 'custom-model', customOption: 'value' },
      },
      mocks: { score: [[8]] },
      want: { scoreConfig: { llm: 'custom-model', customOption: 'value' } },
    },
    {
      name: 'handles single-chunk text',
      inputs: { text: 'Hi', instructions: 'Remove boring content' },
      mocks: { score: [[8]] },
      want: { value: 2 },
    },
  ],
  process: async ({ inputs, mocks }) => {
    applyMocks(mocks, { score });
    return truncate(inputs.text, inputs.instructions, inputs.options);
  },
  expects: ({ result, inputs, want }) => {
    if (want.fullLength) expect(result).toBe(inputs.text.length);
    if (want.truncated) {
      expect(result).toBeLessThan(inputs.text.length);
      expect(result).toBeGreaterThanOrEqual(0);
    }
    if ('value' in want) expect(result).toBe(want.value);
    if (want.scoreConfig) {
      expect(score).toHaveBeenCalledWith(
        expect.any(Array),
        expect.stringContaining(inputs.instructions),
        expect.objectContaining(want.scoreConfig)
      );
    }
  },
});
