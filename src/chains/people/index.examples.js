import { describe, it as vitestIt, expect as vitestExpect } from 'vitest';
import peopleList from './index.js';
import vitestAiExpect from '../expect/index.js';
import { longTestTimeout } from '../../constants/common.js';
import { wrapIt, wrapExpect, wrapAiExpect } from '../test-analysis/test-wrappers.js';
import { getConfig } from '../test-analysis/config.js';

const config = getConfig();
const it = config?.aiMode ? wrapIt(vitestIt, { baseProps: { suite: 'People chain' } }) : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'People chain' } })
  : vitestExpect;
const aiExpect = config?.aiMode
  ? wrapAiExpect(vitestAiExpect, { baseProps: { suite: 'People chain' } })
  : vitestAiExpect;

describe('people chain', () => {
  it(
    'generates a list of people based on description',
    async () => {
      const people = await peopleList('startup founders in Silicon Valley', 3);

      expect(Array.isArray(people)).toBe(true);
      expect(people.length).toBe(3);

      // Each person should be an object with at least a name
      people.forEach((person) => {
        expect(typeof person).toBe('object');
        expect(person).toHaveProperty('name');
      });

      const matchesDescription = await aiExpect(people).toSatisfy(
        'Should be 3 people with startup founder backgrounds in Silicon Valley'
      );
      expect(matchesDescription).toBe(true);
    },
    longTestTimeout
  );

  it(
    'generates diverse people for team scenarios',
    async () => {
      const people = await peopleList(
        'diverse software engineering team with different specialties',
        5
      );

      expect(Array.isArray(people)).toBe(true);
      expect(people.length).toBe(5);

      const hasDiversity = await aiExpect(people).toSatisfy(
        'Should represent diverse backgrounds, specialties, and perspectives for a software engineering team'
      );
      expect(hasDiversity).toBe(true);
    },
    longTestTimeout
  );
});
