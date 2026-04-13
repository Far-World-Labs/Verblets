import { describe } from 'vitest';
import scaleItem, { scaleSpec, scaleInstructions } from './index.js';
import { longTestTimeout, isMediumBudget } from '../../constants/common.js'; // standard: 2-3 LLM calls per test
import { getTestHelpers } from '../test-analysis/test-wrappers.js';

const { it, expect, aiExpect } = getTestHelpers('Scale chain');

describe.skipIf(!isMediumBudget)('[medium] scale examples', () => {
  it(
    'maps numbers via logarithmic scaling with pre-generated spec',
    async () => {
      const spec = await scaleSpec(`
Create a scale that maps numbers from 1 to 1000000 onto a 0-10 range using logarithmic scaling.
- Very small numbers (1-10) → lower range (0-2)
- Medium numbers (100-10000) → middle range (3-7)
- Large numbers (100000-1000000) → upper range (8-10)`);

      const instructions = scaleInstructions({ spec });

      const result1 = await scaleItem(10, instructions);
      const result2 = await scaleItem(1000, instructions);
      const result3 = await scaleItem(100000, instructions);

      expect(typeof result1).toBe('number');
      expect(result1).toBeGreaterThanOrEqual(0);
      expect(result1).toBeLessThanOrEqual(3);

      expect(typeof result2).toBe('number');
      expect(result2).toBeGreaterThanOrEqual(3);
      expect(result2).toBeLessThanOrEqual(7);

      expect(typeof result3).toBe('number');
      expect(result3).toBeGreaterThanOrEqual(5);
      expect(result3).toBeLessThanOrEqual(10);
    },
    longTestTimeout
  );

  it(
    'maps star ratings to quality scores',
    async () => {
      const spec = await scaleSpec(`
Sample data (NDJSON format):
{"stars": 1}
{"stars": 2}
{"stars": 3}
{"stars": 4}
{"stars": 5}

Range:
name: quality
description: Quality score where 0 means terrible and 100 means amazing
bounds: [0, 100]

Mapping: Map the "stars" field linearly to the quality range. 1 star = 0, 5 stars = 100.`);

      const instructions = scaleInstructions({ spec });

      const result1 = await scaleItem({ stars: 1 }, instructions);
      const result2 = await scaleItem({ stars: 3 }, instructions);
      const result3 = await scaleItem({ stars: 5 }, instructions);

      expect(result1).toBe(0);
      expect(result2).toBe(50);
      expect(result3).toBe(100);
    },
    longTestTimeout
  );
});

describe.skipIf(!isMediumBudget)('[medium] scaleItem with instruction bundle', () => {
  it('applies pre-generated spec via scaleInstructions', { timeout: longTestTimeout }, async () => {
    const spec = await scaleSpec(`
      Convert temperature feelings to comfort descriptions:
      - Below 10°C: "freezing"
      - 10-15°C: "cold"
      - 15-20°C: "cool"
      - 20-25°C: "comfortable"
      - 25-30°C: "warm"
      - Above 30°C: "hot"`);

    const instructions = scaleInstructions({ spec });

    const result1 = await scaleItem(22, instructions);
    const result2 = await scaleItem(8, instructions);

    await aiExpect(result1).toSatisfy(
      'a comfort description for around 22°C, likely "comfortable"'
    );
    await aiExpect(result2).toSatisfy(
      'a comfort description indicating very cold temperatures (freezing or cold)'
    );
  });

  it('generates spec and applies it to priority levels', { timeout: longTestTimeout }, async () => {
    const spec = await scaleSpec(`
      Convert priority levels to numeric urgency scores:
      - "low": 1-3
      - "medium": 4-6
      - "high": 7-8
      - "critical": 9-10`);

    expect(spec).toHaveProperty('domain');
    expect(spec).toHaveProperty('range');
    expect(spec).toHaveProperty('mapping');

    const low = await scaleItem('low', { text: 'Apply scale', spec });
    const critical = await scaleItem('critical', { text: 'Apply scale', spec });

    expect(low).toBeGreaterThanOrEqual(1);
    expect(low).toBeLessThanOrEqual(3);
    expect(critical).toBeGreaterThanOrEqual(9);
    expect(critical).toBeLessThanOrEqual(10);
  });
});
