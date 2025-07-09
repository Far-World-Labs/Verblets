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

const DEFAULT_OPTIONS = {
  targetSize: 4000,
  chunkSize: 500,
  tokenBudget: 1000,
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

    // if (chunk.index < 3 || tfIdfScore > 0) {
    //   console.log(`[scoreChunksWithTfIdf] Chunk ${chunk.index} score: ${tfIdfScore}, text: "${chunk.text.slice(0, 50)}..."`);
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

  return { selected, candidates, sizeUsed };
}

// Pure function: Score edge chunks with LLM
async function scoreEdgeChunks(candidates, query, maxChunks, llm) {
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

  const { scores } = await score(
    cleanedChunks,
    `relevance to the query "${query}" (0=completely unrelated, 5=somewhat related, 10=directly answers the question)`,
    { chunkSize: LLM_CHUNK_BATCH_SIZE, llm }
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
async function compressHighValueChunks(chunks, query, maxChunks, availableSpace, allocation, llm) {
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
    `Extract only the parts that help answer: "${query}". Keep important details. Aim for ${compressionTarget}% of original length.`,
    { chunkSize: 10, llm }
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
        chunks: { total: 0, tfIdfSelected: 0, llmSelected: 0, compressed: 0 },
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
    config.llm
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
      config.llm
    );
    compressTokens = tokensUsed;
    tokenBudget -= tokensUsed;

    result = addChunksThatFit(result.chunks, result.size, compressed, config.targetSize);
  }

  const finalChunks = result.chunks;

  // Final assembly - join chunks back together
  const sortedChunks = finalChunks.sort((a, b) => a.index - b.index);

  // Check if chunks are consecutive and cover the whole document
  let isConsecutive = true;
  let expectedStart = 0;

  for (const chunk of sortedChunks) {
    if (chunk.start !== expectedStart) {
      isConsecutive = false;
      break;
    }
    expectedStart = chunk.start + chunk.size;
  }

  // If chunks are consecutive slices, just concatenate them
  const content = isConsecutive
    ? sortedChunks.map((c) => c.text).join('')
    : sortedChunks.map((c) => c.text).join('\n\n');

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
