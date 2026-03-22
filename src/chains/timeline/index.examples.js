import { describe } from 'vitest';
import timeline from './index.js';
import { longTestTimeout, isHighBudget } from '../../constants/common.js'; // full: 12-18 LLM calls with enrichment
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getTestHelpers } from '../test-analysis/test-wrappers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { it, expect, aiExpect } = getTestHelpers('Timeline chain');

describe.skipIf(!isHighBudget)('[high] timeline', () => {
  it('extracts events from simple narrative', { timeout: longTestTimeout }, async () => {
    const text = `The company was founded in early 2010 by two college roommates.
    They secured their first major funding round in March 2012.
    By late 2013, they had expanded to three offices.
    The turning point came in 2015 when they launched their flagship product.
    They went public in September 2018.`;

    const result = await timeline(text, { chunkSize: 5000 });

    expect(result.length).toBeGreaterThanOrEqual(5);

    await aiExpect(result).toSatisfy(
      'Extracts 5 key events: founding (2010), funding (2012), expansion (2013), product launch (2015), IPO (2018)'
    );

    // Verify chronological ordering
    const parseableDates = result
      .filter((e) => !isNaN(new Date(e.timestamp)))
      .map((e) => new Date(e.timestamp));

    for (let i = 1; i < parseableDates.length; i++) {
      expect(parseableDates[i].getTime()).toBeGreaterThanOrEqual(parseableDates[i - 1].getTime());
    }
  });

  it('deduplicates across chunks', { timeout: longTestTimeout }, async () => {
    const longText = `
      The history of computing begins with the abacus in 2400 BCE.
      Blaise Pascal invented the Pascaline in 1642.
      Charles Babbage designed the Difference Engine in 1822.
      Ada Lovelace wrote the first algorithm in 1843.
      The ENIAC was completed in 1945.
    `.repeat(10);

    const result = await timeline(longText, { chunkSize: 500, maxParallel: 2 });

    expect(result.length).toBeGreaterThan(0);

    await aiExpect(result).toSatisfy(
      'Key computing milestones including abacus, Pascaline, Difference Engine, first algorithm, and ENIAC — no duplicates despite repeated text'
    );

    const eventNames = result.map((e) => e.name);
    expect(eventNames.length).toBe([...new Set(eventNames)].length);
  });

  it('enriches timeline with knowledge', { timeout: longTestTimeout }, async () => {
    const text = `The Wright brothers achieved first flight.
    World War II ended with atomic bombs.
    The internet transformed communication in the late 20th century.
    SpaceX launched reusable rockets.`;

    const enrichedResult = await timeline(text, {
      chunkSize: 5000,
      enrichment: 'high',
      batchSize: 2,
    });

    expect(enrichedResult.length).toBeGreaterThan(0);

    await aiExpect(enrichedResult).toSatisfy(
      'Timeline events with year-level or day-level precise timestamps rather than vague temporal references'
    );
  });

  it('processes large startup narrative', { timeout: longTestTimeout }, async () => {
    const startupStory = await fs.readFile(
      path.join(__dirname, 'test-data', 'startup-journey.txt'),
      'utf-8'
    );

    const result = await timeline(startupStory, { chunkSize: 10000, maxParallel: 1 });

    expect(result.length).toBeGreaterThan(10);

    await aiExpect(result).toSatisfy(
      'Multiple startup milestones: formation, funding rounds, product launches, and other significant business events'
    );
  });
});
