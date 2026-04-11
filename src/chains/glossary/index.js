import nlp from 'compromise';
import sort from '../sort/index.js';
import map from '../map/index.js';
import { glossaryExtractionJsonSchema } from './schemas.js';
import { nameStep, getOptions } from '../../lib/context/option.js';
import createProgressEmitter, { scopePhase } from '../../lib/progress/index.js';
import { jsonSchema } from '../../lib/llm/index.js';
import { Outcome } from '../../lib/progress/constants.js';

const name = 'glossary';

// Response format for map: each chunk produces an array of terms
const GLOSSARY_RESPONSE_FORMAT = jsonSchema(
  glossaryExtractionJsonSchema.name,
  glossaryExtractionJsonSchema.schema
);

/**
 * Extract uncommon or technical terms from text that would benefit from definition.
 *
 * @param {string} text - source text
 * @param {object} [config]
 * @param {number} [config.maxTerms=10] - maximum terms to return
 * @param {number} [config.sentencesPerBatch=3] - number of sentences per batch
 * @param {number} [config.overlap=1] - number of overlapping sentences between batches
 * @param {number} [config.batchSize=1] - items per LLM batch
 * @param {string} [config.sortBy='importance for understanding the content'] - sorting criteria
 * @returns {Promise<string[]>} list of important terms, sorted by relevance
 */
export default async function glossary(text, config = {}) {
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();
  const { maxTerms, sortBy, sentencesPerBatch, overlap } = await getOptions(runConfig, {
    maxTerms: 10,
    sortBy: 'importance for understanding the content',
    sentencesPerBatch: 3,
    overlap: 1,
  });
  if (!text || !text.trim()) {
    emitter.complete({ outcome: Outcome.success, terms: 0 });
    return [];
  }

  try {
    // Parse sentences using compromise
    const doc = nlp(text);
    const sentences = doc.sentences().out('array');

    if (sentences.length === 0) {
      emitter.complete({ outcome: Outcome.success, terms: 0 });
      return [];
    }

    // Create batches of sentences with overlap
    const textChunks = [];
    for (let i = 0; i < sentences.length; i += sentencesPerBatch - overlap) {
      const batch = sentences.slice(i, i + sentencesPerBatch);
      if (batch.length > 0) {
        textChunks.push(batch.join(' '));
      }
    }

    // +1 for the sort phase
    const batchDone = emitter.batch(textChunks.length + 1);

    const instructions = `Extract every proper noun and every term that a general reader would need to look up. Over-extract — the list will be filtered later.

Return a "terms" object containing an array of the extracted terms.`;

    const mapResults = await map(textChunks, instructions, {
      ...runConfig,
      batchSize: runConfig.batchSize ?? 1,
      responseFormat: GLOSSARY_RESPONSE_FORMAT,
      onProgress: scopePhase(runConfig.onProgress, 'glossary:extract'),
    });

    batchDone(textChunks.length);

    const termSet = new Set();
    mapResults.forEach((result) => {
      // Each mapResults item is an object with a 'terms' array
      if (result && result.terms && Array.isArray(result.terms)) {
        result.terms.forEach((term) => {
          if (term && typeof term === 'string') {
            termSet.add(term);
          }
        });
      }
    });

    const terms = Array.from(termSet);
    if (terms.length === 0) {
      emitter.complete({ outcome: Outcome.success, terms: 0 });
      return [];
    }

    // Sort by importance for understanding the content
    const sorted = await sort(terms, sortBy, {
      ...runConfig,
      onProgress: scopePhase(runConfig.onProgress, 'glossary:sort'),
    });

    batchDone(1);

    const result = sorted.slice(0, maxTerms);

    emitter.complete({ outcome: Outcome.success, terms: result.length });

    return result;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}
