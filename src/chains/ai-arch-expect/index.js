import fs from 'fs';
import path from 'path';
import { expect } from 'vitest';
import chatgpt from '../../lib/chatgpt/index.js';
import reduce from '../reduce/index.js';

// Configuration constants
// These control the behavior of the architecture testing system
const DEFAULT_MAX_FAILURES = 1; // Stop processing after this many failures (unless in coverage mode)
const DEFAULT_BULK_SIZE = 20; // Number of items to process in a single bulk request
const DEFAULT_MAX_CONCURRENCY = 5; // Maximum number of concurrent requests
const DEFAULT_COVERAGE_THRESHOLD = 0.5; // Default threshold for coverage tests (50%)
const INDIVIDUAL_MODE_ITEM_THRESHOLD = 5; // Switch to individual mode when item count is at or below this
const MAX_CONTENT_LENGTH = 8000; // Truncate file content beyond this length
const MAX_FAILURE_DETAILS_SHOWN = 5; // Show at most this many failure details in error messages

// Processing mode constants
const PROCESSING_MODES = {
  INDIVIDUAL: 'individual',
  BULK: 'bulk',
};

// Progress status constants
const PROGRESS_STATUS = {
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  ERROR: 'error',
};

// Re-export utilities for backwards compatibility
export { default as eachFile } from '../../lib/each-file/index.js';
export { default as eachDir } from '../../lib/each-dir/index.js';

// Context builders
export const fileContext = (filePath, name = path.basename(filePath)) => ({
  type: 'file',
  filePath,
  name,
});
export const jsonContext = (filePath, name = path.basename(filePath, '.json')) => ({
  type: 'json',
  filePath,
  name,
});
export const dataContext = (data, name) => ({ type: 'data', data, name });

// Helper to list directory contents
export function listDir(dirPath) {
  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) return [];
  return fs.readdirSync(dirPath).map((item) => ({
    name: item,
    path: path.join(dirPath, item),
    isDirectory: fs.statSync(path.join(dirPath, item)).isDirectory(),
  }));
}

// Helper to count items
export async function countItems(target) {
  const items = await target.resolve();
  return items.length;
}

// Pure functions for parallel processing composition

// Create batches from items with configurable size
function createBatches(items, batchSize) {
  const batches = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push({
      items: items.slice(i, i + batchSize),
      index: Math.floor(i / batchSize) + 1,
      startIndex: i,
    });
  }
  return batches;
}

// Create progress metadata
function createProgressMetadata(batch, totalBatches, totalItems, status, config, mode) {
  return {
    chunkIndex: batch.index,
    totalChunks: totalBatches,
    itemsInChunk: batch.items.length,
    totalItems,
    status,
    bulkSize: config.bulkSize,
    maxConcurrency: config.maxConcurrency,
    processingMode: mode,
    parallelMode: true,
  };
}

// Process individual item with error handling
async function processIndividualItem(item, contextText, itemContextFns, description, targetType) {
  try {
    const itemContextText = itemContextFns
      .map((fn) => resolveContext(fn(item)))
      .filter(Boolean)
      .join('\n\n');
    const fullContext = [contextText, itemContextText].filter(Boolean).join('\n\n');
    const prompt = buildPrompt(fullContext, item, description, targetType === 'files');

    const response = await chatgpt(prompt, {
      modelOptions: {
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'arch_result',
            schema: resultSchema,
          },
        },
      },
    });

    return { item, ...response, error: undefined };
  } catch (error) {
    return { item, passed: false, reason: `Analysis failed: ${error.message}`, error };
  }
}

// Process batch results and track failures
function processBatchResults(batchResults, isCoverageTest, maxFailures, currentFailures) {
  const results = [];
  const errors = [];
  let failures = currentFailures;

  for (const result of batchResults) {
    results.push(result);

    if (!result.passed) {
      failures++;
      errors.push(result.error || new Error(result.reason));
    }

    // Coverage mode disables maxFailures - continue processing all items
    if (!isCoverageTest && failures >= maxFailures) {
      break;
    }
  }

  return {
    results,
    errors,
    failures,
    shouldStop: !isCoverageTest && failures >= maxFailures,
  };
}

// Execute progress callback with error handling
function executeProgressCallback(callback, items, error, metadata) {
  if (callback) {
    callback(items, error, metadata);
  }
}

