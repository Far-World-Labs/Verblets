import score from '../score/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import createProgressEmitter, { scopePhase } from '../../lib/progress/index.js';
import { Outcome } from '../../lib/progress/constants.js';
import { nameStep, getOptions, withPolicy } from '../../lib/context/option.js';
import { resolveArgs, resolveTexts } from '../../lib/instruction/index.js';

const name = 'truncate';

// ===== Option Mappers =====

const DEFAULT_THRESHOLD = 6;

/**
 * Map strictness option to a score threshold for content removal.
 * low: lower threshold (4) — removes anything the LLM isn't confident should stay. Lenient about what to cut.
 * high: higher threshold (7) — only removes content the LLM strongly considers removable. Strict about keeping content.
 * @param {string|number|undefined} value
 * @returns {number} Score threshold (0-10) below which chunks are removed
 */
export const mapStrictness = (value) => {
  if (value === undefined) return DEFAULT_THRESHOLD;
  if (typeof value === 'number') return value;
  return { low: 4, med: DEFAULT_THRESHOLD, high: 7 }[value] ?? DEFAULT_THRESHOLD;
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
export default async function truncate(text, instructions, config) {
  if (typeof text !== 'string') {
    throw new Error(
      `truncate: text must be a string (got ${text === null ? 'null' : typeof text})`
    );
  }
  [instructions, config] = resolveArgs(instructions, config);
  const { text: instructionText, context } = resolveTexts(instructions, []);
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();
  const { chunkSize, strictness: threshold } = await getOptions(runConfig, {
    chunkSize: 1000,
    strictness: withPolicy(mapStrictness),
  });

  try {
    // Create chunks with tracked end positions
    const chunks = createChunks(text, chunkSize);

    // Reverse chunks to process from end to beginning
    const reversedChunks = [...chunks].reverse();
    const textsToScore = reversedChunks.map((chunk) => chunk.text);

    // Score chunks in reverse order - score how much content should be KEPT
    const contextBlock = context ? `\n\n${context}` : '';
    const scoringInstructions = `${asXML(instructionText, { tag: 'removal_criteria' })}

NOTE: These text blocks are in REVERSE order (from end to beginning of document).
Score how important THE ENTIRE TEXT BLOCK is to KEEP in the document (0 = should be removed, 10 = must keep).
Each item in the list is ONE complete text block - evaluate it as a whole unit.
Consider the removal criteria above when scoring.${contextBlock}`;

    const rawScores = await score(textsToScore, scoringInstructions, {
      ...runConfig,
      onProgress: scopePhase(runConfig.onProgress, 'score:relevance'),
      // Don't use stopOnThreshold - we need all scores to find high ones
    });

    // Boundary policy: missing scores → keep the chunk (treat as max-importance signal).
    // Count failures so the outcome reports partial honestly; throw if every chunk
    // failed since we have no information to make truncation decisions.
    const failedChunks = rawScores.filter((s) => typeof s !== 'number').length;
    if (chunks.length > 0 && failedChunks === chunks.length) {
      throw new Error(
        `truncate: all ${chunks.length} chunk scores failed — no basis for truncation`
      );
    }
    const scores = rawScores.map((s) => (typeof s === 'number' ? s : Infinity));

    // Find the first chunk (from the end) that should be removed (score < threshold)
    const removeChunkIndex = scores.findIndex((s) => s < threshold);

    let result;
    if (removeChunkIndex >= 0) {
      const originalIndex = chunks.length - 1 - removeChunkIndex;

      // Truncate at the start of the chunk that should be removed
      if (originalIndex > 0) {
        result = chunks[originalIndex - 1].endIndex;
      } else {
        // If the very first chunk should be removed, truncate at beginning
        result = 0;
      }
    } else {
      // If no content should be removed, don't truncate
      result = text.length;
    }

    emitter.complete({
      outcome: failedChunks > 0 ? Outcome.partial : Outcome.success,
      totalChunks: chunks.length,
      failedChunks,
    });

    return result;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

truncate.knownTexts = [];
