import nlp from 'compromise';
import sort from '../sort/index.js';
import { bulkMapRetry } from '../bulk-map/index.js';
import { constants as promptConstants } from '../../prompts/index.js';
import parseLLMList from '../../lib/parse-llm-list/index.js';

const { onlyJSONStringArrayPerLine } = promptConstants;

/**
 * Extract uncommon or technical terms from text that would benefit from definition.
 *
 * @param {string} text - source text
 * @param {object} [options]
 * @param {number} [options.maxTerms=10] - maximum terms to return
 * @param {number} [options.batchSize=3] - number of sentences per batch
 * @param {number} [options.overlap=1] - number of overlapping sentences between batches
 * @param {number} [options.chunkSize=1] - number of text chunks to process in parallel
 * @param {string} [options.sortBy='importance for understanding the content'] - sorting criteria
 * @returns {Promise<string[]>} list of important terms, sorted by relevance
 */
export default async function glossary(
  text,
  {
    maxTerms = 10,
    batchSize = 3,
    overlap = 1,
    chunkSize = 1,
    sortBy = 'importance for understanding the content',
  } = {}
) {
  if (!text || !text.trim()) return [];

  // Parse sentences using compromise
  const doc = nlp(text);
  const sentences = doc.sentences().out('array');

  if (sentences.length === 0) return [];

  // Create batches of sentences with overlap
  const textChunks = [];
  for (let i = 0; i < sentences.length; i += batchSize - overlap) {
    const batch = sentences.slice(i, i + batchSize);
    if (batch.length > 0) {
      textChunks.push(batch.join(' '));
    }
  }

  const instructions = `For each text chunk, extract specialized terms that would benefit from definition in a glossary.

Focus on terms that:
- Are technical, academic, or domain-specific
- Would be unfamiliar to a general audience  
- Carry precise meaning in their field
- Are essential for understanding the content

${onlyJSONStringArrayPerLine}`;

  const mapped = await bulkMapRetry(textChunks, instructions, { chunkSize });

  const termSet = new Set();
  mapped.forEach((line) => {
    const terms = parseLLMList(line);
    terms.forEach((term) => {
      termSet.add(term);
    });
  });

  const terms = Array.from(termSet);
  if (terms.length === 0) return [];

  // Sort by importance for understanding the content
  const sorted = await sort(terms, sortBy);

  return sorted.slice(0, maxTerms);
}