// Process bulk chunk with error handling
async function processBulkChunk(chunk, contextText, description, onProgress, metadata) {
  // Execute progress callback for start of processing
  executeProgressCallback(onProgress, chunk, undefined, {
    ...metadata,
    status: PROGRESS_STATUS.PROCESSING,
  });

  try {
    // Use reduce for bulk processing
    const prompt = buildBulkPrompt(contextText, chunk, description);
    const response = await reduce(chunk, prompt, {
      llm: {
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'arch_bulk_result',
            schema: bulkResultSchema,
          },
        },
      },
    });

    const resultArray = response.results || response;

    let parsedResults = [];
    if (Array.isArray(resultArray)) {
      parsedResults = resultArray;
    } else {
      // If we don't get an array, create failure results for this chunk
      parsedResults = chunk.map((item) => ({
        path: item,
        passed: false,
        reason: 'Invalid response format',
      }));
    }

    // Execute progress callback for completion
    const failed = parsedResults.filter((r) => !r.passed).length;
    const passed = parsedResults.length - failed;
    executeProgressCallback(
      onProgress,
      chunk,
      failed > 0 ? new Error(`${failed} items failed`) : undefined,
      {
        ...metadata,
        status: PROGRESS_STATUS.COMPLETED,
        passed,
        failed,
      }
    );

    return parsedResults;
  } catch (error) {
    // This catch handles both API errors and parsing failures
    // Create failure results for this chunk
    const parsedResults = chunk.map((item) => ({
      path: item,
      passed: false,
      reason: `Processing error: ${error.message}`,
    }));

    // Execute progress callback for error
    executeProgressCallback(onProgress, chunk, error, {
      ...metadata,
      status: PROGRESS_STATUS.ERROR,
    });

    // Return the failure results instead of throwing, so processing can continue
    return parsedResults;
  }
}

// Calculate result statistics
function calculateResultStats(allItems, results) {
  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;
  const allPassed = failed === 0;
  const stoppedEarly = results.length < allItems.length;
  const failures = results.filter((r) => !r.passed);

  return {
    passed,
    failed,
    allPassed,
    stoppedEarly,
    failures,
    total: allItems.length,
    processed: results.length,
  };
}

// Generate result message
function generateResultMessage(stats, description, maxFailures) {
  if (stats.allPassed) {
    return `All ${stats.processed}/${stats.total} items satisfy: ${description}`;
  }

  const failureDetails = stats.failures
    .slice(0, MAX_FAILURE_DETAILS_SHOWN)
    .map((f) => `  • ${f.item}: ${f.reason || 'Failed'}`)
    .join('\n');
  const moreFailures =
    stats.failures.length > MAX_FAILURE_DETAILS_SHOWN
      ? `\n  ... and ${stats.failures.length - MAX_FAILURE_DETAILS_SHOWN} more failures`
      : '';

  return `${stats.failed}/${stats.processed} items failed: ${description}${
    stats.stoppedEarly && maxFailures !== DEFAULT_MAX_FAILURES
      ? ` (stopped after ${maxFailures} failures)`
      : ''
  }\n\nFailures:\n${failureDetails}${moreFailures}`;
}

// Create summary result object
function createSummaryResult(stats, message) {
  return {
    passed: stats.allPassed,
    message,
    details: {
      total: stats.total,
      processed: stats.processed,
      passed: stats.passed,
      failed: stats.failed,
      failures: stats.failures,
    },
  };
}

// Create processing strategy configuration
function createProcessingStrategy(target, onChunkProcessed, itemContextFns, itemCount) {
  const shouldUseIndividual =
    onChunkProcessed || itemContextFns.length > 0 || itemCount <= INDIVIDUAL_MODE_ITEM_THRESHOLD;

  return {
    mode: shouldUseIndividual ? PROCESSING_MODES.INDIVIDUAL : PROCESSING_MODES.BULK,
    batchSize: shouldUseIndividual ? target.maxConcurrency : target.bulkSize,
    processor: shouldUseIndividual
      ? (batch, context, config) => processIndividualBatch(batch, context, config)
      : (batch, context, config) =>
          processBulkChunk(
            batch.items,
            context,
            config.description,
            config.onProgress,
            config.metadata
          ),
  };
}

