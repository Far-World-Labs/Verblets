import { describe, it, expect } from 'vitest';
import popReference from './index.js';
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
      expect(result[0]).toHaveProperty('reference');
      expect(result[0]).toHaveProperty('source');
      expect(result[0]).toHaveProperty('score');
      expect(result[0]).toHaveProperty('match');
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
      const sources = result.map((r) => r.source);
      expect(
        sources.some(
          (s) => s.includes('Office') || s.includes('Parks') || s.includes('Silicon Valley')
        )
      ).toBe(true);
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
      expect(result[0].context).toBeDefined();
      expect(typeof result[0].context).toBe('string');
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
      // Check that references come from the specified sources
      const sources = result.map((r) => r.source);
      expect(
        sources.some(
          (s) =>
            s.includes('Lord of the Rings') || s.includes('Star Wars') || s.includes('Harry Potter')
        )
      ).toBe(true);
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
      expect(result.every((r) => r.match.text)).toBe(true);
      expect(result.every((r) => r.score >= 0 && r.score <= 1)).toBe(true);
    },
    longTestTimeout
  );
});
