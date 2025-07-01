import score from '../score/index.js';

/**
 * Intelligently truncate text by scoring potential cut points based on instructions.
 * 
 * Uses the existing score chain to evaluate different truncation points and select
 * the best one according to the provided instructions.
 *
 * @param {string} text - The text to truncate
 * @param {string} instructions - Instructions for how to evaluate truncation points
 * @param {object} config - Configuration options
 * @param {number} config.limit - Maximum length constraint (default: 100)
 * @param {string} config.unit - Unit type: 'characters', 'words', or 'sentences' (default: 'characters')
 * @param {number} config.chunkSize - Batch size for scoring (default: 5)
 * @param {object} config.llm - LLM configuration
 * @returns {object} Truncation result with truncated text and metadata
 */
export default async function truncate(text, instructions = 'Find the best truncation point', config = {}) {
  const {
    limit = 100,
    unit = 'characters',
    chunkSize = 5,
    ...options
  } = config;

  if (!text || typeof text !== 'string') {
    return {
      truncated: text || '',
      cutPoint: 0,
      cutType: 'none',
      preservationScore: text ? 1.0 : 0.0,
    };
  }

  // Calculate current length based on unit type
  const getCurrentLength = (str) => {
    switch (unit) {
      case 'words':
        return str.trim().split(/\s+/).filter(Boolean).length;
      case 'sentences':
        return str.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
      default: // characters
        return str.length;
    }
  };

  const currentLength = getCurrentLength(text);

  // Return full text if already within limit
  if (currentLength <= limit) {
    return {
      truncated: text,
      cutPoint: currentLength,
      cutType: 'full',
      preservationScore: 1.0,
    };
  }

  // Split text into potential cut points
  let chunks;
  if (unit === 'sentences') {
    chunks = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  } else {
    // For characters/words, split by sentences for natural boundaries
    chunks = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  }

  // Create cumulative chunks representing potential truncation points
  const cumulativeChunks = chunks.map((_, i) => 
    chunks.slice(0, i + 1).join(' ')
  );

  // Filter to only consider chunks within or near the limit
  const viableChunks = cumulativeChunks.filter(chunk => {
    const length = getCurrentLength(chunk);
    // Include chunks within limit, plus a few over to give options
    return length <= limit * 1.2;
  });

  if (viableChunks.length === 0) {
    // Fallback: simple truncation
    let fallbackTruncated;
    if (unit === 'words') {
      const words = text.trim().split(/\s+/);
      fallbackTruncated = words.slice(0, limit).join(' ');
    } else if (unit === 'sentences') {
      const sentences = text.split(/[.!?]+/).filter(Boolean);
      fallbackTruncated = sentences.slice(0, limit).join('. ') + '.';
    } else {
      fallbackTruncated = text.substring(0, limit);
    }
    
    return {
      truncated: fallbackTruncated,
      cutPoint: getCurrentLength(fallbackTruncated),
      cutType: 'fallback',
      preservationScore: 0.5,
    };
  }

  // Score each potential cut point
  const scoringInstructions = `${instructions}. Score how well each truncation preserves what's needed while staying within ${limit} ${unit}.`;
  
  try {
    const { items: scoredItems } = await score(viableChunks, scoringInstructions, {
      chunkSize,
      ...options
    });

    // Find the best scoring chunk that's within the limit
    const validCandidates = scoredItems
      .map((item, idx) => ({
        ...item,
        text: viableChunks[idx],
        length: getCurrentLength(viableChunks[idx]),
        index: idx
      }))
      .filter(item => item.length <= limit);

    if (validCandidates.length === 0) {
      // No valid candidates, use the shortest chunk
      const shortest = scoredItems
        .map((item, idx) => ({
          text: viableChunks[idx],
          length: getCurrentLength(viableChunks[idx]),
          score: item.score
        }))
        .reduce((min, current) => current.length < min.length ? current : min);

      return {
        truncated: shortest.text,
        cutPoint: shortest.length,
        cutType: 'shortest',
        preservationScore: shortest.score,
      };
    }

    // Get the highest scoring valid candidate
    const best = validCandidates.reduce((best, current) => 
      current.score > best.score ? current : best
    );

    // Determine cut type based on how we ended
    let cutType = 'scored';
    if (best.text.endsWith('.') || best.text.endsWith('!') || best.text.endsWith('?')) {
      cutType = 'sentence';
    } else if (best.length === limit) {
      cutType = 'exact';
    }

    return {
      truncated: best.text,
      cutPoint: best.length,
      cutType,
      preservationScore: best.score,
    };

  } catch (error) {
    console.warn('LLM scoring failed for truncation, using fallback:', error.message);
    
    // Fallback to simple truncation
    let fallbackTruncated;
    if (unit === 'words') {
      const words = text.trim().split(/\s+/);
      fallbackTruncated = words.slice(0, limit).join(' ');
    } else if (unit === 'sentences') {
      const sentences = text.split(/[.!?]+/).filter(Boolean);
      fallbackTruncated = sentences.slice(0, limit).join('. ') + '.';
    } else {
      fallbackTruncated = text.substring(0, limit);
    }
    
    return {
      truncated: fallbackTruncated,
      cutPoint: getCurrentLength(fallbackTruncated),
      cutType: 'fallback',
      preservationScore: 0.5,
    };
  }
}