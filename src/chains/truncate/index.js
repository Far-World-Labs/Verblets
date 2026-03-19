import score from '../score/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { resolveAll, mapped, withOperation } from '../../lib/context/resolve.js';

// ===== Option Mappers =====

const DEFAULT_THRESHOLD = 6;

/**
 * Map aggression option to a score threshold for content removal.
 * low: higher threshold (7) — only removes content the LLM strongly considers removable. Conservative.
 * high: lower threshold (4) — removes anything the LLM isn't confident should stay. Aggressive.
 * @param {string|number|undefined} value
 * @returns {number} Score threshold (0-10) below which chunks are removed
 */
export const mapAggression = (value) => {
  if (value === undefined) return DEFAULT_THRESHOLD;
  if (typeof value === 'number') return value;
  return { low: 7, med: DEFAULT_THRESHOLD, high: 4 }[value] ?? DEFAULT_THRESHOLD;
};

/**
 * Create chunks of text with tracked end positions.
 *
 * @param {string} text - The text to chunk
 * @param {number} chunkSize - Target characters per chunk
 * @returns {Array} Array of {text, endIndex} objects
 */
function createChunks(text, chunkSize) {
  const chunks = [];

  // Split on sentence boundaries while preserving the separators
  const parts = text.split(/(\s+)/); // Split on whitespace, preserving it
  const sentences = [];
  let currentSentence = '';

  for (const part of parts) {
    currentSentence += part;

    // If this part ends with sentence punctuation, complete the sentence
    if (/[.!?]$/.test(part.trim())) {
      sentences.push(currentSentence);
      currentSentence = '';
    }
  }

  if (currentSentence.trim()) {
    sentences.push(currentSentence);
  }

  let currentChunk = '';
  let totalIndex = 0;

  for (const sentence of sentences) {
    const potentialChunk = currentChunk + sentence;

    if (potentialChunk.length > chunkSize && currentChunk.length > 0) {
      // Save current chunk and its end position
      chunks.push({
        text: currentChunk,
        endIndex: totalIndex + currentChunk.length,
      });

      // Start new chunk with this sentence
      currentChunk = sentence;
      totalIndex += currentChunk.length;
    } else {
      currentChunk = potentialChunk;
    }
  }

  // Add final chunk if there's remaining text
  if (currentChunk.length > 0) {
    chunks.push({
      text: currentChunk,
      endIndex: totalIndex + currentChunk.length,
    });
  }

  return chunks;
}

/**
 * Remove content from the end of text that matches specified criteria.
 *
 * @param {string} text - The text to truncate
 * @param {string} instructions - Description of content to truncate
 * @param {object} config - Configuration options
 * @param {number} config.threshold - Score threshold above which to remove (default: 6)
 * @param {number} config.chunkSize - Target characters per chunk (default: 1000)
 * @returns {number} Character index where to truncate
 */
export default async function truncate(text, instructions, config = {}) {
  config = withOperation('truncate', config);
  const { chunkSize, aggression: threshold } = await resolveAll(config, {
    chunkSize: 1000,
    aggression: mapped(mapAggression),
  });

  // Create chunks with tracked end positions
  const chunks = createChunks(text, chunkSize);

  // Reverse chunks to process from end to beginning
  const reversedChunks = [...chunks].reverse();
  const textsToScore = reversedChunks.map((chunk) => chunk.text);

  // Score chunks in reverse order - score how much content should be KEPT
  const scoringInstructions = `${asXML(instructions, { tag: 'removal_criteria' })}
  
NOTE: These text blocks are in REVERSE order (from end to beginning of document).
Score how important THE ENTIRE TEXT BLOCK is to KEEP in the document (0 = should be removed, 10 = must keep).
Each item in the list is ONE complete text block - evaluate it as a whole unit.
Consider the removal criteria above when scoring.`;

  const scores = await score(textsToScore, scoringInstructions, {
    ...config,
    // Don't use stopOnThreshold - we need all scores to find high ones
  });

  // Find the first chunk (from the end) that should be removed (score < threshold)
  const removeChunkIndex = scores.findIndex((score) => score < threshold);

  if (removeChunkIndex >= 0) {
    const originalIndex = chunks.length - 1 - removeChunkIndex;

    // Truncate at the start of the chunk that should be removed
    if (originalIndex > 0) {
      return chunks[originalIndex - 1].endIndex;
    } else {
      // If the very first chunk should be removed, truncate at beginning
      return 0;
    }
  }

  // If no content should be removed, don't truncate
  return text.length;
}
