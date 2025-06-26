import nlp from 'compromise';

/**
 * Find where a sentence ends in the original text
 * @param {string} fullText - The complete text
 * @param {string} sentence - The sentence to find
 * @param {number} fromIndex - Start searching from this index
 * @returns {number} - End index of sentence in fullText
 */
function findSentenceEnd(fullText, sentence, fromIndex = 0) {
  // Start with last 5 chars of sentence, expand until unique
  let searchLen = Math.min(5, sentence.length);

  while (searchLen <= sentence.length) {
    const searchText = sentence.slice(-searchLen);
    const firstMatch = fullText.indexOf(searchText, fromIndex);
    const secondMatch = fullText.indexOf(searchText, firstMatch + 1);

    // If unique match found, return end position
    if (firstMatch !== -1 && secondMatch === -1) {
      return firstMatch + searchText.length;
    }

    searchLen += 5;
  }

  // Fallback: find exact sentence
  const exactMatch = fullText.indexOf(sentence, fromIndex);
  return exactMatch !== -1 ? exactMatch + sentence.length : -1;
}

/**
 * Chunk text at sentence boundaries
 * @param {string} text - Text to chunk
 * @param {number} maxLen - Max chunk length
 * @returns {string[]} - Array of chunks
 */
export default function chunkSentences(text, maxLen) {
  if (!text || text.length <= maxLen) {
    return text ? [text] : [];
  }

  const sentences = nlp(text).sentences().out('array');

  // If no sentences detected OR only 1 sentence longer than maxLen, use character chunking
  if (sentences.length === 0 || (sentences.length === 1 && sentences[0].length > maxLen)) {
    const chunks = [];
    let start = 0;

    while (start < text.length) {
      let end = start + maxLen;

      // If we're not at the end of the text, try to break at a word boundary
      if (end < text.length) {
        // Look backwards from the end position to find a space
        while (end > start && text[end] !== ' ') {
          end--;
        }

        // If we couldn't find a space, just use the original end position
        if (end === start) {
          end = start + maxLen;
        }
      }

      chunks.push(text.slice(start, end));
      start = end;
    }

    return chunks;
  }

  const chunks = [];
  let chunkStart = 0;
  let chunkLen = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];

    if (chunkLen > 0 && chunkLen + sentence.length > maxLen) {
      // End current chunk at previous sentence
      const endIndex = findSentenceEnd(text, sentences[i - 1], chunkStart);
      if (endIndex > chunkStart) {
        chunks.push(text.slice(chunkStart, endIndex));
        chunkStart = endIndex;
      }
      chunkLen = sentence.length;
    } else {
      chunkLen += sentence.length;
    }
  }

  // Add final chunk
  if (chunkStart < text.length) {
    chunks.push(text.slice(chunkStart));
  }

  return chunks;
}
