import { describe } from 'vitest';
import scale, { createScale, scaleSpec, applyScale } from './index.js';
import { longTestTimeout, isMediumBudget } from '../../constants/common.js'; // standard: 2-3 LLM calls per test
import { getTestHelpers } from '../test-analysis/test-wrappers.js';

const { it, expect, aiExpect } = getTestHelpers('Scale chain');

describe.skipIf(!isMediumBudget)('[medium] scale examples', () => {
  it(
    'maps numbers via logarithmic scaling',
    async () => {
      const logScale = scale(`
Create a scale that maps numbers from 1 to 1000000 onto a 0-10 range using logarithmic scaling.
- Very small numbers (1-10) → lower range (0-2)
- Medium numbers (100-10000) → middle range (3-7)
- Large numbers (100000-1000000) → upper range (8-10)`);

      const result1 = await logScale(10);
      const result2 = await logScale(1000);
      const result3 = await logScale(100000);

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
      const qualityScale = scale(`
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

      const result1 = await qualityScale({ stars: 1 });
      const result2 = await qualityScale({ stars: 3 });
      const result3 = await qualityScale({ stars: 5 });

      expect(result1).toBe(0);
      expect(result2).toBe(50);
      expect(result3).toBe(100);
    },
    longTestTimeout
  );
});

describe.skipIf(!isMediumBudget)('[medium] createScale examples', () => {
  it('generates spec then applies it consistently', { timeout: longTestTimeout }, async () => {
    const tempSpec = await scaleSpec(`
      Convert temperature feelings to comfort descriptions:
      - Below 10°C: "freezing"
      - 10-15°C: "cold"
      - 15-20°C: "cool"
      - 20-25°C: "comfortable"
      - 25-30°C: "warm"
      - Above 30°C: "hot"`);

    const tempScale = createScale(tempSpec);

    const result1 = await tempScale(22);
    const result2 = await tempScale(8);

    await aiExpect(result1).toSatisfy(
      'a comfort description for around 22°C, likely "comfortable"'
    );
    await aiExpect(result2).toSatisfy(
      'a comfort description indicating very cold temperatures (freezing or cold)'
    );

    expect(tempScale.specification).toBe(tempSpec);
  });
});

describe.skipIf(!isMediumBudget)('[medium] scaleSpec and applyScale examples', () => {
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

    const low = await applyScale('low', spec);
    const critical = await applyScale('critical', spec);

    expect(low).toBeGreaterThanOrEqual(1);
    expect(low).toBeLessThanOrEqual(3);
    expect(critical).toBeGreaterThanOrEqual(9);
    expect(critical).toBeLessThanOrEqual(10);
  });
});
