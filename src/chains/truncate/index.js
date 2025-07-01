import score from '../score/index.js';
import { asXML } from '../../prompts/wrap-variable.js';

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
  
  // Add any remaining text as final sentence
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
        endIndex: totalIndex + currentChunk.length
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
      endIndex: totalIndex + currentChunk.length
    });
  }
  
  return chunks;
}

/**
 * Find the best truncation point in text based on instructions.
 * 
 * Uses the score chain to evaluate text chunks and returns
 * the character index of the best truncation point.
 *
 * @param {string} text - The text to truncate
 * @param {string} instructions - Instructions for evaluating truncation points
 * @param {object} config - Configuration options passed to score chain
 * @returns {number} Character index where to truncate
 */
export default async function truncate(text, instructions, config = {}) {
  const chunkSize = config.chunkSize ?? 1000;
  
  // Create chunks with tracked end positions
  const chunks = createChunks(text, chunkSize);
  
  // Extract just the text for scoring
  const textsToScore = chunks.map(chunk => chunk.text);
  
  // Score each chunk using asXML for clear instruction formatting
  const scoringInstructions = `${asXML(instructions, { tag: 'instructions' })}
  
Score how well each text chunk meets the truncation criteria. Return a score from 0 to 10.`;
  
  const { items: scoredItems } = await score(textsToScore, scoringInstructions, config);
  
  // Find the highest scoring chunk
  const bestIndex = scoredItems.reduce((bestIdx, item, idx) => 
    item.score > scoredItems[bestIdx].score ? idx : bestIdx
  , 0);
  
  // Return the end index of the best chunk
  return chunks[bestIndex].endIndex;
}