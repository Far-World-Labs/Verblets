import { describe } from 'vitest';
import split from './index.js';
import fs from 'node:fs';
import path from 'node:path';
import { longTestTimeout, isMediumBudget } from '../../constants/common.js'; // standard: 1-2 LLM calls per chunk
import { getTestHelpers } from '../test-analysis/test-wrappers.js';

const { it, expect, aiExpect } = getTestHelpers('Split chain');

describe.skipIf(!isMediumBudget)('[medium] split chain examples', () => {
  const comedySet = fs.readFileSync(
    path.join(process.cwd(), 'src/samples/txt/taylor-tomlinson-10-2024.txt'),
    'utf8'
  );

  it(
    'should split comedy set into distinct topics',
    async () => {
      const TOPIC_DELIM = '---TOPIC-BREAK---';
      const topics = await split(comedySet, 'between different comedy topics or subject changes', {
        delimiter: TOPIC_DELIM,
        chunkLen: 2000,
        targetSplitsPerChunk: 2,
      });

      expect(topics.length).toBeGreaterThan(2);
      // Each topic should have meaningful content
      topics.forEach((topic) => expect(topic.trim().length).toBeGreaterThan(20));

      await aiExpect(topics).toSatisfy('The segments represent distinct topics or subject changes');
    },
    longTestTimeout
  );

  it(
    'should split individual topics by punchlines',
    async () => {
      const TOPIC_DELIM = '---TOPIC-BREAK---';
      const PUNCHLINE_DELIM = '---PUNCHLINE---';

      // Use larger chunks to get meaningful topics
      const topics = await split(comedySet, 'between different comedy topics or subject changes', {
        delimiter: TOPIC_DELIM,
        chunkLen: 3000,
      });

      // Find a topic that's long enough for punchline splitting
      const longTopic = topics.find((topic) => topic.length > 500) || topics[0];

      const jokes = await split(longTopic, 'after sentences that end with punchlines or jokes', {
        delimiter: PUNCHLINE_DELIM,
        chunkLen: 800,
      });

      expect(jokes.length).toBeGreaterThanOrEqual(1);
      // Each joke segment should have content
      jokes.forEach((joke) => expect(joke.trim().length).toBeGreaterThan(0));
    },
    longTestTimeout
  );

  it(
    'should preserve all original text content',
    async () => {
      const DELIM = '---SPLIT---';
      const segments = await split(comedySet, 'between different comedy topics', {
        delimiter: DELIM,
        chunkLen: 1500,
      });

      const reconstructed = segments.join(' ');
      const originalWords = comedySet.replace(/\s+/g, ' ').trim().split(' ');
      const reconstructedWords = reconstructed.replace(/\s+/g, ' ').trim().split(' ');

      // Word counts should be close (within 10%)
      const ratio = reconstructedWords.length / originalWords.length;
      expect(ratio).toBeGreaterThan(0.9);
      expect(ratio).toBeLessThan(1.1);
    },
    longTestTimeout
  );
});
