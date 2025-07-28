import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sort from './index.js';
import { expect as llmExpect } from '../expect/index.js';
import { longTestTimeout } from '../../constants/common.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('sort examples', () => {
  it(
    'movie night decision helper',
    async () => {
      const movieData = fs.readFileSync(path.join(__dirname, 'test-data', 'movies.txt'), 'utf8');
      const movieSuggestions = movieData
        .trim()
        .split('\n')
        .filter((line) => line.trim());

      // With 30 movies and chunkSize of 8, we'll have 4 requests in first pass
      const sorted = await sort(
        movieSuggestions,
        'good for watching with friends on a Friday night',
        {
          chunkSize: 8,
          extremeK: 5,
          iterations: 1,
        }
      );

      expect(sorted).toBeDefined();

      // Check for duplicates in output
      const uniqueSorted = [...new Set(sorted)];
      expect(uniqueSorted.length).toBe(sorted.length);

      // Should preserve all items
      expect(sorted.length).toBe(movieSuggestions.length);

      // Verify sorting quality with LLM
      await llmExpect(
        sorted.slice(0, 5).join('\n'),
        null,
        'top movies should be entertaining and accessible for group viewing'
      );

      await llmExpect(
        sorted.slice(-5).join('\n'),
        null,
        'bottom movies should be intense, divisive, or require full attention'
      );
    },
    longTestTimeout
  );

  it(
    'gift matching',
    async () => {
      const giftData = fs.readFileSync(path.join(__dirname, 'test-data', 'gift-ideas.txt'), 'utf8');
      const giftIdeas = giftData
        .trim()
        .split('\n')
        .filter((line) => line.trim());

      const sorted = await sort(giftIdeas, 'for someone who gardens and likes animals', {
        chunkSize: 10,
        extremeK: 7,
        iterations: 1,
      });

      expect(sorted).toBeDefined();

      // Check for duplicates in output
      const uniqueSorted = [...new Set(sorted)];
      expect(uniqueSorted.length).toBe(sorted.length);

      // Should preserve all items
      expect(sorted.length).toBe(giftIdeas.length);

      await llmExpect(
        sorted.slice(0, 5).join('\n'),
        null,
        'top gifts should relate to gardening or animals'
      );

      await llmExpect(
        sorted.slice(-3).join('\n'),
        null,
        'bottom gifts should be tech items or other non-gardening/animal related items'
      );
    },
    longTestTimeout
  );
});
