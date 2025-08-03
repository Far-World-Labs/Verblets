/**
 * Test system configuration
 */

export function getConfig() {
  // Check if any debug mode is enabled
  const debugModeEnabled = process.env.VERBLETS_DEBUG_SUITE_FIRST === '1' ||
                          process.env.VERBLETS_DEBUG_RUNS === '1' ||
                          process.env.VERBLETS_DEBUG_STREAM === '1' ||
                          process.env.VERBLETS_DEBUG_LOGS === '1';

  return {
    enabled: debugModeEnabled,
    ringBufferSize: 10_000,
    
    batch: {
      size: 10,
      timeout: 100,
    },
    
    modes: {
      debugSuiteFirst: process.env.VERBLETS_DEBUG_SUITE_FIRST === '1',
      debugRuns: process.env.VERBLETS_DEBUG_RUNS === '1',
      debugStream: process.env.VERBLETS_DEBUG_STREAM === '1',
      analysisSilent: process.env.VERBLETS_ANALYSIS_SILENT === '1',
      debugLogs: process.env.VERBLETS_DEBUG_LOGS === '1',
    },
    
    ai: {
      analysisTimeout: parseInt(process.env.VERBLETS_AI_TIMEOUT, 10) || 120000, // 120 seconds
    },
  };
}