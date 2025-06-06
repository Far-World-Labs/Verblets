import list from '../list/index.js';
import listReduce from '../../verblets/list-reduce/index.js';

const splitIntoChunks = (text, maxLen) => {
  const paragraphs = text.split(/\n\s*\n/);
  const chunks = [];
  let current = '';
  for (const p of paragraphs) {
    if ((current + p).length > maxLen) {
      if (current) chunks.push(current.trim());
      current = p;
    } else {
      current += (current ? '\n\n' : '') + p;
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
};

export default async function collectTerms(text, { chunkLen = 1000, topN = 20 } = {}) {
  const chunks = splitIntoChunks(text, chunkLen);
  const allTerms = [];
  for (const chunk of chunks) {
    const terms = await list(`important complex or technical terms from: ${chunk}`);
    allTerms.push(...terms);
  }
  const uniqueTerms = Array.from(new Set(allTerms.map((t) => t.trim())));
  if (uniqueTerms.length <= topN) return uniqueTerms;
  const reduced = await listReduce(
    '',
    uniqueTerms,
    `Return the top ${topN} terms as a comma-separated list`
  );
  return reduced
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, topN);
}
