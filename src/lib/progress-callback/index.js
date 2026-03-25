/**
 * Progress callback utility for batch operations
 * Works in both Node.js and browser environments
 */

import createBatches from '../text-batch/index.js';

/**
 * Emit a progress event
 * @param {Object} params - Progress parameters
 * @param {Function} params.callback - The progress callback function
 * @param {string} params.step - Name of the current step (e.g., 'map', 'filter', 'score')
 * @param {string} [params.event] - Event type (e.g., 'start', 'complete', 'error', 'retry')
 * @param {number} [params.attemptNumber] - Current attempt number (from retry)
 * @param {number} [params.totalItems] - Total number of items to process
 * @param {number} [params.processedItems] - Number of items processed so far
 * @param {number} [params.batchSize] - Size of current batch
 * @param {number} [params.batchNumber] - Current batch number
 * @param {Object} [params.logger] - Optional logger instance
 * @param {...*} [params...] - Any additional fields to include in the event
 */
export function emitProgress(params) {
  const { callback, step, logger, ...eventData } = params;

  if (!callback || typeof callback !== 'function') {
    return;
  }

  const progressData = {
    kind: eventData.kind || 'operation',
    step,
    timestamp: new Date().toISOString(),
    ...eventData,
  };

  // Calculate progress if we have the necessary data
  if (progressData.totalItems > 0 && progressData.processedItems !== undefined) {
    progressData.progress = progressData.processedItems / progressData.totalItems;
  }

  try {
    callback(progressData);
  } catch (error) {
    // Log the error but don't disrupt the main process
    if (logger?.error) {
      logger.error({
        message: 'Progress callback error',
        error: error.message,
        stack: error.stack,
      });
    }
  }
}

/**
 * Emit a start event for any operation
 */
export const emitStart = (callback, step, metadata = {}) => {
  if (!callback) return;

  emitProgress({
    callback,
    step,
    event: 'start',
    ...metadata,
  });
};

/**
 * Emit a start event for a batch operation
 */
export const emitBatchStart = (callback, step, totalItems, metadata = {}) => {
  if (!callback) return;

  emitProgress({
    callback,
    step,
    event: 'start',
    totalItems,
    processedItems: 0,
    ...metadata,
  });
};

/**
 * Emit a complete event for any operation
 */
export const emitComplete = (callback, step, metadata = {}) => {
  if (!callback) return;

  emitProgress({
    callback,
    step,
    event: 'complete',
    ...metadata,
  });
};

/**
 * Emit a complete event for a batch operation
 */
export const emitBatchComplete = (callback, step, totalItems, metadata = {}) => {
  if (!callback) return;

  emitProgress({
    callback,
    step,
    event: 'complete',
    totalItems,
    processedItems: totalItems,
    ...metadata,
  });
};

/**
 * Emit a batch processed event
 */
export const emitBatchProcessed = (callback, step, progress, metadata = {}) => {
  if (!callback) return;

  emitProgress({
    callback,
    step,
    event: 'batch:complete',
    totalItems: progress.totalItems,
    processedItems: progress.processedItems,
    batchNumber: progress.batchNumber,
    batchSize: progress.batchSize,
    ...metadata,
  });
};

/**
 * Create a progress callback that adds batch context to retry events
 */
export const createBatchProgressCallback = (onProgress, batchContext) => {
  if (!onProgress) return undefined;

  return (event) => {
    emitProgress({
      ...event,
      callback: onProgress,
      ...batchContext,
    });
  };
};

/**
 * Create batch context for progress tracking
 */
const createBatchContext = ({
  batchIndex,
  batchSize,
  startIndex,
  totalItems,
  processedItems,
  totalBatches,
}) => ({
  totalItems,
  processedItems,
  batchNumber: batchIndex + 1,
  batchSize,
  batchIndex: `${startIndex}-${startIndex + batchSize - 1}`,
  totalBatches,
});

/**
 * Emit a step progress event
 */
export const emitStepProgress = (callback, step, stepName, metadata = {}) => {
  if (!callback) return;

  emitProgress({
    callback,
    step,
    event: 'step',
    stepName,
    ...metadata,
  });
};

/**
 * Emit a phase progress event (for multi-phase operations)
 */
export const emitPhaseProgress = (callback, step, phase, metadata = {}) => {
  if (!callback) return;

  emitProgress({
    callback,
    step,
    event: 'phase',
    phase,
    ...metadata,
  });
};

/**
 * Set up batches and a progress tracker for a batch-processing chain.
 * Combines createBatches + batchTracker setup into one call.
 *
 * @param {string} chainName - Name of the chain (e.g. 'filter', 'map')
 * @param {Array} list - Items to batch
 * @param {object} config - Config object (from nameStep)
 * @param {object} [resolved] - Resolved options from getOptions
 * @param {string} [resolved.progressMode] - Progress granularity mode
 * @returns {Promise<{ batches: Array, tracker: object }>}
 */
export async function prepareBatches(chainName, list, config, { progressMode } = {}) {
  const batches = await createBatches(list, config);
  const tracker = batchTracker(chainName, list.length, {
    onProgress: config.onProgress,
    progressMode,
    now: config.now,
  });
  tracker.start(batches.filter((b) => !b.skip).length);
  return { batches, tracker };
}

/**
 * Stateful tracker that absorbs counter management and emit boilerplate
 * for batch-processing chains.
 *
 * @param {string} chainName - Name of the chain (e.g. 'filter', 'map')
 * @param {number} totalItems - Total number of items across all batches
 * @param {Object} [options]
 * @param {Function} [options.onProgress] - Progress callback
 * @param {Date} [options.now] - Reference timestamp
 * @returns {{ start, forBatch, batchDone, complete }}
 */
