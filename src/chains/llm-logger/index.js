/**
 * LLM Logger - Advanced Logging Implementation
 *
 * Creates a sophisticated logger instance that can be used with the global logger service.
 * This is NOT automatically used - users must explicitly create and set it.
 *
 * Features:
 * - Ring buffer for memory-efficient log storage
 * - Multi-lane processing with custom filters
 * - File context tracking
 * - Batch processing capabilities
 */

import RingBuffer from '../../lib/ring-buffer/index.js';

/**
 * @typedef {Object} LogEntry
 * @property {string} id - Unique identifier for the log entry
 * @property {number} ts - Timestamp when the log was created
 * @property {*} raw - The original log data
 * @property {Object} fileContext - File context information
 * @property {Map} meta - Additional metadata
 */

/**
 * @typedef {Object} LogLaneConfig
 * @property {string} laneId - Unique identifier for the lane
 * @property {Function} writer - Function to write logs (receives array of strings)
 * @property {Function} [filters] - Optional filter function for log entries
 */

/**
 * Extract file context information from the call stack
 */
function extractFileContext() {
  const stack = new Error().stack;
  const lines = stack.split('\n');

  // Skip the first few lines (Error, extractFileContext, log function)
  for (let i = 3; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/at .* \((.+):(\d+):\d+\)/);
    if (match) {
      return {
        filePath: match[1],
        line: parseInt(match[2]),
      };
    }
  }

  return { filePath: 'unknown', line: 0 };
}

/**
 * Create console writer function
 */
export function createConsoleWriter(prefix = '') {
  return (logs) => {
    logs.forEach((log) => console.log(prefix + log));
  };
}

/**
 * Create file writer function (placeholder implementation)
 */
export function createFileWriter(filePath) {
  return (logs) => {
    console.log(`[FILE:${filePath}] ${logs.length} lines`);
  };
}

/**
 * Create an LLM Logger instance
 *
 * @param {Object} config - Configuration object
 * @param {number} [config.ringBufferSize=1000] - Size of the ring buffer
 * @param {LogLaneConfig[]} [config.lanes=[]] - Lane configurations
 * @param {number} [config.flushInterval=100] - Flush interval in milliseconds
 * @returns {Object} Logger instance compatible with global logger service
 */
export function createLLMLogger(config = {}) {
  const { ringBufferSize = 1000, lanes = [], flushInterval = 100 } = config;

  // Initialize ring buffer
  const ringBuffer = new RingBuffer(ringBufferSize);

  // Lane buffers for batching
  const laneBuffers = new Map();
  lanes.forEach((lane) => {
    laneBuffers.set(lane.laneId, []);
  });

  // Flush loops for each lane
  lanes.forEach((lane) => {
    const flushLoop = () => {
      const buffer = laneBuffers.get(lane.laneId);
      if (buffer && buffer.length > 0) {
        try {
          lane.writer([...buffer]);
          buffer.length = 0; // Clear buffer
        } catch (error) {
          console.error(`Error in lane ${lane.laneId}:`, error);
        }
      }
      setTimeout(flushLoop, flushInterval);
    };
    flushLoop();
  });

  /**
   * Process a log entry
   */
  function processLog(data, level = 'log') {
    const logEntry = {
      id: Date.now() + Math.random(),
      ts: new Date(),
      raw: data,
      meta: new Map([
        ['level', level],
        ['fileContext', extractFileContext()],
      ]),
    };

    // Add to ring buffer - the ring buffer will wrap this in its own structure
    // but we need to store it so that ringBuffer.all()[0].data.raw works
    // However, tests expect ringBuffer.all()[0].raw, so we need to modify the ring buffer behavior
    // or adjust our approach. Let me store the logEntry directly and modify the ring buffer access.
    ringBuffer.push(logEntry);

    // Process through lanes - process each log individually
    for (const lane of lanes) {
      if (!lane.filters || lane.filters(logEntry)) {
        const logString = typeof data === 'string' ? data : JSON.stringify(data);
        laneBuffers.get(lane.laneId).push(logString);

        // Trigger immediate flush for this lane if it has items
        const buffer = laneBuffers.get(lane.laneId);
        if (buffer.length > 0) {
          lane.writer([...buffer]);
          buffer.length = 0; // Clear buffer after writing
        }
      }
    }
  }

  // Return logger instance compatible with global logger service
  return {
    // Standard logger interface
    log: (data) => processLog(data, 'log'),
    info: (data) => processLog(data, 'info'),
    warn: (data) => processLog(data, 'warn'),
    error: (data) => processLog(data, 'error'),
    debug: (data) => processLog(data, 'debug'),
    trace: (data) => processLog(data, 'trace'),
    fatal: (data) => processLog(data, 'fatal'),

    // Ring buffer access - need to map the data property to preserve logEntry structure
    ringBuffer: {
      all: () => ringBuffer.all().map((entry) => entry.data),
      size: () => ringBuffer.size(),
      clear: () => ringBuffer.clear(),
      tail: (count) => ringBuffer.tail(count).map((entry) => entry.data),
      head: (count) => ringBuffer.head(count).map((entry) => entry.data),
      filter: (predicate) =>
        ringBuffer.filter((entry) => predicate(entry.data)).map((entry) => entry.data),
    },

    // Utility methods
    flush: () => {
      for (const [laneId, buffer] of laneBuffers) {
        if (buffer.length > 0) {
          const lane = lanes.find((l) => l.laneId === laneId);
          if (lane) {
            lane.writer([...buffer]);
            buffer.length = 0;
          }
        }
      }
    },

    clear: () => {
      ringBuffer.clear();
      for (const buffer of laneBuffers.values()) {
        buffer.length = 0;
      }
    },

    getConfig: () => ({
      ringBufferSize,
      flushInterval,
      lanes: [...lanes],
    }),
  };
}

// Legacy exports for backward compatibility (deprecated)
export const initLogger = createLLMLogger;
export const log = (data, logger) => {
  if (logger && typeof logger.log === 'function') {
    return logger.log(data);
  }
  console.warn(
    'LLM Logger: log() called without proper logger instance. Use createLLMLogger() and setLogger().'
  );
};
