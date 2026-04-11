import collectTerms from '../collect-terms/index.js';
import score from '../score/index.js';
import map from '../map/index.js';
import createProgressEmitter, { scopePhase } from '../../lib/progress/index.js';
import { DomainEvent, Outcome } from '../../lib/progress/constants.js';
import TextSimilarity from '../../lib/text-similarity/index.js';
import { debug } from '../../lib/debug/index.js';
import { nameStep, getOptions, withPolicy } from '../../lib/context/option.js';
import { asXML } from '../../prompts/wrap-variable.js';

const name = 'document-shrink';

// Token cost estimates
const TOKENS_PER_EXPANSION = 200;
const TOKENS_PER_CHUNK_SCORE = 80;
const TOKENS_PER_CHUNK_COMPRESS = 150;
const DEFAULT_COMPRESSION_RATIO = 0.3;
const DEFAULT_LLM_WEIGHT = 0.7;
const DEFAULT_SCORING_TOKEN_RATIO = 0.6;

// ===== Option Mappers =====

/**
 * Map compression option to a ratio. Accepts 'low'|'high' or a raw number.
 * @param {string|number|undefined} value
 * @returns {number} Compression ratio (lower = more aggressive)
 */
export const mapCompression = (value) => {
  if (value === undefined) return DEFAULT_COMPRESSION_RATIO;
  if (typeof value === 'number') return value;
  return (
    { low: 0.45, med: DEFAULT_COMPRESSION_RATIO, high: 0.15 }[value] ?? DEFAULT_COMPRESSION_RATIO
  );
};

/**
 * Map ranking option to an LLM weight. Accepts 'low'|'high' or a raw number.
 * @param {string|number|undefined} value
 * @returns {number} LLM weight for edge-chunk scoring (higher = more LLM influence)
 */
export const mapRanking = (value) => {
  if (value === undefined) return DEFAULT_LLM_WEIGHT;
  if (typeof value === 'number') return value;
  return { low: 0.3, med: DEFAULT_LLM_WEIGHT, high: 0.9 }[value] ?? DEFAULT_LLM_WEIGHT;
};

const DEFAULT_THOROUGHNESS = {
  queryExpansion: true,
  llmScoring: true,
  llmCompression: true,
  scoringTokenRatio: DEFAULT_SCORING_TOKEN_RATIO,
};

const THOROUGHNESS_LEVELS = {
  low: {
    queryExpansion: false,
    llmScoring: false,
    llmCompression: false,
    scoringTokenRatio: DEFAULT_SCORING_TOKEN_RATIO,
  },
  med: DEFAULT_THOROUGHNESS,
  high: {
    queryExpansion: true,
    llmScoring: true,
    llmCompression: true,
    scoringTokenRatio: 0.4,
  },
};

/**
 * Map thoroughness option to a coordinated posture for all internal phases.
 * Accepts 'low'|'high' or a raw config object.
 * low: pure TF-IDF selection, no LLM calls (fast/cheap).
 * high: all phases active, more token budget for compression (thorough/expensive).
 * @param {string|Object|undefined} value
 * @returns {{ queryExpansion: boolean, llmScoring: boolean, llmCompression: boolean, scoringTokenRatio: number }}
 */
export const mapThoroughness = (value) => {
  if (value === undefined) return DEFAULT_THOROUGHNESS;
  if (typeof value === 'object') return value;
  return THOROUGHNESS_LEVELS[value] ?? DEFAULT_THOROUGHNESS;
};
const LLM_CHUNK_BATCH_SIZE = 20;
const MAX_ADJACENCY_DISTANCE = 3;
const MIN_COMPRESSED_TEXT_LENGTH = 20;

// Adaptive thresholds
const MIN_REDUCTION_RATIO = 0.1;
const MIN_DOC_LENGTH = 2000;
const MAX_TOKEN_ALLOCATION_RATIO = 0.8;
const LOW_REDUCTION_THRESHOLD = 0.2;
const LOW_REDUCTION_SPACE_RESERVE = 0.5;
const HIGH_REDUCTION_SPACE_RESERVE = 0.3;

