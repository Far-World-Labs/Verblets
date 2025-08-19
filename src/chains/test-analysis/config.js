/**
 * Test system configuration
 */

import { truthyValues } from '../../constants/common.js';

// Shared constants
export const CONSTANTS = {
  REDIS_KEY_PREFIX: 'test:',
  POLL_INTERVAL_MS: 100,
  WAIT_STATUS_INTERVAL_MS: 10000,
  RING_BUFFER_DEFAULT_SIZE: 5000,
  BATCH_SIZE: 50,
  DRAIN_BATCH_SIZE: 100,
  LOOKBACK_SIZE: 5000,
};

export function getConfig() {
  const aiLogsOnly =
    process.env.VERBLETS_AI_LOGS_ONLY && truthyValues.includes(process.env.VERBLETS_AI_LOGS_ONLY);
  const aiPerSuite =
    process.env.VERBLETS_AI_PER_SUITE && truthyValues.includes(process.env.VERBLETS_AI_PER_SUITE);
  const debugMode = process.env.VERBLETS_DEBUG && truthyValues.includes(process.env.VERBLETS_DEBUG);
  const debugSuites =
    process.env.VERBLETS_DEBUG_SUITES && truthyValues.includes(process.env.VERBLETS_DEBUG_SUITES);

  return {
    // Core functionality flags
    aiMode: aiLogsOnly || aiPerSuite,
    aiModeDebug: aiLogsOnly || debugMode,
    aiModeAnalysis: aiPerSuite && !aiLogsOnly, // Analysis disabled in logs-only mode

    // Debug flags
    debug: {
      suites: debugSuites || debugMode,
    },

    // Buffer configuration
    ringBufferSize:
      parseInt(process.env.VERBLETS_RING_BUFFER_SIZE) || CONSTANTS.RING_BUFFER_DEFAULT_SIZE,

    // Polling configuration
    polling: {
      interval: parseInt(process.env.VERBLETS_POLL_INTERVAL) || CONSTANTS.POLL_INTERVAL_MS,
      statusInterval:
        parseInt(process.env.VERBLETS_STATUS_INTERVAL) || CONSTANTS.WAIT_STATUS_INTERVAL_MS,
    },

    // Batch processing
    batch: {
      size: parseInt(process.env.VERBLETS_BATCH_SIZE) || CONSTANTS.BATCH_SIZE,
      drainSize: parseInt(process.env.VERBLETS_DRAIN_SIZE) || CONSTANTS.DRAIN_BATCH_SIZE,
      lookbackSize: parseInt(process.env.VERBLETS_LOOKBACK_SIZE) || CONSTANTS.LOOKBACK_SIZE,
    },

    // AI analysis
    ai: {
      enabled: aiPerSuite && !aiLogsOnly,
      timeout: parseInt(process.env.VERBLETS_AI_TIMEOUT) || 120000,
    },
  };
}
