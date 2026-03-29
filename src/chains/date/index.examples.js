import { describe } from 'vitest';
import date from './index.js';
import { longTestTimeout } from '../../constants/common.js';
import { getTestHelpers } from '../test-analysis/test-wrappers.js';

const { it, expect, aiExpect } = getTestHelpers('Date chain');

describe('date examples', () => {
  it(
    'gets Star Wars release date',
    async () => {
      const result = await date('When was the original Star Wars released?', {
      });
      expect(result instanceof Date).toBe(true);
      await aiExpect(`Star Wars release date: ${result.toISOString()}`).toSatisfy(
        'Is this close to the actual release date of the first Star Wars movie?'
      );
    },
    longTestTimeout
  );

  it(
    'finds Christmas 2025',
    async () => {
      const result = await date('What date is Christmas Day 2025?', {
      });
      expect(result instanceof Date).toBe(true);
      expect(result.getUTCFullYear()).toBe(2025);
      expect(result.getUTCMonth()).toBe(11); // December
      expect(result.getUTCDate()).toBe(25);
    },
    longTestTimeout
  );
});
