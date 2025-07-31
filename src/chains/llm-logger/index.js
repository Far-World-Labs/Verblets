/**
 * LLM Enhanced Logger - Transparent Proxy for Structured Logging
 *
 * Features:
 * - Drop-in replacement for existing structured loggers
 * - Preserves all original log properties
 * - AI enrichment through attachments merged into output
 * - Ring buffer with fully parallel batch processing
 * - NDJSON bulk processing for efficient LLM interaction
 * - Host logger integration for library internals
 */

import RingBuffer from '../../lib/ring-buffer/index.js';
import assert from '../../lib/assert/index.js';

/**
 * @typedef {Object} LogEntry
 * @property {string} id - Unique identifier for the log entry
 * @property {number} ts - Timestamp when the log was created
 * @property {*} raw - The original log data (any structure)
 * @property {Map} meta - Additional metadata
 * @property {Object} attachments - AI enrichments to merge with output
 * @property {Object} aiMeta - AI metadata (not output with structured logs)
 */

/**
 * @typedef {Object} LogLaneConfig
 * @property {string} laneId - Unique identifier for the lane
 * @property {Function} writer - Function to write logs (receives array of objects/strings)
 * @property {Function} [filters] - Optional filter function for log entries
 */

/**
 * @typedef {Object} LogProcessor
 * @property {string} processorId - Unique identifier for the processor
 * @property {Function} process - Function to process NDJSON log batches
 * @property {number} [batchSize=10] - Batch size for processing
 * @property {string} [description] - Description for LLM context
 */

/**
 * @typedef {Object} BulkAdjustment
 * @property {string} logId - ID of the log to adjust
 * @property {Object} adjustments - Key-value pairs of paths to values
 * @property {Object} [aiMeta] - AI metadata adjustments
 */

/**
 * Extract file context information from the call stack
 * @param {number} stackOffset - Additional stack frames to skip (for wrapper functions)
 */
function extractFileContext(stackOffset = 0) {
  const stack = new Error().stack;
  const lines = stack.split('\n');

  // Stack frames to skip:
  // [0] "Error"
  // [1] at extractFileContext
  // [2] at processLog (which calls extractFileContext)
  // [3] at log/info/warn/error method (which calls processLog)
  // [4+stackOffset] at the actual caller
  const skipFrames = 4 + stackOffset;

  for (let i = skipFrames; i < lines.length; i++) {
    const line = lines[i];
    // Match both "at functionName (file:line:col)" and "at file:line:col"
    const match = line.match(/at .* \((.+):(\d+):\d+\)/) || line.match(/at (.+):(\d+):\d+/);
    if (match) {
      return {
        filePath: match[1],
        line: parseInt(match[2], 10),
      };
    }
  }

  return { filePath: 'unknown', line: 0 };
}

/**
 * Set value at JSON path (a.b.c syntax)
 */
function setAtPath(obj, path, value) {
  const parts = path.split('.');
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== 'object' || current[part] === null) {
      current[part] = {};
    }
    current = current[part];
  }

  current[parts[parts.length - 1]] = value;
}

/**
 * Get value at JSON path (a.b.c syntax)
 */
function getAtPath(obj, path) {
  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (current == null || typeof current !== 'object' || !(part in current)) {
      return undefined;
    }
    current = current[part];
  }

  return current;
}

/**
 * Convert log entries to NDJSON format for bulk processing
 */
function logsToNDJSON(logs) {
  return logs
    .map((log) =>
      JSON.stringify({
        id: log.id,
        ts: log.ts,
        ...log.raw, // Spread original properties
        attachments: log.attachments,
      })
    )
    .join('\n');
}

/**
 * Create console writer function
 */
