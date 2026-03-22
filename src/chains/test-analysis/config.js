/**
 * Test system configuration
 */

import { get as configGet } from '../../lib/config/index.js';

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
  const aiLogsOnly = configGet('VERBLETS_AI_LOGS_ONLY') === true;
  const aiPerSuite = configGet('VERBLETS_AI_PER_SUITE') === true;
  const aiDetail = configGet('VERBLETS_AI_DETAIL') === true;
  const debugMode = configGet('VERBLETS_DEBUG') === true;
  const debugSuites = configGet('VERBLETS_DEBUG_SUITES') === true;

  return {
    // Core functionality flags
    aiMode: aiLogsOnly || aiPerSuite || aiDetail,
    aiModeDebug: aiLogsOnly || debugMode,
    aiModeAnalysis: (aiPerSuite || aiDetail) && !aiLogsOnly, // Analysis disabled in logs-only mode

    // Debug flags
    debug: {
      suites: debugSuites || debugMode,
    },

    // Buffer configuration
    ringBufferSize: configGet('VERBLETS_RING_BUFFER_SIZE'),

    // Polling configuration
    polling: {
      interval: configGet('VERBLETS_POLL_INTERVAL'),
      statusInterval: configGet('VERBLETS_STATUS_INTERVAL'),
    },

    // Batch processing
    batch: {
      size: configGet('VERBLETS_BATCH_SIZE'),
      drainSize: configGet('VERBLETS_DRAIN_SIZE'),
      lookbackSize: configGet('VERBLETS_LOOKBACK_SIZE'),
    },

    // AI analysis
    ai: {
      enabled: (aiPerSuite || aiDetail) && !aiLogsOnly,
      timeout: configGet('VERBLETS_AI_TIMEOUT'),
    },
  };
}
