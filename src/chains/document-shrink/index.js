import collectTerms from '../collect-terms/index.js';
import score from '../score/index.js';
import map from '../map/index.js';
import TextSimilarity from '../../lib/text-similarity/index.js';

// Token cost estimates
const TOKENS_PER_EXPANSION = 200;
const TOKENS_PER_CHUNK_SCORE = 80;
const TOKENS_PER_CHUNK_COMPRESS = 150;
const COMPRESSION_RATIO = 0.3;
const LLM_CHUNK_BATCH_SIZE = 20;
const MAX_ADJACENCY_DISTANCE = 3;

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
  if (reductionRatio < 0.1) {
    // Heavy reduction: larger chunks for better context
    return Math.min(baseChunkSize * 2, 1000);
  } else if (docLength < 2000) {
    // Small document: smaller chunks for granularity
    return Math.max(baseChunkSize / 2, 200);
  }
  return baseChunkSize;
}

// Pure function: Calculate token allocation ratios
function calculateTokenAllocation(reductionRatio, remainingTokens) {
  // More aggressive reduction = more LLM usage for smart selection
  const llmTokenRatio = Math.min(0.8, 1 - reductionRatio);
  const llmTokens = Math.floor(remainingTokens * llmTokenRatio);

  return {
    scoringTokens: Math.floor(llmTokens * 0.6),
    compressionTokens: Math.floor(llmTokens * 0.4),
  };
}

// Pure function: Calculate adaptive space allocation based on document characteristics
function calculateSpaceAllocation(chunks, targetSize, tokenBudget, documentSize) {
  const reductionRatio = calculateReductionRatio(targetSize, documentSize);
  const totalChunks = chunks.length;
  const avgChunkSize = Math.floor(documentSize / totalChunks);

  // Estimate token usage
  const expansionTokens = Math.min(TOKENS_PER_EXPANSION, tokenBudget);
  const remainingTokens = tokenBudget - expansionTokens;

  // Calculate token allocation
  const { scoringTokens, compressionTokens } = calculateTokenAllocation(
    reductionRatio,
    remainingTokens
  );

  const chunksWeCanScore = Math.max(1, Math.floor(scoringTokens / TOKENS_PER_CHUNK_SCORE));
  const chunksWeCanCompress = Math.max(
    1,
    Math.floor(compressionTokens / TOKENS_PER_CHUNK_COMPRESS)
  );

  // Calculate space allocation dynamically
  // If we need heavy reduction, reserve more space for compressed chunks
  const compressionPotential = chunksWeCanCompress * avgChunkSize * (1 - COMPRESSION_RATIO);
  const maxReservedRatio = reductionRatio < 0.2 ? 0.5 : 0.3; // More reservation for aggressive reduction
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

  // console.log(`[createChunks] Creating chunks of size ${chunkSize} from document of length ${docLength} (reduction ratio: ${reductionRatio.toFixed(2)})`);

  const chunks = [];
  for (let i = 0; i < docLength; i += chunkSize) {
    chunks.push({
      text: document.slice(i, i + chunkSize),
      index: chunks.length,
      start: i,
      size: Math.min(chunkSize, docLength - i),
    });
  }
  // console.log(`[createChunks] Created ${chunks.length} chunks`);
  return chunks;
}

// Pure function: Minimal query expansion
async function expandQuery(query, tokenBudget, llm) {
  // console.log(`[expandQuery] Expanding query: "${query}" with token budget: ${tokenBudget}`);
  if (tokenBudget < TOKENS_PER_EXPANSION) {
    // console.log(`[expandQuery] Insufficient token budget, returning original query only`);
    return { expansions: [query], tokensUsed: 0 };
  }

  // console.log(`[expandQuery] Collecting key terms related to query...`);
  try {
    const terms = await collectTerms(query, {
      topN: 5,
      chunkLen: 500,
      llm,
    });
    // console.log(`[expandQuery] Collected ${terms.length} terms:`, terms);

    // Include original query and the extracted terms
    const expansions = [query, ...terms];
    return {
      expansions,
      tokensUsed: TOKENS_PER_EXPANSION,
    };
  } catch {
    // console.error(`[expandQuery] Error collecting terms:`, error);
    // Fallback to just the query
    return { expansions: [query], tokensUsed: 0 };
  }
}

// Pure function: Score chunks with TF-IDF
function scoreChunksWithTfIdf(chunks, expansions) {
  // console.log(`[scoreChunksWithTfIdf] Scoring ${chunks.length} chunks with ${expansions.length} expansions`);

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

    // if (chunk.index < 3 || tfIdfScore > 0.1) {
    //   console.log(`[scoreChunksWithTfIdf] Chunk ${chunk.index} score: ${tfIdfScore.toFixed(3)}, text: "${chunk.text.slice(0, 50)}..."`);
    // }

    return { ...chunk, tfIdfScore };
  });
}