// Process individual batch (extracted from processIndividually)
async function processIndividualBatch(batch, contextText, config) {
  const batchPromises = batch.items.map((item) =>
    processIndividualItem(
      item,
      contextText,
      config.itemContextFns,
      config.description,
      config.targetType
    )
  );
  return await Promise.all(batchPromises);
}

// Process batch results based on mode
function processBatchByMode(batchResults, mode, config) {
  if (mode === PROCESSING_MODES.INDIVIDUAL) {
    // Individual mode: process failures and track stopping condition
    const { results, errors, failures, shouldStop } = processBatchResults(
      batchResults,
      config.isCoverageTest,
      config.maxFailures,
      config.currentFailures || 0
    );

    return {
      results,
      errors,
      failures,
      shouldStop,
      progressData: {
        passed: results.filter((r) => r.passed).length,
        failed: errors.length,
      },
    };
  } else {
    // Bulk mode: transform results to standard format
    const transformedResults = batchResults.map((r) => ({
      item: r.path,
      passed: r.passed,
      reason: r.reason,
    }));

    return {
      results: transformedResults,
      errors: [],
      failures: config.currentFailures || 0,
      shouldStop: false,
      progressData: {
        passed: transformedResults.filter((r) => r.passed).length,
        failed: transformedResults.filter((r) => !r.passed).length,
      },
    };
  }
}

// Unified batch processor that handles both individual and bulk modes
async function processWithStrategy(items, contextText, strategy, config) {
  const batches = createBatches(items, strategy.batchSize);
  const allResults = [];
  let totalFailures = 0;

  for (const batch of batches) {
    // Coverage mode disables maxFailures - process all items
    if (!config.isCoverageTest && totalFailures >= config.maxFailures) {
      break;
    }

    // Create metadata for this batch
    const metadata = createProgressMetadata(
      batch,
      batches.length,
      items.length,
      PROGRESS_STATUS.PROCESSING,
      config,
      strategy.mode
    );

    // Execute progress callback for start of processing
    executeProgressCallback(config.onChunkProcessed, batch.items, undefined, metadata);

    // Process batch using the appropriate strategy
    let rawResults;
    if (strategy.mode === PROCESSING_MODES.INDIVIDUAL) {
      rawResults = await processIndividualBatch(batch, contextText, {
        itemContextFns: config.itemContextFns,
        description: config.description,
        targetType: config.targetType,
      });
    } else {
      rawResults = await processBulkChunk(
        batch.items,
        contextText,
        config.description,
        config.onChunkProcessed,
        metadata
      );
    }

    // Process results based on mode
    const processedBatch = processBatchByMode(rawResults, strategy.mode, {
      ...config,
      currentFailures: totalFailures,
    });

    allResults.push(...processedBatch.results);
    totalFailures = processedBatch.failures;

    // Execute progress callback for completion
    executeProgressCallback(
      config.onChunkProcessed,
      batch.items,
      processedBatch.errors.length > 0 ? processedBatch.errors[0] : undefined,
      {
        ...createProgressMetadata(
          batch,
          batches.length,
          items.length,
          PROGRESS_STATUS.COMPLETED,
          config,
          strategy.mode
        ),
        ...processedBatch.progressData,
      }
    );

    if (processedBatch.shouldStop) {
      break;
    }
  }

  return allResults;
}

// JSON schemas for structured responses
const resultSchema = {
  type: 'object',
  properties: {
    passed: { type: 'boolean' },
    reason: { type: 'string' },
  },
  required: ['passed', 'reason'],
};

const bulkResultSchema = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          passed: { type: 'boolean' },
          reason: { type: 'string' },
        },
        required: ['path', 'passed', 'reason'],
      },
    },
  },
  required: ['results'],
};

function resolveContext(ctx) {
  switch (ctx.type) {
    case 'file': {
      return fs.existsSync(ctx.filePath)
        ? `<${ctx.name}>\n${fs.readFileSync(ctx.filePath, 'utf8')}\n</${ctx.name}>`
        : '';
    }
    case 'json': {
      if (!fs.existsSync(ctx.filePath)) return '';
      const data = JSON.parse(fs.readFileSync(ctx.filePath, 'utf8'));
      return `<${ctx.name}>\n${JSON.stringify(data, undefined, 2)}\n</${ctx.name}>`;
    }
    case 'data': {
      const dataStr =
        typeof ctx.data === 'string' ? ctx.data : JSON.stringify(ctx.data, undefined, 2);
      return `<${ctx.name}>\n${dataStr}\n</${ctx.name}>`;
    }
    default:
      return '';
  }
}

