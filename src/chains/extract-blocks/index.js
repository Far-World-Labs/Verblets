import callLlm from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import parallelBatch from '../../lib/parallel-batch/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { blockExtractionSchema } from './block-schema.js';
import createProgressEmitter, { scopePhase } from '../../lib/progress/index.js';
import { OpEvent, DomainEvent, Outcome } from '../../lib/progress/constants.js';
import { nameStep, getOptions, withPolicy } from '../../lib/context/option.js';
import { resolveArgs, resolveTexts } from '../../lib/instruction/index.js';

const name = 'extract-blocks';

// ===== Option Mappers =====

const DEFAULT_PRECISION = { windowSize: 100, overlapSize: 20 };

/**
 * Map precision option to a block detection posture.
 * Coordinates window granularity and overlap size.
 * low: large windows, minimal overlap — fast scan, may miss subtle boundaries.
 * high: small windows, large overlap — thorough, catches boundaries near window edges.
 * Default: windowSize 100, overlapSize 20.
 * @param {string|object|undefined} value
 * @returns {{ windowSize: number, overlapSize: number }}
 */
export const mapPrecision = (value) => {
  if (value === undefined) return DEFAULT_PRECISION;
  if (typeof value === 'object') return value;
  return (
    {
      low: { windowSize: 200, overlapSize: 10 },
      med: DEFAULT_PRECISION,
      high: { windowSize: 50, overlapSize: 30 },
    }[value] ?? DEFAULT_PRECISION
  );
};

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
 * @param {Object} config.logger - Logger instance
 * @returns {Promise<Array<Array<string>>>} Array of blocks, each block is array of lines
 */
export async function extractBlocks(text, instructions, config) {
  [instructions, config] = resolveArgs(instructions, config);
  const { text: instructionText, context } = resolveTexts(instructions, []);
  const effectiveInstructions = context ? `${instructionText}\n\n${context}` : instructionText;
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();
  emitter.emit({ event: DomainEvent.input, value: text });
  const { maxParallel, windowSize, overlapSize } = await getOptions(runConfig, {
    precision: withPolicy(mapPrecision, ['windowSize', 'overlapSize']),
    maxParallel: 3,
  });

  // Handle empty text
  if (!text || text.trim() === '') {
    emitter.complete({ blocksExtracted: 0, outcome: Outcome.success });
    return [];
  }

  try {
    const lines = text.split('\n');
    const totalLines = lines.length;

    // Generate window start positions
    const windowStarts = [];
    for (let start = 0; start < totalLines; start += windowSize - overlapSize) {
      windowStarts.push(start);
    }

    emitter.emit({
      event: DomainEvent.phase,
      phase: 'windowing',
      totalLines,
      windowCount: windowStarts.length,
      windowSize,
      overlapSize,
    });

    const batchDone = emitter.batch(windowStarts.length);
    emitter.progress({
      event: OpEvent.start,
      totalItems: windowStarts.length,
      totalBatches: windowStarts.length,
      maxParallel,
    });

    emitter.emit({ event: DomainEvent.phase, phase: 'extraction' });

    // Process windows with controlled parallelism
    const allBlockBoundaries = await parallelBatch(
      windowStarts,
      async (windowStart) => {
        const windowEnd = Math.min(windowStart + windowSize, totalLines);
        const windowLines = lines.slice(windowStart, windowEnd);

        const prompt = buildBlockExtractionPrompt(windowLines, windowStart, effectiveInstructions);

        const result = await retry(
          () =>
            callLlm(prompt, {
              ...runConfig,
              responseFormat: blockExtractionSchema,
            }),
          {
            label: `extract-blocks:window`,
            config: runConfig,
            onProgress: scopePhase(runConfig.onProgress, 'window'),
          }
        );

        batchDone(1);

        // Results should already have global line numbers
        return result.blocks || [];
      },
      {
        maxParallel,
        label: 'extract-blocks windows',
        abortSignal: runConfig.abortSignal,
      }
    );

    emitter.emit({
      event: DomainEvent.phase,
      phase: 'merging',
      rawBlocks: allBlockBoundaries.flat().length,
    });

    // Flatten all blocks and sort by start line, then by end line (descending)
    const allBlocks = allBlockBoundaries
      .flat()
      .filter((b) => b && b.startLine !== undefined && b.endLine !== undefined)
      .toSorted((a, b) => a.startLine - b.startLine || b.endLine - a.endLine);

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
    const blocks = mergedBlocks.map(({ startLine, endLine }) =>
      lines.slice(startLine, endLine + 1)
    );

    emitter.progress({
      event: OpEvent.complete,
      totalItems: windowStarts.length,
      processedItems: batchDone.count,
      blocksExtracted: blocks.length,
    });

    const resultMeta = { blocksExtracted: blocks.length, outcome: Outcome.success };
    emitter.emit({ event: DomainEvent.output, value: blocks });
    emitter.complete(resultMeta);

    return blocks;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

extractBlocks.knownTexts = [];

export default extractBlocks;
