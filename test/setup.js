import { afterAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import RingBuffer from '../src/lib/ring-buffer/index.js';
import { createLogger, createRingBufferStream } from '../src/lib/logger/index.js';
import analyzeTestError from '../src/chains/test-analyzer/index.js';
import { extractCodeWindow } from '../src/lib/code-extractor/index.js';
import { getConfig } from './lib/config.js';
import { createLogHelpers } from './lib/events.js';
import { parseTestLogs } from './lib/log-parser.js';
import { installVitestHooks } from './lib/vitest-hooks.js';
import { writeInitialSeparator, displayTestFailure } from './lib/output-utils.js';
import { getConfigOrExit } from './lib/common/config.js';
import { createNullLogger, createNoOpHelpers } from './lib/common/null-loggers.js';

// Check if debug mode is enabled
const config = getConfigOrExit();

let logSuiteStart, logTestStart, logTestComplete, logAssertion, logAIValidation, logger;

if (!config) {
  // Use no-op functions when debug mode is disabled
  const noOpHelpers = createNoOpHelpers();
  logSuiteStart = noOpHelpers.logSuiteStart;
  logTestStart = noOpHelpers.logTestStart;
  logTestComplete = noOpHelpers.logTestComplete;
  logAssertion = noOpHelpers.logAssertion;
  logAIValidation = noOpHelpers.logAIValidation;
  
  logger = createNullLogger();
  globalThis.testLogger = logger;
} else {
  // Build test system components directly at top level
  const stateFile = process.env.VERBLETS_TEST_STATE_FILE;
  if (!stateFile || !existsSync(stateFile)) {
    throw new Error('Test state file not found. Make sure globalSetup is configured.');
  }
  const state = JSON.parse(readFileSync(stateFile, 'utf8'));
  
  const fullConfig = getConfig();
  const ringBuffer = new RingBuffer(fullConfig.ringBufferSize);
  
  logger = createLogger({
    streams: [createRingBufferStream(ringBuffer)],
    includeFileContext: true,
  });
  
  // Simple analysis loop
  const reader = ringBuffer.reader();
  
  async function processLogs() {
    while (true) {
      const result = await reader.read(100, { timeout: 500 });
      const logs = result.data || [];
      
      if (logs.length === 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }
      
      // Check current batch for suite completion
      const suiteCompleteLog = logs.find(log => log.event === 'test-suite-complete');
      
      if (!suiteCompleteLog || !fullConfig.modes.debugSuiteFirst) continue;
      
      // Get all logs from ring buffer and reduce over them
      const lookbackResult = ringBuffer.lookback(ringBuffer.latest(), ringBuffer.maxSize);
      const allLogs = lookbackResult.data;
      
      // Parse logs to extract test results and stats
      const { firstFailedAssertion, totalTests, passedTests, avgDuration } = parseTestLogs(allLogs);
      
      if (!firstFailedAssertion) {
        if (globalThis.suiteAnalysisResolver) {
          globalThis.suiteAnalysisResolver();
          globalThis.suiteAnalysisResolver = null;
        }
        return;
      }
      
      try {
        const analysis = await analyzeTestError({
          testName: firstFailedAssertion.testName,
          testFile: firstFailedAssertion.fileName,
          testLine: firstFailedAssertion.lineNumber,
          logs: [firstFailedAssertion],
          failureDetails: firstFailedAssertion,
        });
        
        const codeSnippet = firstFailedAssertion.fileName && firstFailedAssertion.lineNumber 
          ? extractCodeWindow(firstFailedAssertion.fileName, firstFailedAssertion.lineNumber, 5)
          : null;
        
        displayTestFailure(
          { suiteName: suiteCompleteLog.suite, passedTests, totalTests, avgDuration },
          { testName: firstFailedAssertion.testName, fileLocation: firstFailedAssertion.fileLocation },
          analysis,
          codeSnippet
        );
      } catch (error) {
        console.error('AI analysis failed:', error.message);
      }
      
      if (globalThis.suiteAnalysisResolver) {
        globalThis.suiteAnalysisResolver();
        globalThis.suiteAnalysisResolver = null;
      }
      return;
    }
  }
  
  processLogs();
  
  const helpers = createLogHelpers(logger);
  
  // Extract individual helpers
  logSuiteStart = helpers.logSuiteStart;
  logTestStart = helpers.logTestStart;
  logTestComplete = helpers.logTestComplete;
  logAssertion = helpers.logAssertion;
  logAIValidation = helpers.logAIValidation;

  // Setup global state and cleanup
  writeInitialSeparator();
  globalThis.testLogger = logger;
  installVitestHooks(logger);
  afterAll(() => {
    // Simple cleanup - no complex cross-worker coordination needed
  });
}

// Export log helpers
export {
  logSuiteStart,
  logTestStart,
  logTestComplete,
  logAssertion,
  logAIValidation,
  logger
};