function getItemContent(item) {
  if (!fs.existsSync(item)) return 'Item does not exist';
  const stats = fs.statSync(item);
  if (stats.isDirectory()) {
    return fs.readdirSync(item).join(', ');
  } else {
    const content = fs.readFileSync(item, 'utf8');
    return content.length > MAX_CONTENT_LENGTH
      ? `${content.substring(0, MAX_CONTENT_LENGTH)}\n... (truncated)`
      : content;
  }
}

function buildPrompt(contextText, item, description, isFile) {
  const content = getItemContent(item);
  return `${contextText}
Analyze this ${isFile ? 'file' : 'directory'}: ${item}

Content:
${content}

Does it satisfy: "${description}"?

Return JSON with "passed" (boolean) and "reason" (string).`;
}

function buildBulkPrompt(contextText, items, description) {
  return `${contextText}
Analyze each item and determine if it satisfies: "${description}"
Items: ${items.join(', ')}

Return JSON with "results" array containing objects with "path", "passed" (boolean), and "reason" (string).`;
}

// Main expectation class
class ArchExpectation {
  constructor(target, options = {}) {
    this.target = target;
    this.contexts = [];
    this.itemContextFns = [];
    this.maxFailures = options.maxFailures || DEFAULT_MAX_FAILURES;
    this.bulkSize = options.bulkSize || DEFAULT_BULK_SIZE;
    this.maxConcurrency = options.maxConcurrency || DEFAULT_MAX_CONCURRENCY;
    this.onChunkProcessed = undefined;
    this.description = undefined;
    this.threshold = undefined;
    this.isCoverageTest = false;
  }

  withContext(ctx) {
    this.contexts.push(ctx);
    return this;
  }

  withItemContext(ctxFn) {
    this.itemContextFns.push(ctxFn);
    return this;
  }

  // Set up for a satisfies test
  satisfies(description) {
    this.description = description;
    // Don't reset isCoverageTest - coverage tests can have satisfies descriptions
    return this;
  }

  // Set up for a coverage test
  coverage(threshold = DEFAULT_COVERAGE_THRESHOLD) {
    this.threshold = threshold;
    this.isCoverageTest = true;
    return this;
  }

  // Start processing - this is the fluent terminator
  async start() {
    if (!this.description) {
      throw new Error('Must call satisfies() before start()');
    }

    const items = await this.target.resolve();
    const contextText = this.contexts.map(resolveContext).filter(Boolean).join('\n\n');

    // Determine processing strategy
    const strategy = createProcessingStrategy(
      this,
      this.onChunkProcessed,
      this.itemContextFns,
      items.length
    );
    const config = {
      bulkSize: this.bulkSize,
      maxConcurrency: this.maxConcurrency,
      description: this.description,
      onChunkProcessed: this.onChunkProcessed,
      itemContextFns: this.itemContextFns,
      targetType: this.target.type,
      maxFailures: this.maxFailures,
      isCoverageTest: this.isCoverageTest,
    };

    // Process items using the determined strategy
    const allResults = await processWithStrategy(items, contextText, strategy, config);

    // Handle coverage test results
    if (this.isCoverageTest) {
      const passed = allResults.filter((r) => r.passed).length;
      const coverage = items.length > 0 ? passed / items.length : 0;
      const coveragePassed = coverage >= this.threshold;

      const message = `Coverage: ${passed}/${items.length} (${(coverage * 100).toFixed(1)}%) - ${
        coveragePassed ? 'meets' : 'below'
      } ${(this.threshold * 100).toFixed(1)}% threshold`;

      if (!coveragePassed) {
        expect.fail(message);
      }

      return { passed: coveragePassed, coverage, message };
    }

    return this.summarize(items, allResults);
  }

  summarize(allItems, results) {
    const stats = calculateResultStats(allItems, results);
    const message = generateResultMessage(stats, this.description, this.maxFailures);

    if (!stats.allPassed) {
      expect.fail(message);
    }

    return createSummaryResult(stats, message);
  }
}

export function aiArchExpect(target, options = {}) {
  return new ArchExpectation(target, options);
}

export default aiArchExpect;
