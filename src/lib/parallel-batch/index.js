import { chunk } from '../pure/index.js';
import { ErrorPosture } from '../progress/constants.js';

const METRICS_WINDOW_SIZE = 3;
const DEFAULT_LATENCY_THRESHOLD = 10000;
const DEFAULT_ERROR_THRESHOLD = 0.3;

function createMetricsWindow(size) {
  const entries = [];
  return {
    record(latencyMs, errorRate) {
      entries.push({ latencyMs, errorRate });
      if (entries.length > size) entries.shift();
    },
    averageLatency() {
      if (entries.length === 0) return 0;
      return entries.reduce((sum, e) => sum + e.latencyMs, 0) / entries.length;
    },
    averageErrorRate() {
      if (entries.length === 0) return 0;
      return entries.reduce((sum, e) => sum + e.errorRate, 0) / entries.length;
    },
  };
}

function adjustConcurrency(current, metrics, bounds, thresholds) {
  const avgLatency = metrics.averageLatency();
  const avgErrorRate = metrics.averageErrorRate();

  if (avgLatency > thresholds.latency || avgErrorRate > thresholds.error) {
    return Math.max(current - 1, bounds.min);
  }
  return Math.min(current + 1, bounds.max);
}

/**
 * Process items in parallel batches with controlled concurrency.
 * In resilient mode, failed slots are emitted as `undefined` so callers can
 * distinguish success from failure. Errors propagate via the progress channel.
 *
 * @param {Array} items - Items to process
 * @param {Function} processor - Async function to process each item
 * @param {Object} options - Options
 * @param {number} options.maxParallel - Maximum parallel executions (default: 3)
 * @param {number} options.minParallel - Minimum parallel executions; enables adaptive concurrency when set below maxParallel
 * @param {number} options.latencyThreshold - Batch latency in ms above which concurrency decreases (default: 10000)
 * @param {number} options.errorThreshold - Error rate (0-1) above which concurrency decreases (default: 0.3)
 * @param {string} options.label - Label for debugging (optional)
 * @param {string} options.errorPosture - 'strict' (default): fail on first error; 'resilient': continue, return `undefined` for failures
 * @param {AbortSignal} options.abortSignal - Signal to abort processing between batch groups
 * @returns {Promise<Array>} Results in same order as input items; `undefined` for failed slots in resilient mode
 */
export async function parallelBatch(items, processor, options = {}) {
  const {
    maxParallel = 3,
    minParallel,
    latencyThreshold = DEFAULT_LATENCY_THRESHOLD,
    errorThreshold = DEFAULT_ERROR_THRESHOLD,
    errorPosture = ErrorPosture.strict,
    abortSignal,
  } = options;

  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const adaptive = minParallel !== undefined && minParallel < maxParallel;

  if (!adaptive) {
    const results = [];
    const batches = chunk(maxParallel)(items);
    let offset = 0;

    for (const batch of batches) {
      if (abortSignal?.aborted) {
        throw abortSignal.reason ?? new Error('The operation was aborted.');
      }

      if (errorPosture === ErrorPosture.resilient) {
        const settled = await Promise.allSettled(
          batch.map((item, index) => processor(item, offset + index))
        );
        results.push(...settled.map((r) => (r.status === 'fulfilled' ? r.value : undefined)));
      } else {
        const batchResults = await Promise.all(
          batch.map((item, index) => processor(item, offset + index))
        );
        results.push(...batchResults);
      }
      offset += batch.length;
    }

    return results;
  }

  const effectiveMin = Math.max(1, minParallel);
  const results = [];
  const metrics = createMetricsWindow(METRICS_WINDOW_SIZE);
  let currentParallel = maxParallel;
  let position = 0;

  while (position < items.length) {
    if (abortSignal?.aborted) {
      throw abortSignal.reason ?? new Error('The operation was aborted.');
    }

    const batch = items.slice(position, position + currentParallel);
    const startTime = Date.now();
    let errorCount = 0;

    if (errorPosture === ErrorPosture.resilient) {
      const settled = await Promise.allSettled(
        batch.map((item, index) => processor(item, position + index))
      );
      errorCount = settled.filter((r) => r.status === 'rejected').length;
      results.push(...settled.map((r) => (r.status === 'fulfilled' ? r.value : undefined)));
    } else {
      const batchResults = await Promise.all(
        batch.map((item, index) => processor(item, position + index))
      );
      results.push(...batchResults);
    }

    const latencyMs = Date.now() - startTime;
    const errorRate = errorCount / batch.length;
    metrics.record(latencyMs, errorRate);
    currentParallel = adjustConcurrency(
      currentParallel,
      metrics,
      { min: effectiveMin, max: maxParallel },
      { latency: latencyThreshold, error: errorThreshold }
    );

    position += batch.length;
  }

  return results;
}

/**
 * Map items through an async processor with controlled parallelism
 * Alias for parallelBatch with clearer naming for map operations
 */
export const parallelMap = parallelBatch;

export default parallelBatch;
