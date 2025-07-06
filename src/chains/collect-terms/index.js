import list from '../list/index.js';
import reduce from '../reduce/index.js';

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
  const allTerms = [];
  for (const chunk of chunks) {
    const terms = await list(`important complex or technical terms from: ${chunk}`, {
      llm,
      ...options,
    });
    allTerms.push(...terms);
  }
  const uniqueTerms = Array.from(new Set(allTerms.map((t) => t.trim())));
  if (uniqueTerms.length <= topN) return uniqueTerms;
  const reduced = await reduce(
    uniqueTerms,
    `Return the top ${topN} terms as a comma-separated list`,
    { initial: '', llm, ...options }
  );
  return reduced
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, topN);
}
