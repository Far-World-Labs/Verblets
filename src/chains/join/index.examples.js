import { describe } from 'vitest';
import join from './index.js';
import { longTestTimeout } from '../../constants/common.js';
import { getTestHelpers } from '../test-analysis/test-wrappers.js';

const { it, expect, aiExpect } = getTestHelpers('Join chain');

describe('join examples', () => {
  it(
    'joins fragments with bulk processing',
    async () => {
      const fragments = [
        'The sun sets behind the mountains.',
        'A gentle breeze rustles through the trees.',
        'The moon rises slowly above the treeline.',
      ];
      const result = await join(fragments, 'Connect these fragments with natural transitions', {
        windowSize: 2,
      });

      // Check for key words from each fragment rather than exact matches
      const keyWords = [
        ['sun', 'sets', 'mountains'],
        ['breeze', 'rustles', 'trees'],
        ['moon', 'rises', 'treeline'],
      ];

      const containsKeyContent = keyWords.every((words) =>
        words.some((word) => result.toLowerCase().includes(word.toLowerCase()))
      );

      const hasReasonableLength = result.length > fragments.join(' ').length * 0.7;

      expect(typeof result).toBe('string');
      expect(containsKeyContent).toBe(true);
      expect(hasReasonableLength).toBe(true);

      // AI validation for coherence and flow
      await aiExpect(result).toSatisfy(
        'This text flows naturally and connects sunset, breeze, and moonrise in a poetic way',
        { mode: 'error' }
      );
    },
    longTestTimeout
  );

  it(
    'handles empty and single item lists',
    async () => {
      const emptyResult = await join([]);
      const singleResult = await join(['Only item']);

      expect(emptyResult).toBe('');
      expect(singleResult).toBe('Only item');
    },
    longTestTimeout
  );
});
