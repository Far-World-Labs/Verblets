import { describe } from 'vitest';
import peopleSet from './index.js';
import { longTestTimeout } from '../../constants/common.js';
import { getTestHelpers } from '../test-analysis/test-wrappers.js';

const { it, expect, aiExpect } = getTestHelpers('People chain');

describe('people chain', () => {
  it(
    'generates diverse people for team scenarios',
    async () => {
      const people = await peopleSet(
        'diverse software engineering team with different specialties',
        5
      );

      expect(Array.isArray(people)).toBe(true);
      expect(people.length).toBe(5);

      people.forEach((person) => {
        expect(typeof person).toBe('object');
        expect(person).toHaveProperty('name');
      });

      await aiExpect(people).toSatisfy(
        'Should represent diverse backgrounds, specialties, and perspectives for a software engineering team'
      );
    },
    longTestTimeout
  );
});
