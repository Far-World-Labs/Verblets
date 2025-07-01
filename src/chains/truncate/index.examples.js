import { describe, expect, it } from 'vitest';
import truncate from './index.js';

const examples = [
  {
    name: 'returns full text when within limit',
    inputs: {
      text: 'Short text',
      instructions: 'Truncate if needed',
      config: { limit: 100 },
    },
    wants: {
      cutType: 'full',
      truncated: 'Short text',
      preservationScore: 1.0,
    },
  },
  {
    name: 'truncates longer text at semantic boundaries',
    inputs: {
      text: 'This is a longer piece of text that needs to be truncated. It has multiple sentences to test the LLM truncation logic.',
      instructions: 'Find the best semantic boundary',
      config: { limit: 50 },
    },
    wants: {
      cutType: expect.stringMatching(/sentence|clause|word/),
      preservationScore: expect.any(Number),
    },
  },
  {
    name: 'handles word-based limits',
    inputs: {
      text: 'The quick brown fox jumps over the lazy dog and runs through the forest.',
      instructions: 'Truncate at natural boundaries',
      config: { limit: 8, unit: 'words' },
    },
    wants: {
      cutType: expect.any(String),
      cutPoint: expect.any(Number),
    },
  },
  {
    name: 'handles empty input gracefully',
    inputs: {
      text: '',
      instructions: 'Truncate if needed',
      config: { limit: 10 },
    },
    wants: {
      cutType: 'none',
      truncated: '',
      preservationScore: 0.0,
    },
  },
  {
    name: 'provides reasoning for truncation decisions',
    inputs: {
      text: 'First paragraph with important content.\n\nSecond paragraph with additional details that could be removed.',
      instructions: 'Preserve the most important information',
      config: { limit: 60 },
    },
    wants: {
      reasoning: expect.any(String),
      preservationScore: expect.any(Number),
    },
  },
  {
    name: 'respects character limits with fallback',
    inputs: {
      text: 'This text will need to be truncated at character level if LLM fails',
      instructions: 'Truncate intelligently',
      config: { 
        limit: 20, 
        unit: 'characters',
        llm: { modelName: 'invalid-model' } // Force fallback
      },
    },
    wants: {
      cutType: expect.any(String),
      truncated: expect.any(String),
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

      // Verify basic structure
      expect(result).toHaveProperty('truncated');
      expect(result).toHaveProperty('cutPoint');
      expect(result).toHaveProperty('cutType');
      expect(result).toHaveProperty('preservationScore');
      expect(result).toHaveProperty('reasoning');

      // Verify types
      expect(typeof result.truncated).toBe('string');
      expect(typeof result.cutPoint).toBe('number');
      expect(typeof result.cutType).toBe('string');
      expect(typeof result.preservationScore).toBe('number');
      expect(typeof result.reasoning).toBe('string');

      // Verify score bounds
      expect(result.preservationScore).toBeGreaterThanOrEqual(0);
      expect(result.preservationScore).toBeLessThanOrEqual(1);

      // Verify specific expectations
      Object.entries(example.wants).forEach(([key, want]) => {
        if (want && typeof want.asymmetricMatch === 'function') {
          expect(result[key]).toEqual(want);
        } else if (want !== undefined) {
          expect(result[key]).toBe(want);
        }
      });

      // Verify length constraint is respected (unless it's the full text case)
      if (result.cutType !== 'full') {
        const unit = example.inputs.config.unit || 'characters';
        const limit = example.inputs.config.limit;
        
        let actualLength;
        switch (unit) {
          case 'words':
            actualLength = result.truncated.trim().split(/\s+/).filter(Boolean).length;
            break;
          case 'tokens':
            actualLength = result.truncated.trim().split(/\s+/).filter(Boolean).length;
            break;
          default:
            actualLength = result.truncated.length;
        }
        
        expect(actualLength).toBeLessThanOrEqual(limit);
      }
    }, 30000); // Allow more time for LLM calls
  });
});