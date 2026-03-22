import list from '../list/index.js';
import score from '../score/index.js';

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
  const { chunkLen = 1000, topN = 20, llm, ...options } = config;
  const chunks = splitIntoChunks(text, chunkLen);

  // Collect terms from each chunk
  const allTerms = [];
  for (const chunk of chunks) {
    const terms = await list(
      `key words and phrases that would help find documents about: ${chunk}`,
      {
        llm,
        ...options,
      }
    );
    allTerms.push(...terms);
  }

  const uniqueTerms = Array.from(new Set(allTerms.map((t) => t.trim()))).filter(Boolean);

  // If we already have fewer terms than requested, return them all
  if (uniqueTerms.length <= topN) return uniqueTerms;

  // Score each term by relevance to the full text context
  const scores = await score(
    uniqueTerms,
    `relevance as a search term for finding information (1-10, higher is more important)`,
    { llm, ...options }
  );

  // Sort by score and take top N
  const termsWithScores = uniqueTerms.map((term, i) => ({ term, score: scores[i] }));
  termsWithScores.sort((a, b) => b.score - a.score);

  return termsWithScores.slice(0, topN).map((item) => item.term);
}