export function batchTracker(
  chainName,
  totalItems,
  { onProgress, progressMode, now = new Date() } = {}
) {
  const filteredProgress = filterProgress(onProgress, progressMode);
  const chainStartTime = now;
  let processedBatches = 0;
  let processedItems = 0;
  let totalBatches = 0;

  return {
    start(batchCount, maxParallel) {
      totalBatches = batchCount;
      emitBatchStart(filteredProgress, chainName, totalItems, {
        totalBatches: batchCount,
        ...(maxParallel !== undefined && { maxParallel }),
        now: chainStartTime,
        chainStartTime,
      });
    },

    forBatch(startIndex, batchSize) {
      return createBatchProgressCallback(
        filteredProgress,
        createBatchContext({
          batchIndex: processedBatches,
          batchSize,
          startIndex,
          totalItems,
          processedItems,
          totalBatches,
        })
      );
    },

    batchDone(startIndex, batchSize) {
      processedItems += batchSize;
      processedBatches++;
      emitBatchProcessed(
        filteredProgress,
        chainName,
        {
          totalItems,
          processedItems,
          batchNumber: processedBatches,
          batchSize,
        },
        {
          batchIndex: `${startIndex}-${startIndex + batchSize - 1}`,
          totalBatches,
          now: new Date(),
          chainStartTime,
        }
      );
    },

    complete(metadata = {}) {
      emitBatchComplete(filteredProgress, chainName, totalItems, {
        totalBatches,
        now: new Date(),
        chainStartTime,
        ...metadata,
      });
    },

    scopedProgress(phase) {
      return scopeProgress(filteredProgress, phase);
    },
  };
}

/**
 * Wrap an onProgress callback to tag every event with a phase field.
 * Returns undefined when no callback is provided so callers can pass-through safely.
 *
 * @param {Function} [onProgress] - Progress callback to wrap
 * @param {string} phase - Phase name to tag events with
 * @returns {Function|undefined}
 */
export function scopeProgress(onProgress, phase) {
  if (!onProgress) return undefined;
  return (event) => {
    const composed = event.phase ? `${phase}/${event.phase}` : phase;
    onProgress({ ...event, phase: composed });
  };
}

/**
 * Wrap an onProgress callback to filter events by granularity level.
 * Returns undefined when no callback is provided so callers can pass-through safely.
 *
 * Modes:
 * - 'none'     — suppress all progress events
 * - 'coarse'   — only start/complete events
 * - 'batch'    — start/complete + batch:complete events
 * - 'detailed' — all events (default, no filtering)
 *
 * @param {Function} [onProgress] - Progress callback to wrap
 * @param {string} [mode='detailed'] - Granularity level
 * @returns {Function|undefined}
 */
export function filterProgress(onProgress, mode = 'detailed') {
  if (!onProgress || mode === 'detailed') return onProgress;
  if (mode === 'none') return undefined;

  const allowedEvents =
    mode === 'coarse'
      ? new Set(['start', 'complete'])
      : new Set(['start', 'complete', 'batch:complete']); // 'batch'

  return (event) => {
    if (allowedEvents.has(event.event)) {
      onProgress(event);
    }
  };
}

/**
 * Emit a chain:complete telemetry event.
 * Chains and verblets call this instead of inlining emitProgress.
 * Metadata is spread into the event so the same object can feed logResult.
 *
 * @param {Object} config - Chain config (from nameStep)
 * @param {string} step - Chain/verblet name
 * @param {Object} [metadata] - Extra fields (inputSize, outputSize, etc.)
 * @param {number} [metadata.duration] - Explicit duration override (ms)
 */
function emitChainResult(config, step, metadata = {}) {
  const { duration: explicitDuration, ...rest } = metadata;
  const duration = explicitDuration ?? (config.now ? Date.now() - config.now.getTime() : undefined);
  emitProgress({
    callback: config.onProgress,
    kind: 'telemetry',
    step,
    event: 'chain:complete',
    operation: config.operation,
    ...(duration !== undefined && { duration }),
    ...rest,
  });
}

/**
 * Emit a chain:error telemetry event.
 *
 * @param {Object} config - Chain config (from nameStep)
 * @param {string} step - Chain/verblet name
 * @param {Error} error - The error that occurred
 * @param {Object} [metadata] - Extra fields
 * @param {number} [metadata.duration] - Explicit duration override (ms)
 */
function emitChainError(config, step, error, metadata = {}) {
  const { duration: explicitDuration, ...rest } = metadata;
  const duration = explicitDuration ?? (config.now ? Date.now() - config.now.getTime() : undefined);
  emitProgress({
    callback: config.onProgress,
    kind: 'telemetry',
    step,
    event: 'chain:error',
    operation: config.operation,
    ...(duration !== undefined && { duration }),
    error: { message: error.message },
    ...rest,
  });
}

/**
 * Track the lifecycle of a named operation. Emits a chain:start event
 * and returns a handle with result() and error() to close the span.
 *
 * @param {string} name - Operation name (used in telemetry events)
 * @param {object} config - Enriched config (from nameStep) with operation, onProgress
 * @returns {{ result: function, error: function }} Lifecycle handle
 */
export function track(name, config) {
  emitProgress({
    callback: config.onProgress,
    kind: 'telemetry',
    step: name,
    event: 'chain:start',
    operation: config.operation,
  });

  return {
    result: (metadata = {}) => emitChainResult(config, name, metadata),
    error: (err, metadata = {}) => emitChainError(config, name, err, metadata),
  };
}

export default emitProgress;
