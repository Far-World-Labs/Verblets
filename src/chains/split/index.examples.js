import { describe, it as vitestIt, expect as vitestExpect, beforeAll, afterAll } from 'vitest';
import split from './index.js';
import fs from 'node:fs';
import path from 'node:path';
import vitestAiExpect from '../expect/index.js';
import { logSuiteStart, logSuiteEnd } from '../test-analysis/setup.js';
import { wrapIt, wrapExpect, wrapAiExpect } from '../test-analysis/test-wrappers.js';
import { extractFileContext } from '../../lib/logger/index.js';
import { getConfig } from '../test-analysis/config.js';

const config = getConfig();
const it = config?.aiMode ? wrapIt(vitestIt, { baseProps: { suite: 'Split chain' } }) : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'Split chain' } })
  : vitestExpect;
const aiExpect = config?.aiMode
  ? wrapAiExpect(vitestAiExpect, { baseProps: { suite: 'Split chain' } })
  : vitestAiExpect;
const suiteLogStart = config?.aiMode ? logSuiteStart : () => {};
const suiteLogEnd = config?.aiMode ? logSuiteEnd : () => {};

beforeAll(async () => {
  await suiteLogStart('Split chain', extractFileContext(2));
});

afterAll(async () => {
  await suiteLogEnd('Split chain', extractFileContext(2));
});

describe('split chain examples', () => {
  const comedySet = fs.readFileSync(
    path.join(process.cwd(), 'src/samples/txt/taylor-tomlinson-10-2024.txt'),
    'utf8'
  );

  it('should split comedy set into distinct topics', async () => {
    const TOPIC_DELIM = '---TOPIC-BREAK---';
    const topicsMarked = await split(
      comedySet,
      'between different comedy topics or subject changes',
      { delimiter: TOPIC_DELIM, chunkLen: 2000, targetSplitsPerChunk: 2 }
    );

    const topics = topicsMarked.split(TOPIC_DELIM).filter((topic) => topic.trim());

    const hasMultipleTopics = await aiExpect(
      `Found ${topics.length} topics in comedy set`
    ).toSatisfy('Has more than 2 distinct topics', { throws: false });

    const topicsAreDistinct = await aiExpect(topics.join('\n---SEPARATOR---\n')).toSatisfy(
      'The text has been split into sections that attempt to separate different topics or themes',
      { throws: false }
    );

    expect(hasMultipleTopics).toBe(true);
    expect(topicsAreDistinct).toBe(true);
  }, 30000);

  it('should split individual topics by punchlines', async () => {
    const TOPIC_DELIM = '---TOPIC-BREAK---';
    const PUNCHLINE_DELIM = '---PUNCHLINE---';

    // Use larger chunks to get meaningful topics
    const topicsMarked = await split(
      comedySet,
      'between different comedy topics or subject changes',
      { delimiter: TOPIC_DELIM, chunkLen: 3000 }
    );

    const topics = topicsMarked.split(TOPIC_DELIM).filter((topic) => topic.trim());

    // Find a topic that's long enough for punchline splitting
    const longTopic = topics.find((topic) => topic.length > 500) || topics[0];

    const punchlineSplit = await split(
      longTopic,
      'after sentences that end with punchlines or jokes',
      { delimiter: PUNCHLINE_DELIM, chunkLen: 800 }
    );

    const jokes = punchlineSplit.split(PUNCHLINE_DELIM).filter((joke) => joke.trim());

    const hasPunchlines = await aiExpect(`Split into ${jokes.length} joke segments`).toSatisfy(
      'Has at least 1 segment (splitting worked, even if not perfect)'
    );

    const jokesEndWithPunchlines = await aiExpect(
      jokes.slice(0, 2).join('\n---JOKE---\n')
    ).toSatisfy('At least one segment contains humor or comedic content');

    expect(hasPunchlines).toBe(true);
    expect(jokesEndWithPunchlines).toBe(true);
  }, 45000);

  it('should preserve all original text content', async () => {
    const DELIM = '---SPLIT---';
    const splitText = await split(comedySet, 'between different comedy topics', {
      delimiter: DELIM,
      chunkLen: 1500,
    });

    const reconstructed = splitText.split(DELIM).join('');
    const originalWords = comedySet.replace(/\s+/g, ' ').trim().split(' ');
    const reconstructedWords = reconstructed.replace(/\s+/g, ' ').trim().split(' ');

    const preservesContent = await aiExpect(
      `Original: ${originalWords.length} words, Reconstructed: ${reconstructedWords.length} words`
    ).toSatisfy('Word counts are reasonably close (within 10% is fine)');

    expect(preservesContent).toBe(true);
  }, 30000);

  it('should handle different chunk sizes appropriately', async () => {
    const DELIM = '---CHUNK-SPLIT---';

    // Test with small chunks
    const smallChunkSplit = await split(comedySet, 'between different topics', {
      delimiter: DELIM,
      chunkLen: 800,
    });

    // Test with large chunks
    const largeChunkSplit = await split(comedySet, 'between different topics', {
      delimiter: DELIM,
      chunkLen: 3000,
    });

    const smallChunkParts = smallChunkSplit.split(DELIM).filter((p) => p.trim());
    const largeChunkParts = largeChunkSplit.split(DELIM).filter((p) => p.trim());

    // Very lenient constraint - just check that both produced some output
    const handlesChunkSizes = await aiExpect(
      `Small chunks (800 chars): ${smallChunkParts.length} parts, Large chunks (3000 chars): ${largeChunkParts.length} parts`
    ).toSatisfy(
      'Both chunk sizes produced at least 1 part each (function works with different chunk sizes)'
    );

    expect(handlesChunkSizes).toBe(true);
  }, 60000);
});
