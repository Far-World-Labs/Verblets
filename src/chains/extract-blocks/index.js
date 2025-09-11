import chatGPT from '../../lib/chatgpt/index.js';
import retry from '../../lib/retry/index.js';
import parallelBatch from '../../lib/parallel-batch/index.js';
import { createLifecycleLogger } from '../../lib/lifecycle-logger/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { blockExtractionSchema } from './block-schema.js';
import {
  emitBatchStart,
  emitBatchComplete,
  emitBatchProcessed,
  createBatchProgressCallback,
} from '../../lib/progress-callback/index.js';

const buildBlockExtractionPrompt = (windowLines, windowStart, instructions) => {
  // Add global line numbers to each line for easier reference
  const numberedLines = windowLines.map((line, i) => `${windowStart + i}: ${line}`).join('\n');

  return `Identify complete block boundaries in this text window.

${asXML(instructions, { tag: 'instructions' })}

IMPORTANT:
- A block starts when you see clear beginning markers (headers, dates, new entries, etc.)
- A block ends just before the next block starts, or at a clear terminator, or at window end
- Return the global line numbers shown at the start of each line
- Only include blocks that are completely visible (both start and end are clear)
- Skip partial blocks cut off at window boundaries
- Line numbers are shown as "123: content" - use these numbers in your response

Window content (lines ${windowStart} to ${windowStart + windowLines.length - 1}):
${asXML(numberedLines, { tag: 'window' })}`;
};

/**
 * Extract blocks of multiline text using rolling windows
 *
 * This chain processes text in overlapping windows to identify complete blocks,
 * then extracts them as arrays of lines. It deduplicates blocks based on their
 * starting line offset.
 *
 * @param {string} text - The full text to process
 * @param {string} instructions - Instructions for identifying block boundaries
 * @param {Object} config - Configuration options
 * @param {number} config.windowSize - Lines per window (default: 100)
 * @param {number} config.overlapSize - Lines of overlap between windows (default: 20)
 * @param {number} config.maxParallel - Max parallel window processing (default: 3)
 * @param {number} config.maxAttempts - Max retry attempts for failed requests (default: 3)
 * @param {Object} config.logger - Logger instance
 * @returns {Promise<Array<Array<string>>>} Array of blocks, each block is array of lines
 */
export async function extractBlocks(text, instructions, config = {}) {
  const {
    windowSize = 100,
    overlapSize = 20,
    maxParallel = 3,
    maxAttempts = 3,
    logger,
    llm,
    onProgress,
    now = new Date(),
    ...options
  } = config;

  const lifecycleLogger = createLifecycleLogger(logger, 'chain:extract-blocks');

  // Handle empty text
  if (!text || text.trim() === '') {
    lifecycleLogger.logResult([], {
      blocksExtracted: 0,
    });
    return [];
  }

  const lines = text.split('\n');
  const totalLines = lines.length;

  lifecycleLogger.logStart({
    totalLines,
    windowSize,
    overlapSize,
    maxParallel,
  });

  // Log input
  lifecycleLogger.info({
    event: 'chain:extract-blocks:input',
    value: {
      textLength: text.length,
      lineCount: totalLines,
    },
  });

  // Generate window start positions
  const windowStarts = [];
  for (let start = 0; start < totalLines; start += windowSize - overlapSize) {
    windowStarts.push(start);
  }

  emitBatchStart(onProgress, 'extract-blocks', lines.length, {
    totalWindows: windowStarts.length,
    maxParallel,
    now,
    chainStartTime: now,
  });

  let processedWindows = 0;

  // Process windows with controlled parallelism
  const allBlockBoundaries = await parallelBatch(
    windowStarts,
    async (windowStart) => {
      const windowEnd = Math.min(windowStart + windowSize, totalLines);
      const windowLines = lines.slice(windowStart, windowEnd);

      const prompt = buildBlockExtractionPrompt(windowLines, windowStart, instructions);

      const result = await retry(chatGPT, {
        label: `extract-blocks:window`,
        maxAttempts,
        now,
        chainStartTime: now,
        onProgress: createBatchProgressCallback(onProgress, {
          totalItems: lines.length,
          processedItems: Math.min(windowStart + windowSize, lines.length),
          windowNumber: processedWindows + 1,
          windowSize: windowLines.length,
          windowStart,
          totalWindows: windowStarts.length,
          now,
          chainStartTime: now,
        }),
        chatGPTPrompt: prompt,
        chatGPTConfig: {
          modelOptions: {
            response_format: blockExtractionSchema,
            ...llm,
          },
          logger: lifecycleLogger,
          ...options,
        },
      });

      processedWindows++;

      emitBatchProcessed(
        onProgress,
        'extract-blocks',
        {
          totalItems: lines.length,
          processedItems: Math.min(windowStart + windowSize, lines.length),
          batchNumber: processedWindows,
          batchSize: windowLines.length,
        },
        {
          windowStart,
          totalWindows: windowStarts.length,
          blocksFound: (result.blocks || []).length,
          now: new Date(),
          chainStartTime: now,
        }
      );

      // Results should already have global line numbers
      return result.blocks || [];
    },
    {
      maxParallel,
      label: 'extract-blocks windows',
    }
  );

  // Flatten all blocks and sort by start line, then by end line (descending)
  const allBlocks = allBlockBoundaries
    .flat()
    .filter((b) => b && b.startLine !== undefined && b.endLine !== undefined)
    .sort((a, b) => a.startLine - b.startLine || b.endLine - a.endLine);

  // Merge overlapping blocks
  const mergedBlocks = [];
  for (const block of allBlocks) {
    const last = mergedBlocks[mergedBlocks.length - 1];

    if (!last || block.startLine > last.endLine) {
      // No overlap - add new block
      mergedBlocks.push({ ...block });
    } else if (block.endLine > last.endLine) {
      // Overlaps and extends - update end
      last.endLine = block.endLine;
    }
  }

  // Extract text blocks as arrays of lines (without line numbers)
  const blocks = mergedBlocks.map(({ startLine, endLine }) => lines.slice(startLine, endLine + 1));

  emitBatchComplete(onProgress, 'extract-blocks', lines.length, {
    totalWindows: windowStarts.length,
    blocksExtracted: blocks.length,
    now: new Date(),
    chainStartTime: now,
  });

  // Log output
  lifecycleLogger.info({
    event: 'chain:extract-blocks:output',
    value: {
      totalBlocks: blocks.length,
    },
  });

  lifecycleLogger.logResult(blocks, {
    blocksExtracted: blocks.length,
  });

  return blocks;
}

export default extractBlocks;
