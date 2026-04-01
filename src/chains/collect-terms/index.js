import list from '../list/index.js';
import score from '../score/index.js';
import { nameStep, getOptions } from '../../lib/context/option.js';
import createProgressEmitter, { scopePhase } from '../../lib/progress/index.js';

const name = 'collect-terms';

const splitIntoChunks = (text, maxLen) => {
  const words = text.split(/\s+/);
  const chunks = [];
  let current = '';
  for (const word of words) {
    if (current.length + word.length + 1 > maxLen) {
      if (current) chunks.push(current.trim());
      current = word;
    } else {
      current += (current ? ' ' : '') + word;
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
};

export default async function collectTerms(text, config = {}) {
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();
  const { topN, chunkLen } = await getOptions(runConfig, {
    topN: 20,
    chunkLen: 1000,
  });

  try {
    const chunks = splitIntoChunks(text, chunkLen);
    const batchDone = emitter.batch(chunks.length);

    // Collect terms from each chunk
    const allTerms = [];
    for (const chunk of chunks) {
      const terms = await list(
        `key words and phrases that would help find documents about: ${chunk}`,
        { ...runConfig, onProgress: scopePhase(runConfig.onProgress, 'list:extract') }
      );
      allTerms.push(...terms);
      batchDone(1);
    }

    const uniqueTerms = Array.from(new Set(allTerms.map((t) => t.trim()))).filter(Boolean);

    // If we already have fewer terms than requested, return them all
    if (uniqueTerms.length <= topN) {
      emitter.complete({ outcome: 'success' });
      return uniqueTerms;
    }

    // Score each term by relevance to the full text context
    const scores = await score(
      uniqueTerms,
      `relevance as a search term for finding information (1-10, higher is more important)`,
      { ...runConfig, onProgress: scopePhase(runConfig.onProgress, 'score:rank') }
    );

    // Sort by score and take top N
    const termsWithScores = uniqueTerms.map((term, i) => ({ term, score: scores[i] }));
    termsWithScores.sort((a, b) => b.score - a.score);

    emitter.complete({ outcome: 'success' });

    return termsWithScores.slice(0, topN).map((item) => item.term);
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}