// Pure function: Select chunks adaptively based on score distribution
function selectChunksByTfIdf(scoredChunks, tfIdfBudget) {
  const sorted = [...scoredChunks].sort((a, b) => b.tfIdfScore - a.tfIdfScore);

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

  // console.log(`[selectChunksByTfIdf] Selected ${selected.length} chunks (${sizeUsed}/${tfIdfBudget} chars) from ${scoredChunks.length} total`);
  // if (selected.length > 0) {
  //   console.log(`[selectChunksByTfIdf] Selected chunk indices:`, selected.map(c => c.index));
  // }

  return { selected, candidates, sizeUsed };
}

// Pure function: Score edge chunks with LLM
async function scoreEdgeChunks(candidates, query, maxChunks, llm, options = {}) {
  // console.log(`[scoreEdgeChunks] Scoring ${candidates.length} candidates, max chunks: ${maxChunks}`);
  if (candidates.length === 0 || maxChunks === 0) {
    // console.log(`[scoreEdgeChunks] No candidates or maxChunks is 0, returning empty`);
    return { scored: [], tokensUsed: 0 };
  }

  // Take chunks near the boundary
  const toScore = candidates.slice(0, maxChunks);
  // console.log(`[scoreEdgeChunks] Scoring ${toScore.length} chunks with LLM`);

  // Extract key sentences from chunks for scoring
  const cleanedChunks = toScore.map((chunk) => {
    // Extract the first meaningful sentence or paragraph
    const text = chunk.text
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Find first complete sentence (up to 300 chars for better context)
    const firstSentence = text.match(/^[^.!?]{1,300}[.!?]/)?.[0] || text.slice(0, 300);

    // console.log(`[scoreEdgeChunks] Extracted for scoring:`, firstSentence.slice(0, 100) + '...');
    return firstSentence.trim();
  });

  // console.log(`[scoreEdgeChunks] Scoring ${cleanedChunks.length} cleaned chunks`);

  const scores = await score(
    cleanedChunks,
    `relevance to query: "${query}" (0=unrelated, 5=partially related, 10=directly answers)`,
    { chunkSize: LLM_CHUNK_BATCH_SIZE, llm, onProgress: options.onProgress }
  );

  // console.log(`[scoreEdgeChunks] Received scores:`, scores);

  const scored = toScore.map((chunk, i) => ({
    ...chunk,
    llmScore: scores[i] / 10,
    finalScore: chunk.tfIdfScore * 0.3 + (scores[i] / 10) * 0.7, // Weight LLM score higher
  }));

  // console.log(`[scoreEdgeChunks] Scored ${scored.length} chunks successfully`);
  return {
    scored: scored.sort((a, b) => b.finalScore - a.finalScore),
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
  llm,
  options = {}
) {
  // Adaptive minimum size based on average chunk size
  const minCompressSize = Math.min(allocation.avgChunkSize * 0.8, 400);

  // Select chunks worth compressing based on size and score
  const compressible = chunks
    .filter((c) => c.size >= minCompressSize)
    .sort((a, b) => {
      // Prioritize larger chunks with good scores
      const aValue = (a.tfIdfScore || 0) * Math.log(a.size);
      const bValue = (b.tfIdfScore || 0) * Math.log(b.size);
      return bValue - aValue;
    })
    .slice(0, maxChunks);

  if (compressible.length === 0) {
    return { compressed: [], tokensUsed: 0 };
  }

  // console.log(`[compressHighValueChunks] Compressing ${compressible.length} chunks, min size: ${minCompressSize}`);

  // Clean chunks before compression
  const cleanedTexts = compressible.map((c) => c.text.replace(/\s+/g, ' ').trim());

  // Adaptive compression target based on reduction needs
  const compressionTarget =
    allocation.reductionRatio < 0.2
      ? Math.floor(COMPRESSION_RATIO * 100)
      : Math.floor(COMPRESSION_RATIO * 150); // Less aggressive compression if not much reduction needed

  const texts = await map(
    cleanedTexts,
    `Extract key parts answering: "${query}". Preserve important details. Target ${compressionTarget}% of original.`,
    { chunkSize: 10, llm, onProgress: options.onProgress }
  );

  const compressed = [];
  let spaceUsed = 0;

  texts.forEach((text, i) => {
    if (text && text.length > 20 && text.length <= availableSpace - spaceUsed) {
      compressed.push({
        ...compressible[i],
        originalText: compressible[i].text,
        text,
        compressed: true,
        size: text.length,
        compressionRatio: text.length / compressible[i].size,
      });
      spaceUsed += text.length;
    }
  });

  // console.log(`[compressHighValueChunks] Compressed ${compressed.length} chunks, saved ${spaceUsed} chars`);

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
    .sort((a, b) => b.tfIdfScore - a.tfIdfScore);
}

// Pure function: Group consecutive chunks together
function groupConsecutiveChunks(chunks) {
  if (chunks.length === 0) return [];

  const sorted = [...chunks].sort((a, b) => a.index - b.index);
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
    .sort((a, b) => b.combinedScore - a.combinedScore);

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
export default async function documentShrink(document, query, options = {}) {
  // Handle edge cases early
  if (!document || document.length === 0) {
    return {
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
  }

  // console.log(`[documentShrink] Starting with document length: ${document.length}, query: "${query}"`);
  // console.log(`[documentShrink] Options:`, options);

  const config = { ...DEFAULT_OPTIONS, ...options };

  // Validate and fix config values
  if (config.targetSize <= 0) config.targetSize = DEFAULT_OPTIONS.targetSize;
  if (config.chunkSize <= 0) config.chunkSize = DEFAULT_OPTIONS.chunkSize;
  if (config.tokenBudget <= 0) config.tokenBudget = DEFAULT_OPTIONS.tokenBudget;

  let tokenBudget = config.tokenBudget;

  // console.log(`[documentShrink] Config:`, config);

  // Step 1: Create chunks
  const chunks = createChunks(document, config.chunkSize, config.targetSize);

  // Step 2: Calculate space allocation
  const allocation = calculateSpaceAllocation(
    chunks,
    config.targetSize,
    tokenBudget,
    document.length
  );
  // console.log(`[documentShrink] Space allocation:`, allocation);
  // console.time(`[documentShrink] Full processing for "${query}"`);

  // Step 3: Expand query
  const { expansions, tokensUsed: expansionTokens } = await expandQuery(
    query,
    tokenBudget,
    config.llm
  );
  tokenBudget -= expansionTokens;
  // console.log(`[documentShrink] Token budget after expansion: ${tokenBudget}`);
  // console.log(`[documentShrink] Expansions:`, expansions);

  // Step 4: Score with TF-IDF
  const scoredChunks = scoreChunksWithTfIdf(chunks, expansions);

  // Step 5: Select chunks for TF-IDF budget (leaving room for LLM chunks)
  const { selected, candidates, sizeUsed } = selectChunksByTfIdf(
    scoredChunks,
    allocation.tfIdfBudget
  );
  // console.log(`[documentShrink] TF-IDF selected ${selected.length} chunks, ${candidates.length} candidates remain`);

  // Step 6: Use LLM to find high-value edge chunks
  // console.log(`[documentShrink] About to score edge chunks...`);
  const { scored, tokensUsed: scoreTokens } = await scoreEdgeChunks(
    candidates,
    query,
    allocation.chunksWeCanScore,
    config.llm,
    options
  );
  tokenBudget -= scoreTokens;
  // console.log(`[documentShrink] Scored ${scored.length} edge chunks, tokens remaining: ${tokenBudget}`);

  // Step 7: Add scored chunks that fit
  let result = addChunksThatFit(selected, sizeUsed, scored, config.targetSize);

  // Step 8: Use remaining tokens to compress chunks for even more content
  const remainingSpace = config.targetSize - result.size;
  let compressTokens = 0;
  const minSpaceForCompression = Math.min(allocation.avgChunkSize * 0.5, 200);

  if (remainingSpace > minSpaceForCompression && allocation.chunksWeCanCompress > 0) {
    const compressionCandidates = getUnselectedChunks(scoredChunks, result.chunks);

    const { compressed, tokensUsed } = await compressHighValueChunks(
      compressionCandidates,
      query,
      allocation.chunksWeCanCompress,
      remainingSpace,
      allocation,
      config.llm,
      options
    );
    compressTokens = tokensUsed;
    tokenBudget -= tokensUsed;

    result = addChunksThatFit(result.chunks, result.size, compressed, config.targetSize);
  }

  // Step 9: Apply gap filling if configured
  let finalChunks = result.chunks;
  let gapFillerCount = 0;

  if (config.gapFillerBudgetRatio > 0) {
    const gapFillerBudget = Math.floor(config.targetSize * config.gapFillerBudgetRatio);
    const remainingSpace = config.targetSize - result.size;
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
  const content = assembleContent(chunkGroups);

  // console.timeEnd(`[documentShrink] Full processing for "${query}"`);

  return {
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
        budget: config.tokenBudget,
        used: config.tokenBudget - tokenBudget,
        breakdown: {
          expansion: expansionTokens,
          scoring: scoreTokens || 0,
          compression: compressTokens || 0,
        },
      },
    },
  };
}
