import { describe } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sort from './index.js';
import { longTestTimeout } from '../../constants/common.js';
import { getTestHelpers } from '../test-analysis/test-wrappers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { it, expect, aiExpect } = getTestHelpers('Sort chain');

describe('sort examples', () => {
  it(
    'movie night decision helper',
    async () => {
      const movieData = fs.readFileSync(path.join(__dirname, 'test-data', 'movies.txt'), 'utf8');
      const movieSuggestions = movieData
        .trim()
        .split('\n')
        .filter((line) => line.trim());

      // With 30 movies and batchSize of 8, we'll have 4 requests in first pass
      const sorted = await sort(
        movieSuggestions,
        'good for watching with friends on a Friday night',
        {
          batchSize: 8,
          extremeK: 5,
          iterations: 1,
        }
      );

      // No duplicates and all items preserved
      const uniqueSorted = [...new Set(sorted)];
      expect(uniqueSorted.length).toBe(sorted.length);
      expect(sorted.length).toBe(movieSuggestions.length);

      // Verify sorting quality with LLM
      await aiExpect(sorted.slice(0, 5).join('\n')).toSatisfy(
        'top movies should be entertaining and accessible for group viewing'
      );

      await aiExpect(sorted.slice(-5).join('\n')).toSatisfy(
        'bottom movies should be intense, divisive, or require full attention'
      );
    },
    longTestTimeout
  );
});
