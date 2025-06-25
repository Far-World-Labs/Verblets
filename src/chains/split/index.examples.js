import { describe, it, expect } from 'vitest';
import split from './index.js';
import fs from 'fs';
import path from 'path';
import { aiExpect } from '../expect/index.js';

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
      { delimiter: TOPIC_DELIM, chunkLen: 2000 }
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
  }, 15000);

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
    console.log(`Testing punchline splitting on topic of length: ${longTopic.length}`);

    const punchlineSplit = await split(
      longTopic,
      'after sentences that end with punchlines or jokes',
      { delimiter: PUNCHLINE_DELIM, chunkLen: 800 }
    );

    const jokes = punchlineSplit.split(PUNCHLINE_DELIM).filter((joke) => joke.trim());

    const hasPunchlines = await aiExpect(`Split into ${jokes.length} joke segments`).toSatisfy(
      'Has multiple joke segments (more than 1)'
    );

    const jokesEndWithPunchlines = await aiExpect(
      jokes.slice(0, 3).join('\n---JOKE---\n')
    ).toSatisfy('Most segments end with a punchline, joke, or humorous observation');

    expect(hasPunchlines).toBe(true);
    expect(jokesEndWithPunchlines).toBe(true);
  }, 15000);

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
    ).toSatisfy('Word counts are very close (within 5% difference)');

    expect(preservesContent).toBe(true);
  }, 15000);

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

    const handlesChunkSizes = await aiExpect(
      `Small chunks: ${smallChunkParts.length} parts, Large chunks: ${largeChunkParts.length} parts`
    ).toSatisfy('Both processing approaches completed successfully and produced output', {
      throws: false,
    });

    expect(handlesChunkSizes).toBe(true);
  }, 30000);
});
