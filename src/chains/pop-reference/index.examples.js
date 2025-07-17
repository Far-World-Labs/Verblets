import { describe, it, expect } from 'vitest';
import popReference from './index.js';
import { aiExpect } from '../expect/index.js';
import { longTestTimeout } from '../../constants/common.js';

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

      const hasRequiredProps = await aiExpect(result[0]).toSatisfy(
        'Has all required properties: reference (string), source (string), score (number 0-1), and match object with text, start, end'
      );
      expect(hasRequiredProps).toBe(true);

      const satisfiesMetaphor = await aiExpect(result).toSatisfy(
        'Contains metaphorical references that relate to decision-making or pivotal moments'
      );
      expect(satisfiesMetaphor).toBe(true);
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

      const satisfiesInclude = await aiExpect(result).toSatisfy(
        'References come from The Office, Parks and Recreation, or Silicon Valley shows'
      );
      expect(satisfiesInclude).toBe(true);

      const satisfiesContext = await aiExpect(result).toSatisfy(
        'References relate to workplace dysfunction, awkward meetings, or avoidance behavior'
      );
      expect(satisfiesContext).toBe(true);
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

      const hasContext = await aiExpect(result[0]).toSatisfy(
        'Has a context property that is a non-empty string describing the reference'
      );
      expect(hasContext).toBe(true);

      const satisfiesDenial = await aiExpect(result).toSatisfy(
        'References relate to denial, pretending everything is fine, or ignoring obvious problems'
      );
      expect(satisfiesDenial).toBe(true);
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

      const satisfiesWeightedSources = await aiExpect(result).toSatisfy(
        'References come from Lord of the Rings, Star Wars, or Harry Potter'
      );
      expect(satisfiesWeightedSources).toBe(true);

      const satisfiesChoice = await aiExpect(result).toSatisfy(
        'References relate to choices between safety and adventure, or comfort and growth'
      );
      expect(satisfiesChoice).toBe(true);
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

      const hasSportsReferences = await aiExpect(result).toSatisfy(
        'References come from sports movies and relate to underdog victories'
      );
      expect(hasSportsReferences).toBe(true);

      const hasValidStructure = await aiExpect(result).toSatisfy(
        'All references have valid match.text strings and scores between 0 and 1'
      );
      expect(hasValidStructure).toBe(true);
    },
    longTestTimeout
  );
});
