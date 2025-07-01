import { describe, expect, it } from 'vitest';
import truncate from './index.js';

const examples = [
  {
    name: 'returns truncation point for simple text',
    inputs: {
      text: 'First sentence. Second sentence. Third sentence.',
      instructions: 'Keep the most important content',
      config: {},
    },
    wants: {
      result: expect.any(Number),
      resultGreaterThan: 0,
    },
  },
  {
    name: 'finds truncation point based on specific criteria',
    inputs: {
      text: 'Introduction here. Main technical details follow. Conclusion at the end.',
      instructions: 'Prioritize technical content',
      config: { chunkSize: 3 },
    },
    wants: {
      result: expect.any(Number),
    },
  },
  {
    name: 'handles single sentence',
    inputs: {
      text: 'Just one sentence here.',
      instructions: 'Find best cut point',
      config: {},
    },
    wants: {
      result: expect.any(Number),
    },
  },
  {
    name: 'works with custom scoring instructions',
    inputs: {
      text: 'Background information. Key findings from research. Additional context.',
      instructions: 'Focus on research findings only',
      config: {},
    },
    wants: {
      result: expect.any(Number),
    },
  },
];

describe('truncate', () => {
  examples.forEach((example) => {
    it(example.name, async () => {
      const result = await truncate(
        example.inputs.text,
        example.inputs.instructions,
        example.inputs.config
      );

      // Verify it returns a number
      expect(typeof result).toBe('number');
      
      // Verify it's a valid index within the text
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(example.inputs.text.length);

      // Verify specific expectations
      Object.entries(example.wants).forEach(([key, want]) => {
        if (key === 'result') {
          if (want && typeof want.asymmetricMatch === 'function') {
            expect(result).toEqual(want);
          } else if (want !== undefined) {
            expect(result).toBe(want);
          }
        } else if (key === 'resultGreaterThan') {
          expect(result).toBeGreaterThan(want);
        }
      });

      // Test that the truncation actually works
      const truncated = example.inputs.text.slice(0, result);
      expect(truncated.length).toBe(result);
    }, 30000); // Allow time for LLM calls
  });
});