export function createConsoleWriter(prefix = '') {
  return (logs) => {
    logs.forEach((log) => {
      if (typeof log === 'string') {
        console.log(prefix + log);
      } else {
        console.log(prefix + JSON.stringify(log));
      }
    });
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
 * Create host logger integration - allows library to use external logger
 */
export function createHostLoggerIntegration(hostLogger) {
  return {
    log: (data) => {
      if (typeof hostLogger.log === 'function') {
        return hostLogger.log(data);
      } else if (typeof hostLogger === 'function') {
        return hostLogger(data);
      }
    },
    info: (data) => {
      if (typeof hostLogger.info === 'function') {
        return hostLogger.info(data);
      } else if (typeof hostLogger.log === 'function') {
        return hostLogger.log(data);
      } else if (typeof hostLogger === 'function') {
        return hostLogger(data);
      }
    },
    warn: (data) => {
      if (typeof hostLogger.warn === 'function') {
        return hostLogger.warn(data);
      } else if (typeof hostLogger.log === 'function') {
        return hostLogger.log(data);
      } else if (typeof hostLogger === 'function') {
        return hostLogger(data);
      }
    },
    error: (data) => {
      if (typeof hostLogger.error === 'function') {
        return hostLogger.error(data);
      } else if (typeof hostLogger.log === 'function') {
        return hostLogger.log(data);
      } else if (typeof hostLogger === 'function') {
        return hostLogger(data);
      }
    },
    debug: (data) => {
      if (typeof hostLogger.debug === 'function') {
        return hostLogger.debug(data);
      } else if (typeof hostLogger.log === 'function') {
        return hostLogger.log(data);
      } else if (typeof hostLogger === 'function') {
        return hostLogger(data);
      }
    },
    trace: (data) => {
      if (typeof hostLogger.trace === 'function') {
        return hostLogger.trace(data);
      } else if (typeof hostLogger.log === 'function') {
        return hostLogger.log(data);
      } else if (typeof hostLogger === 'function') {
        return hostLogger(data);
      }
    },
    fatal: (data) => {
      if (typeof hostLogger.fatal === 'function') {
        return hostLogger.fatal(data);
      } else if (typeof hostLogger.error === 'function') {
        return hostLogger.error(data);
      } else if (typeof hostLogger.log === 'function') {
        return hostLogger.log(data);
      } else if (typeof hostLogger === 'function') {
        return hostLogger(data);
      }
    },
  };
}

/**
 * Create an Enhanced LLM Logger instance
 *
 * @param {Object} config - Configuration object
 * @param {number} [config.ringBufferSize=5000] - Size of the ring buffer
 * @param {LogLaneConfig[]} [config.lanes=[]] - Lane configurations
 * @param {LogProcessor[]} [config.processors=[]] - Log processors for enhancement
 * @param {number} [config.flushInterval=1000] - Flush interval in milliseconds
 * @param {boolean} [config.immediateFlush=false] - Whether to flush immediately
 * @param {Object} [config.hostLogger] - Host logger for library internals
 * @returns {Object} Enhanced logger instance
 */
export function createLLMLogger(config = {}) {
  const {
    ringBufferSize = 5000,
    lanes = [],
    processors = [],
    flushInterval = 1000,
    immediateFlush = false,
    hostLogger = null,
  } = config;

  // Initialize ring buffer
  const ringBuffer = new RingBuffer(ringBufferSize);

  // Keep track of all log entries for legacy API compatibility
  const allLogs = [];

  // Host logger integration for internal logging
  const internalLogger = hostLogger ? createHostLoggerIntegration(hostLogger) : null;

  // Lane buffers for batching
  const laneBuffers = new Map();

  lanes.forEach((lane) => {
    assert(typeof lane.laneId !== 'undefined', 'Each lane must have an laneId property').toBe(true);
    laneBuffers.set(lane.laneId, []);
  });

  // Processor state tracking - just track latest processed offsets
  const processorOffsets = new Map();
  const processorReaders = new Map();

  // Register processors and start parallel processing
  processors.forEach((processor) => {
    const readerId = ringBuffer.registerReader();
    processorReaders.set(processor.processorId, readerId);
    processorOffsets.set(processor.processorId, -1);

    const batchSize = processor.batchSize || 10;

    // Fully parallel processing loop - no coordination
    const processLoop = async () => {
      try {
        const batch = await ringBuffer.readBatch(readerId, batchSize, processor.batchTimeout);

        // Convert to NDJSON for LLM processing
        const ndjsonData = logsToNDJSON(batch.data);

        // Create context comment for LLM
        const contextComment = `# Log Processing Context
# Processor: ${processor.processorId} (${processor.description || 'No description'})
# Batch size: ${batch.data.length} logs
# Task: Analyze the following NDJSON log entries and return bulk adjustments
# 
# Expected response format (array of BulkAdjustment objects):
# [
#   {
#     "logId": "log-id-here",
#     "adjustments": {
#       "path.to.field": "value",
#       "another.path": { "nested": "object" }
#     },
#     "aiMeta": {
#       "skip": false,
#       "confidence": 0.95
#     }
#   }
# ]
#
# NDJSON Log Data:
`;

        const fullInput = contextComment + ndjsonData;

        // Process the batch and get bulk adjustments
        const bulkAdjustments = await processor.process(fullInput);

        // Apply adjustments in processor order (index determines priority)
        if (Array.isArray(bulkAdjustments)) {
          for (const adjustment of bulkAdjustments) {
            const logIndex = allLogs.findIndex((log) => log.id === adjustment.logId);
            if (logIndex !== -1) {
              const logEntry = allLogs[logIndex];

              // Apply regular adjustments to attachments
              if (adjustment.adjustments) {
                for (const [path, value] of Object.entries(adjustment.adjustments)) {
                  setAtPath(logEntry.attachments, path, value);
                }
              }

              // Apply AI metadata (last write wins per processor order)
              if (adjustment.aiMeta) {
                if (!logEntry.aiMeta) {
                  logEntry.aiMeta = {};
                }
                Object.assign(logEntry.aiMeta, adjustment.aiMeta);
              }
            }
          }
        }

        // Update processed offset
        processorOffsets.set(processor.processorId, batch.lastOffset);

        // Continue processing immediately (fully parallel)
        setTimeout(processLoop, 0);
      } catch (error) {
        if (internalLogger) {
          internalLogger.error(`Processor ${processor.processorId} error: ${error.message}`);
        }
        setTimeout(processLoop, 1000); // Retry after delay
      }
    };

    // Start processing loop
    processLoop();
  });

  // Flush function that can be called immediately or on timer
  const flushLanes = () => {
    for (const [laneId, buffer] of laneBuffers) {
      if (buffer.length > 0) {
        const lane = lanes.find((l) => l.laneId === laneId);
        if (lane) {
          // Filter out logs marked for skipping
          const logsToWrite = buffer.filter((logData) => {
            return !logData.aiMeta?.skip;
          });

          if (logsToWrite.length > 0) {
            lane.writer(logsToWrite);
          }
          buffer.length = 0;
        }
      }
    }
  };

  // Flush loops for each lane (only if not immediate flush mode)
  if (!immediateFlush) {
    lanes.forEach((_lane) => {
      const flushLoop = () => {
        flushLanes();
        setTimeout(flushLoop, flushInterval);
      };
      flushLoop();
    });
  }

  /**
   * Process a log entry - accepts any structured data
   * @param {*} data - The data to log
   * @param {string} level - Log level
   * @param {number} stackOffset - Additional stack frames to skip
   */
  function processLog(data, level = 'log', stackOffset = 0) {
    const fileContext = extractFileContext(stackOffset);
    const logEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ts: new Date(),
      raw: data, // Store original data as-is (any structure)
      meta: new Map([
        ['level', level],
        ['fileContext', fileContext],
      ]),
      attachments: {}, // AI enrichments to merge
      aiMeta: {}, // AI metadata (not included in output)
    };

    // Add to ring buffer
    ringBuffer.write(logEntry);

    // Also add to our legacy array for compatibility
    allLogs.push(logEntry);

    // Keep only the last ringBufferSize entries
    if (allLogs.length > ringBufferSize) {
      allLogs.shift();
    }

    // Process through lanes
    for (const lane of lanes) {
      if (!lane.filters || lane.filters(logEntry)) {
        let outputData;

        // Handle different data types appropriately
        if (data === null || data === undefined) {
          // Handle null/undefined
          outputData = {
            data,
            id: logEntry.id,
            ts: logEntry.ts,
            level,
            ...logEntry.attachments,
          };
        } else if (
          typeof data === 'string' ||
          typeof data === 'number' ||
          typeof data === 'boolean'
        ) {
          // Handle primitives - wrap in data property
          outputData = {
            data,
            id: logEntry.id,
            ts: logEntry.ts,
            level,
            ...logEntry.attachments,
          };
        } else if (typeof data === 'object' && data !== null) {
          // Handle objects - merge properties
          outputData = {
            ...data, // Spread all original properties
            ...logEntry.attachments, // Merge AI enrichments
            // Add internal metadata only if not already present
            ...(data.id ? {} : { id: logEntry.id }),
            ...(data.ts ? {} : { ts: logEntry.ts }),
            ...(data.level ? {} : { level }),
            // Add file context
            ...(data.file ? {} : { file: fileContext.filePath }),
            ...(data.line ? {} : { line: fileContext.line }),
          };
        } else {
          // Fallback for other types
          outputData = {
            data,
            id: logEntry.id,
            ts: logEntry.ts,
            level,
            ...logEntry.attachments,
          };
        }

        // Add aiMeta for filtering but don't include in final output
        outputData.aiMeta = logEntry.aiMeta;

        laneBuffers.get(lane.laneId).push(outputData);
      }
    }

    // Immediate flush if enabled
    if (immediateFlush) {
      flushLanes();
    }

    // Log to host logger if configured
    if (internalLogger) {
      const logMessage = `LLM Logger processed: ${JSON.stringify(data)}`;
      switch (level) {
        case 'error':
          internalLogger.error(logMessage);
          break;
        case 'warn':
          internalLogger.warn(logMessage);
          break;
        case 'info':
          internalLogger.info(logMessage);
          break;
        case 'debug':
          internalLogger.debug(logMessage);
          break;
        case 'trace':
          internalLogger.trace(logMessage);
          break;
        case 'fatal':
          internalLogger.fatal(logMessage);
          break;
        default:
          internalLogger.log(logMessage);
      }
    }
  }

  // Return enhanced logger instance
  return {
    // Standard logger interface - accepts any structured data
    log: (data, stackOffset = 0) => processLog(data, 'log', stackOffset),
    info: (data, stackOffset = 0) => processLog(data, 'info', stackOffset),
    warn: (data, stackOffset = 0) => processLog(data, 'warn', stackOffset),
    error: (data, stackOffset = 0) => processLog(data, 'error', stackOffset),
    debug: (data, stackOffset = 0) => processLog(data, 'debug', stackOffset),
    trace: (data, stackOffset = 0) => processLog(data, 'trace', stackOffset),
    fatal: (data, stackOffset = 0) => processLog(data, 'fatal', stackOffset),

    // Enhanced attachment API
    attachToLog: (logId, path, value) => {
      const logIndex = allLogs.findIndex((log) => log.id === logId);
      if (logIndex !== -1) {
        setAtPath(allLogs[logIndex].attachments, path, value);
        return true;
      }
      return false;
    },

    getLogAttachment: (logId, path) => {
      const log = allLogs.find((log) => log.id === logId);
      return log ? getAtPath(log.attachments, path) : undefined;
    },

    markLogSkippable: (logId, skip = true) => {
      const logIndex = allLogs.findIndex((log) => log.id === logId);
      if (logIndex !== -1) {
        allLogs[logIndex].aiMeta.skip = skip;
        return true;
      }
      return false;
    },

    // Ring buffer access - legacy API compatibility
    ringBuffer: {
      all: () => [...allLogs],
      size: () => allLogs.length,
      clear: () => {
        allLogs.length = 0;
        ringBuffer.clear();
      },
      tail: (count) => allLogs.slice(-count),
      head: (count) => allLogs.slice(0, count),
      filter: (predicate) => allLogs.filter(predicate),
    },

    // Processor status
    getProcessorOffsets: () => new Map(processorOffsets),

    // Host logger integration
    setHostLogger: (newHostLogger) => {
      config.hostLogger = newHostLogger;
      return createHostLoggerIntegration(newHostLogger);
    },

    // Utility methods
    flush: () => {
      flushLanes();
    },

    clear: () => {
      allLogs.length = 0;
      ringBuffer.clear();
      for (const buffer of laneBuffers.values()) {
        buffer.length = 0;
      }
    },

    getConfig: () => ({
      ringBufferSize,
      flushInterval,
      lanes: [...lanes],
      processors: [...processors],
      hostLogger: !!config.hostLogger,
    }),

    getStats: () => ({
      ...ringBuffer.getStats(),
      processorOffsets: Object.fromEntries(processorOffsets),
      processors: processors.map((p) => ({
        id: p.processorId,
        processedOffset: processorOffsets.get(p.processorId),
      })),
    }),

    // Wait for all processors to catch up to current write position
    waitForProcessing: async (timeoutMs = 30000) => {
      const startTime = Date.now();
      const stats = ringBuffer.getStats();
      const currentWriteOffset = stats.writeOffset;

      // If no logs written yet, nothing to wait for
      if (currentWriteOffset === 0) {
        return;
      }

      // First, flush any pending writes to lanes
      flushLanes();

      // For each processor, check if they have pending data to process
      const processorHasPendingData = (processorId, lastProcessedOffset) => {
        // Check if there's unprocessed data
        const nextOffset = lastProcessedOffset + 1;
        return nextOffset < currentWriteOffset;
      };

      // Poll until all processors have caught up or timeout
      while (Date.now() - startTime < timeoutMs) {
        let allCaughtUp = true;

        for (const [processorId, currentOffset] of processorOffsets) {
          // Check if processor has pending data
          if (processorHasPendingData(processorId, currentOffset)) {
            // Processor hasn't processed all available data yet
            allCaughtUp = false;
            break;
          }
        }

        if (allCaughtUp) {
          // All processors have processed all available data
          // Give a bit more time for final lane writes
          await new Promise((resolve) => setTimeout(resolve, 200));
          flushLanes(); // Final flush
          return;
        }

        // Wait a bit before checking again
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Log warning if timeout reached
      if (internalLogger) {
        const laggingProcessors = [];
        for (const [processorId, currentOffset] of processorOffsets) {
          if (processorHasPendingData(processorId, currentOffset)) {
            const pending = currentWriteOffset - currentOffset - 1;
            laggingProcessors.push(`${processorId} (${pending} logs pending)`);
          }
        }
        internalLogger.warn(
          `waitForProcessing timeout after ${timeoutMs}ms. Lagging processors: ${laggingProcessors.join(
            ', '
          )}`
        );
      }
    },
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
