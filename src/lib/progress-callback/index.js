/**
 * Progress callback utility for batch operations
 * Works in both Node.js and browser environments
 */

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
export const createBatchContext = ({
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
export function batchTracker(chainName, totalItems, { onProgress, now = new Date() } = {}) {
  const chainStartTime = now;
  let processedBatches = 0;
  let processedItems = 0;
  let totalBatches = 0;

  return {
    start(batchCount, maxParallel) {
      totalBatches = batchCount;
      emitBatchStart(onProgress, chainName, totalItems, {
        totalBatches: batchCount,
        ...(maxParallel !== undefined && { maxParallel }),
        now: chainStartTime,
        chainStartTime,
      });
    },

    forBatch(startIndex, batchSize) {
      return createBatchProgressCallback(
        onProgress,
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
        onProgress,
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
      emitBatchComplete(onProgress, chainName, totalItems, {
        totalBatches,
        now: new Date(),
        chainStartTime,
        ...metadata,
      });
    },

    scopedProgress(phase) {
      return scopeProgress(onProgress, phase);
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
    onProgress({ ...event, phase });
  };
}

export default emitProgress;
