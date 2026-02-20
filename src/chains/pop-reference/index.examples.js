import { describe, it as vitestIt, expect as vitestExpect } from 'vitest';
import popReference from './index.js';
import { longTestTimeout } from '../../constants/common.js';
import vitestAiExpect from '../expect/index.js';
import { wrapIt, wrapExpect, wrapAiExpect } from '../test-analysis/test-wrappers.js';
import { getConfig } from '../test-analysis/config.js';

const config = getConfig();
const it = config?.aiMode
  ? wrapIt(vitestIt, { baseProps: { suite: 'Pop reference chain' } })
  : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'Pop reference chain' } })
  : vitestExpect;
const aiExpect = config?.aiMode
  ? wrapAiExpect(vitestAiExpect, { baseProps: { suite: 'Pop reference chain' } })
  : vitestAiExpect;

describe('popReference examples', () => {
  it(
    'should find Matrix references for a decision moment',
    async () => {
      const result = await popReference(
        'She finally made a decision after months of doubt',
        'pivotal moment of choosing clarity over comfort'
      );

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);

      // Validate structure with traditional assertions
      expect(result[0]).toHaveProperty('reference');
      expect(result[0]).toHaveProperty('source');
      expect(result[0]).toHaveProperty('score');
      expect(result[0]).toHaveProperty('match');
      expect(typeof result[0].reference).toBe('string');
      expect(typeof result[0].source).toBe('string');
      expect(result[0].score).toBeGreaterThanOrEqual(0);
      expect(result[0].score).toBeLessThanOrEqual(1);

      await aiExpect(result).toSatisfy(
        'References relate metaphorically to decision-making or pivotal moments'
      );
    },
    longTestTimeout
  );

  it(
    'should find Office references when specified',
    async () => {
      const result = await popReference(
        'The meeting dragged on with everyone avoiding the real issue',
        'workplace dysfunction and avoidance',
        {
          include: ['The Office', 'Parks and Recreation', 'Silicon Valley'],
        }
      );

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);

      // Validate sources match the include list
      const validSources = ['the office', 'parks and recreation', 'silicon valley'];
      result.forEach((ref) => {
        const sourceMatch = validSources.some((s) => ref.source.toLowerCase().includes(s));
        expect(sourceMatch).toBe(true);
      });
    },
    longTestTimeout
  );

  it(
    'should find meme references with context',
    async () => {
      const result = await popReference(
        'Everything was falling apart but they kept pretending it was fine',
        'denial in the face of obvious disaster',
        {
          include: ['Internet Memes', 'The Office'],
          referenceContext: true,
        }
      );

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);

      // Validate context property exists when referenceContext: true
      expect(result[0]).toHaveProperty('context');
      expect(typeof result[0].context).toBe('string');
      expect(result[0].context.length).toBeGreaterThan(0);

      await aiExpect(result).toSatisfy(
        'References relate to denial or pretending everything is fine'
      );
    },
    longTestTimeout
  );

  it(
    'should handle weighted sources appropriately',
    async () => {
      const result = await popReference(
        'They had to choose between safety and adventure',
        'life-changing decision between comfort and growth',
        {
          include: [
            { reference: 'Lord of the Rings', percent: 60 },
            { reference: 'Star Wars', percent: 30 },
            { reference: 'Harry Potter', percent: 10 },
          ],
          referencesPerSource: 1,
        }
      );

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThanOrEqual(1);

      // Validate sources match the weighted include list
      const validSources = ['lord of the rings', 'star wars', 'harry potter'];
      result.forEach((ref) => {
        const sourceMatch = validSources.some((s) => ref.source.toLowerCase().includes(s));
        expect(sourceMatch).toBe(true);
      });
    },
    longTestTimeout
  );

  it(
    'should find multiple references per source',
    async () => {
      const result = await popReference(
        'The underdog team surprised everyone by winning',
        'unexpected victory against all odds',
        {
          include: ['Sports Movies'],
          referencesPerSource: 3,
        }
      );

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThanOrEqual(2);

      // Validate structure of all references
      result.forEach((ref) => {
        expect(ref).toHaveProperty('reference');
        expect(ref).toHaveProperty('score');
        expect(ref).toHaveProperty('match');
        expect(ref.score).toBeGreaterThanOrEqual(0);
        expect(ref.score).toBeLessThanOrEqual(1);
        expect(typeof ref.match.text).toBe('string');
      });
    },
    longTestTimeout
  );
});
