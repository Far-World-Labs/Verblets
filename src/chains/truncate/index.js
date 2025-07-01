import score from '../score/index.js';
import { asXML } from '../../prompts/wrap-variable.js';

/**
 * Find the best truncation point in text based on instructions.
 * 
 * Uses the score chain to evaluate potential cut points and returns
 * the character index of the best truncation point.
 *
 * @param {string} text - The text to truncate
 * @param {string} instructions - Instructions for evaluating truncation points
 * @param {object} config - Configuration options passed to score chain
 * @returns {number} Character index where to truncate
 */
export default async function truncate(text, instructions, config = {}) {
  const chunkSize = config.chunkSize || 1000;
  
  // Create chunks of roughly chunkSize characters, breaking at sentence boundaries
  const chunks = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  
  let currentChunk = '';
  let currentIndex = 0;
  
  for (const sentence of sentences) {
    const potentialChunk = currentChunk + (currentChunk ? ' ' : '') + sentence;
    
    if (potentialChunk.length > chunkSize && currentChunk.length > 0) {
      // Save current chunk and its end position
      chunks.push({
        text: currentChunk,
        endIndex: currentIndex + currentChunk.length
      });
      
      // Start new chunk with this sentence
      currentChunk = sentence;
      currentIndex += currentChunk.length + 1; // +1 for space
    } else {
      currentChunk = potentialChunk;
    }
  }
  
  // Add final chunk if there's remaining text
  if (currentChunk.length > 0) {
    chunks.push({
      text: currentChunk,
      endIndex: currentIndex + currentChunk.length
    });
  }
  
  // Extract just the text for scoring
  const textsToScore = chunks.map(chunk => chunk.text);
  
  // Score each chunk using asXML for clear instruction formatting
  const scoringInstructions = `${asXML(instructions, { tag: 'instructions' })}
  
Score how well each text chunk meets the truncation criteria. Return a score from 0.0 to 1.0.`;
  
  const { items: scoredItems } = await score(textsToScore, scoringInstructions, config);
  
  // Find the highest scoring chunk
  const bestIndex = scoredItems.reduce((bestIdx, item, idx) => 
    item.score > scoredItems[bestIdx].score ? idx : bestIdx
  , 0);
  
  // Return the end index of the best chunk
  return chunks[bestIndex].endIndex;
}