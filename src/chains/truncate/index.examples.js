import { describe, expect, it } from 'vitest';
import truncate from './index.js';

const examples = [
  {
    name: 'truncates at sentence boundary',
    inputs: {
      text: 'First sentence. Second sentence. Third sentence.',
      options: { limit: 20 },
    },
    wants: {
      cutType: 'sentence',
      truncated: 'First sentence.',
      preservationScore: expect.any(Number),
    },
  },
  {
    name: 'preserves paragraphs when possible',
    inputs: {
      text: 'Short paragraph.\n\nAnother paragraph with more content.',
      options: { limit: 18 },
    },
    wants: {
      cutType: 'paragraph',
      truncated: 'Short paragraph.',
    },
  },
  {
    name: 'handles word-based limits',
    inputs: {
      text: 'The quick brown fox jumps over the lazy dog.',
      options: { limit: 5, unit: 'words' },
    },
    wants: {
      cutType: 'word',
      truncated: 'The quick brown fox jumps',
      cutPoint: 5,
    },
  },
  {
    name: 'cuts at clause boundaries',
    inputs: {
      text: 'This is a long sentence with commas, semicolons; and other punctuation.',
      options: { limit: 40 },
    },
    wants: {
      cutType: 'clause',
      truncated: expect.stringContaining('commas,'),
    },
  },
  {
    name: 'preserves code blocks',
    inputs: {
      text: 'Here is code:\n\n```js\nfunction test() {\n  return true;\n}\n```\n\nMore text.',
      options: { limit: 60 },
    },
    wants: {
      cutType: 'code-block',
      truncated: expect.stringContaining('```'),
    },
  },
  {
    name: 'returns full text when under limit',
    inputs: {
      text: 'Short text',
      options: { limit: 100 },
    },
    wants: {
      cutType: 'full',
      truncated: 'Short text',
      preservationScore: 1.0,
    },
  },
  {
    name: 'handles empty input',
    inputs: {
      text: '',
      options: { limit: 10 },
    },
    wants: {
      cutType: 'none',
      truncated: '',
      preservationScore: 0.0,
    },
  },
  {
    name: 'uses custom tokenizer',
    inputs: {
      text: 'one,two,three,four,five',
      options: {
        limit: 3,
        unit: 'tokens',
        tokenizer: (text) => text.split(','),
      },
    },
    wants: {
      cutType: expect.any(String),
      cutPoint: 3,
    },
  },
];

describe('truncate', () => {
  examples.forEach((example) => {
    it(example.name, () => {
      const result = truncate(example.inputs.text, example.inputs.options);

      Object.entries(example.wants).forEach(([key, want]) => {
        if (want && typeof want.asymmetricMatch === 'function') {
          expect(result[key]).toEqual(want);
        } else {
          expect(result[key]).toBe(want);
        }
      });

      // Always verify structure
      expect(result).toHaveProperty('truncated');
      expect(result).toHaveProperty('cutPoint');
      expect(result).toHaveProperty('cutType');
      expect(result).toHaveProperty('preservationScore');
      expect(typeof result.preservationScore).toBe('number');
      expect(result.preservationScore).toBeGreaterThanOrEqual(0);
      expect(result.preservationScore).toBeLessThanOrEqual(1);
    });
  });
});