// Trim text to last complete sentence to avoid mid-sentence cutoffs.
// Returns original text if no sentence boundary found or text already ends cleanly.
function trimToLastSentence(text) {
  const trimmed = text.trim();
  if (/[.!?]["')\]]*\s*$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/^([\s\S]*[.!?]["')\]]?)\s/);
  return match && match[1].length >= MIN_COMPRESSED_TEXT_LENGTH ? match[1] : trimmed;
}

const DEFAULT_OPTIONS = {
  targetSize: 4000,
  chunkSize: 500,
  tokenBudget: 1000,
  gapFillerBudgetRatio: 0, // Optional: 0-1, portion of target size for gap filling
};

// Pure function: Calculate reduction ratio
function calculateReductionRatio(targetSize, documentSize) {
  if (documentSize === 0) return 1;
  return Math.min(1, Math.max(0, targetSize / documentSize));
}

// Pure function: Calculate adaptive chunk size
function calculateAdaptiveChunkSize(baseChunkSize, reductionRatio, docLength) {
  if (reductionRatio < MIN_REDUCTION_RATIO) {
    // Heavy reduction: larger chunks for better context
    return Math.min(baseChunkSize * 2, 1000);
  } else if (docLength < MIN_DOC_LENGTH) {
    // Small document: smaller chunks for granularity
    return Math.max(baseChunkSize / 2, 200);
  }
  return baseChunkSize;
}

// Pure function: Calculate token allocation ratios
function calculateTokenAllocation(
  reductionRatio,
  remainingTokens,
  scoringTokenRatio = DEFAULT_SCORING_TOKEN_RATIO
) {
  // More aggressive reduction = more LLM usage for smart selection
  const llmTokenRatio = Math.min(MAX_TOKEN_ALLOCATION_RATIO, 1 - reductionRatio);
  const llmTokens = Math.floor(remainingTokens * llmTokenRatio);

  return {
    scoringTokens: Math.floor(llmTokens * scoringTokenRatio),
    compressionTokens: Math.floor(llmTokens * (1 - scoringTokenRatio)),
  };
}

// Pure function: Calculate adaptive space allocation based on document characteristics
function calculateSpaceAllocation(
  chunks,
  targetSize,
  tokenBudget,
  documentSize,
  scoringTokenRatio = DEFAULT_SCORING_TOKEN_RATIO
) {
  const reductionRatio = calculateReductionRatio(targetSize, documentSize);
  const totalChunks = chunks.length;
  const avgChunkSize = Math.floor(documentSize / totalChunks);

  // Estimate token usage
  const expansionTokens = Math.min(TOKENS_PER_EXPANSION, tokenBudget);
  const remainingTokens = tokenBudget - expansionTokens;

  // Calculate token allocation
  const { scoringTokens, compressionTokens } = calculateTokenAllocation(
    reductionRatio,
    remainingTokens,
    scoringTokenRatio
  );

  const chunksWeCanScore = Math.max(1, Math.floor(scoringTokens / TOKENS_PER_CHUNK_SCORE));
  const chunksWeCanCompress = Math.max(
    1,
    Math.floor(compressionTokens / TOKENS_PER_CHUNK_COMPRESS)
  );

  // Calculate space allocation dynamically
  // If we need heavy reduction, reserve more space for compressed chunks
  const compressionPotential = chunksWeCanCompress * avgChunkSize * (1 - DEFAULT_COMPRESSION_RATIO);
  // More reservation for aggressive reduction
  const maxReservedRatio =
    reductionRatio < LOW_REDUCTION_THRESHOLD
      ? LOW_REDUCTION_SPACE_RESERVE
      : HIGH_REDUCTION_SPACE_RESERVE;
  const reservedSpace = Math.min(targetSize * maxReservedRatio, compressionPotential);

  return {
    tfIdfBudget: targetSize - reservedSpace,
    reservedSpace,
    chunksWeCanScore,
    chunksWeCanCompress,
    reductionRatio,
    avgChunkSize,
  };
}

// Pure function: Create chunks adaptively
function createChunks(document, baseChunkSize, targetSize) {
  const docLength = document.length;
  const reductionRatio = calculateReductionRatio(targetSize, docLength);
  const chunkSize = calculateAdaptiveChunkSize(baseChunkSize, reductionRatio, docLength);

  const chunks = [];
  for (let i = 0; i < docLength; i += chunkSize) {
    chunks.push({
      text: document.slice(i, i + chunkSize),
      index: chunks.length,
      start: i,
      size: Math.min(chunkSize, docLength - i),
    });
  }
  return chunks;
}

// Pure function: Minimal query expansion
async function expandQuery(query, tokenBudget, options = {}) {
  if (tokenBudget < TOKENS_PER_EXPANSION) {
    return { expansions: [query], tokensUsed: 0 };
  }

  try {
    const terms = await collectTerms(query, {
      ...options,
      topN: 5,
      chunkLen: 500,
      onProgress: scopePhase(options.onProgress, 'collect-terms:query-expansion'),
    });

    // Include original query and the extracted terms
    const expansions = [query, ...terms];
    return {
      expansions,
      tokensUsed: TOKENS_PER_EXPANSION,
    };
  } catch (error) {
    debug(`expandQuery failed, using original query: ${error.message}`);
    return { expansions: [query], tokensUsed: 0 };
  }
}

// Pure function: Score chunks with TF-IDF
function scoreChunksWithTfIdf(chunks, expansions) {
  // Create a TextSimilarity instance
  const similarity = new TextSimilarity();

  // Add all expansions to the similarity engine
  expansions.forEach((text, i) => {
    similarity.addChunk(text, `exp-${i}`);
  });

  return chunks.map((chunk) => {
    // Find similarity scores for this chunk against all expansions
    const matches = similarity.findMatches(chunk.text, { threshold: 0 });

    // Average the scores from all expansion matches
    const tfIdfScore =
      matches.length > 0
        ? matches.reduce((sum, match) => sum + match.score, 0) / matches.length
        : 0;

    return { ...chunk, tfIdfScore };
  });
}

// Pure function: Select chunks adaptively based on score distribution
function selectChunksByTfIdf(scoredChunks, tfIdfBudget) {
  const sorted = scoredChunks.toSorted((a, b) => b.tfIdfScore - a.tfIdfScore);

  let sizeUsed = 0;
  const selected = [];

  // Always try to fill the TF-IDF budget with best-scoring chunks
  for (const chunk of sorted) {
    if (sizeUsed + chunk.size <= tfIdfBudget) {
      selected.push(chunk);
      sizeUsed += chunk.size;
    }
  }

  // If we couldn't select anything due to size constraints, take at least the best chunk
  if (selected.length === 0 && sorted.length > 0) {
    selected.push(sorted[0]);
    sizeUsed = sorted[0].size;
  }

  // Update candidates list
  const selectedIndices = new Set(selected.map((c) => c.index));
  const candidates = scoredChunks.filter((c) => !selectedIndices.has(c.index));

  return { selected, candidates, sizeUsed };
}

// Pure function: Score edge chunks with LLM
async function scoreEdgeChunks(candidates, query, maxChunks, options = {}) {
  const { llmWeight = 0.7 } = options;
  if (candidates.length === 0 || maxChunks === 0) {
    return { scored: [], tokensUsed: 0 };
  }

  // Take chunks near the boundary
  const toScore = candidates.slice(0, maxChunks);

  // Extract key sentences from chunks for scoring
  const cleanedChunks = toScore.map((chunk) => {
    // Extract the first meaningful sentence or paragraph
    const text = chunk.text
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Find first complete sentence (up to 300 chars for better context)
    const firstSentence = text.match(/^[^.!?]{1,300}[.!?]/)?.[0] || text.slice(0, 300);

    return firstSentence.trim();
  });

  const scores = await score(
    cleanedChunks,
    `relevance to query: ${asXML(query, { tag: 'query' })} (0=unrelated, 5=partially related, 10=directly answers)`,
    {
      ...options,
      batchSize: LLM_CHUNK_BATCH_SIZE,
      onProgress: scopePhase(options.onProgress, 'score:edge-ranking'),
    }
  );

  const scored = toScore.map((chunk, i) => ({
    ...chunk,
    llmScore: scores[i] / 10,
    finalScore: chunk.tfIdfScore * (1 - llmWeight) + (scores[i] / 10) * llmWeight,
  }));

  return {
    scored: scored.toSorted((a, b) => b.finalScore - a.finalScore),
    tokensUsed: toScore.length * TOKENS_PER_CHUNK_SCORE,
  };
}

// Pure function: Compress high-value chunks adaptively
async function compressHighValueChunks(
  chunks,
  query,
  maxChunks,
  availableSpace,
  allocation,
  options = {}
) {
  const { compressionRatio = DEFAULT_COMPRESSION_RATIO } = options;
  // Adaptive minimum size based on average chunk size
  const minCompressSize = Math.min(allocation.avgChunkSize * 0.8, 400);

  // Select chunks worth compressing based on size and score
  const compressible = chunks
    .filter((c) => c.size >= minCompressSize)
    .toSorted((a, b) => {
      // Prioritize larger chunks with good scores
      const aValue = (a.tfIdfScore || 0) * Math.log(a.size);
      const bValue = (b.tfIdfScore || 0) * Math.log(b.size);
      return bValue - aValue;
    })
    .slice(0, maxChunks);

  if (compressible.length === 0) {
    return { compressed: [], tokensUsed: 0 };
  }

  // Clean chunks before compression
  const cleanedTexts = compressible.map((c) => c.text.replace(/\s+/g, ' ').trim());

  // Adaptive compression target based on reduction needs
  const compressionTarget =
    allocation.reductionRatio < 0.2
      ? Math.floor(compressionRatio * 100)
      : Math.floor(compressionRatio * 150); // Less aggressive compression if not much reduction needed

  const texts = await map(
    cleanedTexts,
    `Extract key parts answering: ${asXML(query, { tag: 'query' })}. Preserve important details. Target ${compressionTarget}% of original.`,
    {
      ...options,
      batchSize: 10,
      onProgress: scopePhase(options.onProgress, 'map:compression'),
    }
  );

  const compressed = [];
  let spaceUsed = 0;

  texts.forEach((text, i) => {
    const cleaned = text ? trimToLastSentence(text) : '';
    if (
      cleaned.length >= MIN_COMPRESSED_TEXT_LENGTH &&
      cleaned.length <= availableSpace - spaceUsed
    ) {
      compressed.push({
        ...compressible[i],
        originalText: compressible[i].text,
        text: cleaned,
        compressed: true,
        size: cleaned.length,
        compressionRatio: cleaned.length / compressible[i].size,
      });
      spaceUsed += cleaned.length;
    }
  });

  return {
    compressed,
    tokensUsed: compressible.length * TOKENS_PER_CHUNK_COMPRESS,
  };
}

// Pure function: Add chunks that fit within size limit
function addChunksThatFit(existingChunks, currentSize, newChunks, sizeLimit) {
  const finalChunks = [...existingChunks];
  let totalSize = currentSize;

  for (const chunk of newChunks) {
    if (totalSize + chunk.size <= sizeLimit) {
      finalChunks.push(chunk);
      totalSize += chunk.size;
    }
  }

  return { chunks: finalChunks, size: totalSize };
}

// Pure function: Get unselected chunks sorted by score
function getUnselectedChunks(allChunks, selectedChunks) {
  const selectedIndices = new Set(selectedChunks.map((c) => c.index));
  return allChunks
    .filter((c) => !selectedIndices.has(c.index))
    .toSorted((a, b) => b.tfIdfScore - a.tfIdfScore);
}

// Pure function: Group consecutive chunks together
function groupConsecutiveChunks(chunks) {
  if (chunks.length === 0) return [];

  const sorted = chunks.toSorted((a, b) => a.index - b.index);
  const groups = [];
  let currentGroup = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prevChunk = sorted[i - 1];
    const currentChunk = sorted[i];

    // Check if current chunk is consecutive to previous
    if (currentChunk.index === prevChunk.index + 1) {
      currentGroup.push(currentChunk);
    } else {
      // Start a new group
      groups.push(currentGroup);
      currentGroup = [currentChunk];
    }
  }

  // Don't forget the last group
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

// Pure function: Assemble final content from chunk groups
function assembleContent(chunkGroups) {
  if (chunkGroups.length === 0) return '';

  // Single group - no separators needed
  if (chunkGroups.length === 1) {
    return chunkGroups[0].map((chunk) => chunk.text).join('');
  }

  // Multiple groups - add clear separators between non-consecutive sections
  return chunkGroups.map((group) => group.map((chunk) => chunk.text).join('')).join('\n\n---\n\n');
}

// Pure function: Build adjacency scores for gap filling
function buildAdjacencyScores(allChunks, selectedIndices, decayFactor = 0.5) {
  const scores = new Array(allChunks.length).fill(0);
  const selectedSet = new Set(selectedIndices);

  // For each selected chunk, propagate scores to neighbors
  selectedIndices.forEach((idx) => {
    const baseScore = allChunks[idx].tfIdfScore || 0;

    // Propagate left
    for (let dist = 1; dist <= MAX_ADJACENCY_DISTANCE && idx - dist >= 0; dist++) {
      if (!selectedSet.has(idx - dist)) {
        scores[idx - dist] = Math.max(scores[idx - dist], baseScore * Math.pow(decayFactor, dist));
      }
    }

    // Propagate right
    for (let dist = 1; dist <= MAX_ADJACENCY_DISTANCE && idx + dist < allChunks.length; dist++) {
      if (!selectedSet.has(idx + dist)) {
        scores[idx + dist] = Math.max(scores[idx + dist], baseScore * Math.pow(decayFactor, dist));
      }
    }
  });

  return scores;
}

// Pure function: Select gap filler chunks efficiently
function selectGapFillers(allChunks, selectedChunks, gapFillerBudget) {
  if (gapFillerBudget <= 0) return [];

  const selectedIndices = selectedChunks.map((c) => c.index);
  const selectedSet = new Set(selectedIndices);

  // Build adjacency scores
  const adjacencyScores = buildAdjacencyScores(allChunks, selectedIndices);

  // Create candidates with scores
  const candidates = allChunks
    .map((chunk, idx) => ({
      ...chunk,
      adjacencyScore: adjacencyScores[idx],
      combinedScore: (chunk.tfIdfScore || 0) + adjacencyScores[idx],
    }))
    .filter((_, idx) => !selectedSet.has(idx) && adjacencyScores[idx] > 0)
    .toSorted((a, b) => b.combinedScore - a.combinedScore);

  // Select chunks within budget
  const gapFillers = [];
  let budgetUsed = 0;

  for (const chunk of candidates) {
    if (budgetUsed + chunk.size <= gapFillerBudget) {
      gapFillers.push(chunk);
      budgetUsed += chunk.size;
    }
  }

  return gapFillers;
}

// Main function with proper budget planning
export default async function documentShrink(document, query, config = {}) {
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();
  const {
    targetSize,
    tokenBudget: tokenBudgetInit,
    gapFillerBudgetRatio,
    compression: compressionRatio,
    ranking: llmWeight,
    queryExpansion,
    llmScoring,
    llmCompression,
    scoringTokenRatio,
  } = await getOptions(runConfig, {
    targetSize: DEFAULT_OPTIONS.targetSize,
    tokenBudget: DEFAULT_OPTIONS.tokenBudget,
    gapFillerBudgetRatio: DEFAULT_OPTIONS.gapFillerBudgetRatio,
    compression: withPolicy(mapCompression),
    ranking: withPolicy(mapRanking),
    thoroughness: withPolicy(mapThoroughness, [
      'queryExpansion',
      'llmScoring',
      'llmCompression',
      'scoringTokenRatio',
    ]),
  });
  const merged = {
    ...DEFAULT_OPTIONS,
    ...runConfig,
    targetSize,
    tokenBudget: tokenBudgetInit,
    gapFillerBudgetRatio,
  };

  // Handle edge cases early
  if (!document || document.length === 0) {
    const emptyResult = {
      content: '',
      metadata: {
        originalSize: 0,
        finalSize: 0,
        reductionRatio: '0.00',
        allocation: {},
        chunks: { total: 0, tfIdfSelected: 0, llmSelected: 0, compressed: 0, gapFillers: 0 },
        tokens: { budget: 0, used: 0, breakdown: {} },
      },
    };

    emitter.complete({ outcome: Outcome.success });

    return emptyResult;
  }

  try {
    // Validate and fix merged values
    if (merged.targetSize <= 0) merged.targetSize = DEFAULT_OPTIONS.targetSize;
    if (merged.chunkSize <= 0) merged.chunkSize = DEFAULT_OPTIONS.chunkSize;
    if (merged.tokenBudget <= 0) merged.tokenBudget = DEFAULT_OPTIONS.tokenBudget;

    let tokenBudget = merged.tokenBudget;

    // Step 1: Create chunks
    emitter.emit({ event: DomainEvent.phase, phase: 'chunking' });
    const chunks = createChunks(document, merged.chunkSize, merged.targetSize);

    // Step 2: Calculate space allocation
    const allocation = calculateSpaceAllocation(
      chunks,
      merged.targetSize,
      tokenBudget,
      document.length,
      scoringTokenRatio
    );
    // When LLM phases are off, give all space to TF-IDF selection
    if (!llmScoring && !llmCompression) {
      allocation.tfIdfBudget = merged.targetSize;
      allocation.reservedSpace = 0;
    }

    // Step 3: Expand query (gated by thoroughness)
    emitter.emit({ event: DomainEvent.phase, phase: 'query-expansion' });
    const subOptions = runConfig;
    const { expansions, tokensUsed: expansionTokens } = queryExpansion
      ? await expandQuery(query, tokenBudget, subOptions)
      : { expansions: [query], tokensUsed: 0 };
    tokenBudget -= expansionTokens;

    // Step 4: Score with TF-IDF
    emitter.emit({ event: DomainEvent.phase, phase: 'tfidf-scoring' });
    const scoredChunks = scoreChunksWithTfIdf(chunks, expansions);

    // Step 5: Select chunks for TF-IDF budget (leaving room for LLM chunks)
    const { selected, candidates, sizeUsed } = selectChunksByTfIdf(
      scoredChunks,
      allocation.tfIdfBudget
    );

    // Step 6: Use LLM to find high-value edge chunks (gated by thoroughness)
    emitter.emit({ event: DomainEvent.phase, phase: 'edge-scoring' });
    const { scored, tokensUsed: scoreTokens } = llmScoring
      ? await scoreEdgeChunks(candidates, query, allocation.chunksWeCanScore, {
          ...subOptions,
          llmWeight,
        })
      : { scored: [], tokensUsed: 0 };
    tokenBudget -= scoreTokens;

    // Step 7: Add scored chunks that fit
    let result = addChunksThatFit(selected, sizeUsed, scored, merged.targetSize);

    // Step 8: Use remaining tokens to compress chunks for even more content
    emitter.emit({ event: DomainEvent.phase, phase: 'compression' });
    const remainingSpace = merged.targetSize - result.size;
    let compressTokens = 0;
    const minSpaceForCompression = Math.min(allocation.avgChunkSize * 0.5, 200);

    if (
      llmCompression &&
      remainingSpace > minSpaceForCompression &&
      allocation.chunksWeCanCompress > 0
    ) {
      const compressionCandidates = getUnselectedChunks(scoredChunks, result.chunks);

      const { compressed, tokensUsed } = await compressHighValueChunks(
        compressionCandidates,
        query,
        allocation.chunksWeCanCompress,
        remainingSpace,
        allocation,
        { ...subOptions, compressionRatio }
      );
      compressTokens = tokensUsed;
      tokenBudget -= tokensUsed;

      result = addChunksThatFit(result.chunks, result.size, compressed, merged.targetSize);
    }

    // Step 9: Apply gap filling if configured
    emitter.emit({ event: DomainEvent.phase, phase: 'assembly' });
    let finalChunks = result.chunks;
    let gapFillerCount = 0;

    if (merged.gapFillerBudgetRatio > 0) {
      const gapFillerBudget = Math.floor(merged.targetSize * merged.gapFillerBudgetRatio);
      const remainingSpace = merged.targetSize - result.size;
      const actualGapBudget = Math.min(gapFillerBudget, remainingSpace);

      if (actualGapBudget > 0) {
        const gapFillers = selectGapFillers(scoredChunks, finalChunks, actualGapBudget);
        if (gapFillers.length > 0) {
          finalChunks = [...finalChunks, ...gapFillers];
          gapFillerCount = gapFillers.length;
        }
      }
    }

    // Final assembly - group consecutive chunks and join appropriately
    const chunkGroups = groupConsecutiveChunks(finalChunks);
    let content = assembleContent(chunkGroups);

    // When content vastly exceeds the target (e.g. forced minimum chunk is
    // larger than the budget), trim to the last complete sentence.
    // Only applies when output is >3x target — normal slight overflows are fine.
    if (content.length > merged.targetSize * 3) {
      content = trimToLastSentence(content.slice(0, merged.targetSize * 2));
    }

    const finalResult = {
      content,
      metadata: {
        originalSize: document.length,
        finalSize: content.length,
        reductionRatio: (1 - content.length / document.length).toFixed(2),
        allocation: {
          tfIdfBudget: allocation.tfIdfBudget,
          reservedForLLM: allocation.reservedSpace,
          actualLLMSpace: finalChunks.filter((c) => c.llmScore).reduce((sum, c) => sum + c.size, 0),
        },
        chunks: {
          total: chunks.length,
          tfIdfSelected: selected.length,
          llmSelected: finalChunks.filter((c) => c.llmScore && !c.compressed).length,
          compressed: finalChunks.filter((c) => c.compressed).length,
          gapFillers: gapFillerCount,
        },
        tokens: {
          budget: merged.tokenBudget,
          used: merged.tokenBudget - tokenBudget,
          breakdown: {
            expansion: expansionTokens,
            scoring: scoreTokens || 0,
            compression: compressTokens || 0,
          },
        },
      },
    };

    emitter.complete({ outcome: Outcome.success });

    return finalResult;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}
