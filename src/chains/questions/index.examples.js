import { describe } from 'vitest';
import { longTestTimeout } from '../../constants/common.js';
import questions from './index.js';
import { getTestHelpers } from '../test-analysis/test-wrappers.js';

const { it, expect, aiExpect } = getTestHelpers('Questions verblet');

describe('Questions verblet', () => {
  it(
    'Writing a prompt toolkit for ChatGPT',
    async () => {
      const result = await questions('Writing a prompt toolkit for ChatGPT', {
        exploration: 0.5,
      });
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(5);
      await aiExpect(result).toSatisfy(
        'questions relevant to building a prompt toolkit or working with ChatGPT'
      );
    },
    longTestTimeout
  );
});
