import { describe, expect, it } from 'vitest';
import truncate from './index.js';

const examples = [
  {
    name: 'returns full text when within limit',
    inputs: {
      text: 'Short text',
      instructions: 'Find the best truncation point',
      config: { limit: 100 },
    },
    wants: {
      cutType: 'full',
      truncated: 'Short text',
      preservationScore: 1.0,
    },
  },
  {
    name: 'truncates based on custom instructions',
    inputs: {
      text: 'First important sentence. Second less important sentence. Third filler sentence.',
      instructions: 'Prioritize keeping the most important content',
      config: { limit: 50 },
    },
    wants: {
      cutType: expect.stringMatching(/sentence|scored/),
      preservationScore: expect.any(Number),
    },
  },
  {
    name: 'handles word-based limits',
    inputs: {
      text: 'The quick brown fox jumps over the lazy dog and runs through the forest.',
      instructions: 'Keep complete thoughts',
      config: { limit: 8, unit: 'words' },
    },
    wants: {
      cutType: expect.any(String),
      cutPoint: expect.any(Number),
    },
  },
  {
    name: 'handles sentence-based limits',
    inputs: {
      text: 'First sentence here. Second sentence here. Third sentence here.',
      instructions: 'Preserve complete sentences',
      config: { limit: 2, unit: 'sentences' },
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
      instructions: 'Find the best truncation point',
      config: { limit: 10 },
    },
    wants: {
      cutType: 'none',
      truncated: '',
      preservationScore: 0.0,
    },
  },
  {
    name: 'follows specific truncation criteria',
    inputs: {
      text: 'Introduction paragraph. Technical details with specifications. Conclusion and summary.',
      instructions: 'Keep only the technical details',
      config: { limit: 60 },
    },
    wants: {
      preservationScore: expect.any(Number),
      cutType: expect.any(String),
    },
  },
  {
    name: 'uses fallback when scoring fails',
    inputs: {
      text: 'This text will trigger fallback behavior when LLM fails',
      instructions: 'Find the best cut',
      config: { 
        limit: 20, 
        unit: 'characters',
        llm: { modelName: 'invalid-model' } // Force fallback
      },
    },
    wants: {
      cutType: 'fallback',
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

      // Verify types
      expect(typeof result.truncated).toBe('string');
      expect(typeof result.cutPoint).toBe('number');
      expect(typeof result.cutType).toBe('string');
      expect(typeof result.preservationScore).toBe('number');

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
          case 'sentences':
            actualLength = result.truncated.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
            break;
          default:
            actualLength = result.truncated.length;
        }
        
        expect(actualLength).toBeLessThanOrEqual(limit);
      }
    }, 30000); // Allow time for LLM calls
  });
});