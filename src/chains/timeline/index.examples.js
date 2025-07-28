import { describe, expect, it } from 'vitest';
import timeline from './index.js';
import aiExpect from '../expect/index.js';
import { longTestTimeout } from '../../constants/common.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('timeline', () => {
  it('extracts events from simple narrative', { timeout: longTestTimeout }, async () => {
    const text = `The company was founded in early 2010 by two college roommates. 
    They secured their first major funding round in March 2012. 
    By late 2013, they had expanded to three offices. 
    The turning point came in 2015 when they launched their flagship product. 
    They went public in September 2018.`;

    // Use large chunk size to process in one call
    const result = await timeline(text, { chunkSize: 5000 });

    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);

    const expectResult = await aiExpect(result).toSatisfy(
      `Should extract 5 key events: founding (early 2010), funding (March 2012), expansion (late 2013), product launch (2015), and IPO (September 2018)`
    );

    expect(expectResult).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(5);

    // Verify chronological ordering
    const parseableDates = result
      .filter((e) => !isNaN(new Date(e.timestamp)))
      .map((e) => new Date(e.timestamp));

    for (let i = 1; i < parseableDates.length; i++) {
      expect(parseableDates[i].getTime()).toBeGreaterThanOrEqual(parseableDates[i - 1].getTime());
    }
  });

  it('handles mixed date formats', { timeout: longTestTimeout }, async () => {
    const text = `Alexander Fleming discovered penicillin in September 1928. 
    However, it wasn't until 1940 that Florey and Chain began purifying it. 
    The first human trial was in February 1941. 
    By D-Day in 1944, mass production saved countless lives.`;

    const result = await timeline(text, { chunkSize: 5000 });

    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);

    const expectResult = await aiExpect(result).toSatisfy(
      `Should extract 4 events: discovery (September 1928), purification start (1940), first trial (February 1941), and D-Day mass production (1944)`
    );

    expect(expectResult).toBe(true);

    // Verify we found the key discovery date
    const discoveryEvent = result.find(
      (e) => e.timestamp.includes('1928') && e.timestamp.includes('09')
    );
    expect(discoveryEvent).toBeTruthy();
  });

  it('extracts from dense timeline', { timeout: longTestTimeout }, async () => {
    const text = `On July 15, 2023 at 9:00 AM the meeting started. 
    By 9:15 AM tensions were high. At 9:30 AM a recess was called. 
    The deal was signed at 10:45 AM. Press release went out at 11:00 AM.`;

    const result = await timeline(text, { chunkSize: 5000 });

    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);

    const expectResult = await aiExpect(result).toSatisfy(
      `Should extract 5 timestamped events occurring on July 15, 2023 from 9:00 AM through 11:00 AM inclusive`
    );

    expect(expectResult).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(5);
  });

  it('handles relative dates', { timeout: longTestTimeout }, async () => {
    const text = `The project kicked off on Monday. Three days later, we finalized requirements. 
    Development started the following week. After two months, we began testing.`;

    const result = await timeline(text, { chunkSize: 5000 });

    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);

    const expectResult = await aiExpect(result).toSatisfy(
      `Should extract 4 events with relative timestamps: kickoff (Monday), requirements (3 days later), development (following week), testing (2 months later)`
    );

    expect(expectResult).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(4);
  });

  it('processes with chunking when needed', { timeout: longTestTimeout }, async () => {
    // Create a longer text that will require chunking
    const longText = `
      The history of computing begins with the abacus in 2400 BCE.
      Blaise Pascal invented the Pascaline in 1642.
      Charles Babbage designed the Difference Engine in 1822.
      Ada Lovelace wrote the first algorithm in 1843.
      The ENIAC was completed in 1945.
    `.repeat(10); // Repeat to force chunking

    // Use smaller chunk size to test chunking
    const result = await timeline(longText, {
      chunkSize: 500,
      maxParallel: 2,
    });

    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);

    // Should find these events even with chunking and deduplication
    const expectResult = await aiExpect(result).toSatisfy(
      `Should extract key computing milestones including abacus (2400 BCE), Pascaline (1642), Difference Engine (1822), first algorithm (1843), and ENIAC (1945), with no duplicates despite text repetition`
    );

    expect(expectResult).toBe(true);

    // Check deduplication worked
    const eventNames = result.map((e) => e.name);
    const uniqueNames = [...new Set(eventNames)];

    expect(eventNames.length).toBe(uniqueNames.length);
  });

  it('handles empty or no-event text', { timeout: longTestTimeout }, async () => {
    const text = `This is a text without any dates or timeline events. 
    It's just a general description of something abstract and philosophical.`;

    const result = await timeline(text, { chunkSize: 5000 });

    // Even texts without explicit dates might extract some events
    expect(Array.isArray(result)).toBe(true);
  });

  it('processes large startup narrative efficiently', { timeout: longTestTimeout }, async () => {
    const startupStory = await fs.readFile(
      path.join(__dirname, 'test-data', 'startup-journey.txt'),
      'utf-8'
    );

    // Use very large chunk size to minimize LLM calls - modern models have large context windows
    const result = await timeline(startupStory, {
      chunkSize: 10000, // Process most of the document in one chunk
      maxParallel: 1,
    });

    console.log(`Extracted ${result.length} events from ${startupStory.length} characters`);

    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);

    const expectResult = await aiExpect(result).toSatisfy(
      `Should extract multiple startup milestones from the narrative. The timeline may include events like company formation, funding rounds, product launches, going public, and other significant business events. The extraction should capture various important dates and milestones throughout the company's journey.`
    );

    expect(expectResult).toBe(true);
    expect(result.length).toBeGreaterThan(10); // Should find many events in this detailed narrative
  });

  it('handles computing history with large context', { timeout: longTestTimeout }, async () => {
    const computingHistory = await fs.readFile(
      path.join(__dirname, 'test-data', 'computing-history.txt'),
      'utf-8'
    );

    // Process entire document in one chunk if possible
    const result = await timeline(computingHistory, {
      chunkSize: 15000, // Very large chunk to handle entire doc
    });

    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);

    const expectResult = await aiExpect(result).toSatisfy(
      `Should extract major computing milestones from ancient times (abacus) through modern era (AI, ChatGPT)`
    );

    expect(expectResult).toBe(true);

    // Should find key events
    const hasAncient = result.some(
      (e) => e.timestamp.includes('BCE') || e.name.toLowerCase().includes('abacus')
    );
    const hasModern = result.some(
      (e) =>
        e.timestamp.includes('202') ||
        e.name.toLowerCase().includes('ai') ||
        e.name.toLowerCase().includes('gpt')
    );

    expect(hasAncient).toBe(true);
    expect(hasModern).toBe(true);
  });

  it('enriches timeline with knowledge', { timeout: longTestTimeout }, async () => {
    const text = `The Wright brothers achieved first flight. 
    World War II ended with atomic bombs. 
    The internet transformed communication in the late 20th century.
    SpaceX launched reusable rockets.`;

    // First without enrichment
    const basicResult = await timeline(text, { chunkSize: 5000 });

    // Then with enrichment - use smaller batch size to test batching
    const enrichedResult = await timeline(text, {
      chunkSize: 5000,
      enrichWithKnowledge: true,
      batchSize: 2, // Process 2 events per batch to test batching
    });

    expect(enrichedResult).toBeDefined();
    expect(enrichedResult.length).toBeGreaterThanOrEqual(basicResult.length);

    // Should have more precise dates
    const hasEnrichedContent = await aiExpect(enrichedResult).toSatisfy(
      `Should contain precise dates like December 17, 1903 for Wright brothers flight, August 1945 for WWII end, and include additional context events`
    );

    expect(hasEnrichedContent).toBe(true);

    // Check for enriched events
    const hasEnrichment = enrichedResult.some((e) => e.enriched);
    expect(hasEnrichment).toBe(true);

    // Should maintain chronological order
    const parseableDates = enrichedResult
      .filter((e) => !isNaN(new Date(e.timestamp)))
      .map((e) => new Date(e.timestamp));

    for (let i = 1; i < parseableDates.length; i++) {
      expect(parseableDates[i].getTime()).toBeGreaterThanOrEqual(parseableDates[i - 1].getTime());
    }
  });
});
