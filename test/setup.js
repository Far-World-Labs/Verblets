import { beforeAll, afterAll } from 'vitest';
import { createLLMLogger } from '../src/chains/llm-logger/index.js';
import chatGPT from '../src/lib/chatgpt/index.js';
import analyzeTestError from '../src/chains/test-analyzer/index.js';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  logger: {
    ringBufferSize: 10000,
    flushInterval: 2000,
    immediateFlush: false,
    batchTimeout: 2000,
  },
  ai: {
    enableErrorAnalysis: true,
    maxErrorsToAnalyze: 1,
  },
  output: {
    showProgressDuringTests: true,
    columnWidth: 60,
  },
};

// ============================================================================
// GLOBAL STATE
// ============================================================================

let logger;
const globalTestMap = new Map();
let globalCurrentSuite = undefined;

// ============================================================================
// LOGGING HELPER FUNCTIONS
// ============================================================================

/**
 * Log test suite start
 */
export function logSuiteStart(suiteName, filePath) {
  if (!logger) return;
  logger.info({
    event: 'test-suite-start',
    suite: suiteName,
    filePath,
  }, 1); // stackOffset=1 to get the caller's location
}

/**
 * Log test start
 */
export function logTestStart(testName, testIndex, fileName) {
  if (!logger) return;
  logger.info({
    event: 'test-start',
    testName,
    testIndex,
    fileName,
  }, 1); // stackOffset=1 to get the caller's location
}

/**
 * Log test completion
 */
export function logTestComplete(testIndex, state, duration) {
  if (!logger) return;
  logger.info({
    event: 'test-complete',
    testIndex,
    state,
    duration,
  }, 1); // stackOffset=1 to get the caller's location
}

/**
 * Log test assertion
 */
export function logAssertion(testIndex, description, expected, actual, passed) {
  if (!logger) return;
  logger.info({
    event: 'assertion',
    testIndex,
    description,
    expected,
    actual,
    passed,
  }, 1); // stackOffset=1 to get the caller's location
}

/**
 * Log AI validation result
 */
export function logAIValidation(testIndex, validationType, passed, duration) {
  if (!logger) return;
  logger.info({
    event: 'ai-validation',
    testIndex,
    validation: validationType,
    passed,
    duration,
  }, 1); // stackOffset=1 to get the caller's location
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get terminal width using various methods
 */
function getTerminalWidth() {
  // Use process.stdout.columns first - most reliable
  if (process.stdout.columns && process.stdout.columns > 0) {
    return process.stdout.columns;
  }
  
  // Default fallback - no stty attempts to avoid /dev/tty errors
  return 76;
}

/**
 * Extract source code context from a file
 */
function getSourceContext(filePath, lineNumber, contextLines = 3) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const start = Math.max(0, lineNumber - contextLines - 1);
    const end = Math.min(lines.length, lineNumber + contextLines);
    
    return lines.slice(start, end)
      .map((line, i) => `${start + i + 1}: ${line}`)
      .join('\n');
  } catch (e) {
    return undefined;
  }
}

/**
 * Extract test code snippet with arrow pointing to failed line
 */
function getTestSnippetWithArrow(filePath, lineNumber, contextLines = 2) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const start = Math.max(0, lineNumber - contextLines - 1);
    const end = Math.min(lines.length, lineNumber + contextLines);
    
    return lines.slice(start, end)
      .map((line, i) => {
        const currentLine = start + i + 1;
        const lineNum = currentLine.toString().padStart(4);
        const arrow = currentLine === lineNumber ? ' → ' : '   ';
        return `${lineNum}${arrow}${line}`;
      })
      .join('\n');
  } catch (e) {
    return undefined;
  }
}

/**
 * Format test name for consistent column output
 */
function formatTestName(name, maxWidth = CONFIG.output.columnWidth) {
  if (name.length <= maxWidth) {
    return name.padEnd(maxWidth);
  }
  return name.substring(0, maxWidth - 3) + '...';
}

/**
 * Format duration with appropriate units
 */
function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// ============================================================================
// AI ANALYSIS FUNCTIONS
// ============================================================================

/**
 * Analyze test error using AI
 */
async function analyzeError(test) {
  let output = '';
  
  // Test name
  output += `\n│ * ${test.name}\n`;
  
  // Show the comparison first
  if (test.failureLog) {
    const expected = test.failureLog.expected;
    const actual = test.failureLog.result !== undefined ? test.failureLog.result : test.failureLog.actual;
    
    const expectedStr = JSON.stringify(expected);
    const actualStr = JSON.stringify(actual);
    
    output += `│   Expected: ${expectedStr}\n`;
    output += `│   Actual:   ${actualStr}\n`;
  }
  
  // Show the inputs if available
  const boolLog = test.logs?.find(log => log.event === 'bool-result');
  const assertionLog = test.logs?.find(log => log.event === 'assertion');
  
  // For bool tests, we need to find the input text
  if (test.name && test.name.includes('?')) {
    output += `│\n`;
    output += `│   Input:\n`;
    output += `│     text: "${test.name}"\n`;
  }
  
  // Show the failing line with code
  // Try to get actual failing line from test
  const failingLine = test.failureLine || test.line;
  if (test.file && failingLine) {
    try {
      const content = readFileSync(test.file, 'utf8');
      const lines = content.split('\n');
      const codeLine = lines[failingLine - 1];
      
      if (codeLine && codeLine.trim()) {
        output += `│\n`;
        output += `│   ${test.file}:${failingLine}\n`;
        output += `│   ${codeLine.trim()}\n`;
      }
    } catch (e) {
      // Silent fail
    }
  }
  
  if (!CONFIG.ai.enableErrorAnalysis) {
    return output;
  }

  // Get source context for AI analysis
  const testSnippet = test.file && test.line ? 
    getTestSnippetWithArrow(test.file, test.line) : undefined;

  try {
    const analysis = await analyzeTestError({
      testName: test.name,
      testFile: test.file || 'unknown',
      testLine: test.line || 0,
      logs: test.logs || [],
      testSnippet,
      failureDetails: test.failureLog,
    });
    
    // Add concise AI analysis with line wrapping
    if (analysis && analysis.trim()) {
      const terminalWidth = getTerminalWidth();
      const maxLineWidth = terminalWidth - 7; // Account for "│   → " prefix
      const firstLine = analysis.trim().split('\n')[0];
      
      // Wrap long lines
      if (firstLine.length <= maxLineWidth) {
        output += `│\n│   → ${firstLine}\n`;
      } else {
        // Break into multiple lines
        output += `│\n`;
        const words = firstLine.split(' ');
        let currentLine = '│   → ';
        
        for (const word of words) {
          if (currentLine.length + word.length + 1 > terminalWidth) {
            output += currentLine + '\n';
            currentLine = '│     ' + word + ' ';
          } else {
            currentLine += word + ' ';
          }
        }
        
        if (currentLine.trim() !== '│') {
          output += currentLine.trimEnd() + '\n';
        }
      }
    }
    
    return output;
  } catch (error) {
    // Silent fallback
    return output;
  }
}

/**
 * Generate suite summary using AI
 */
async function generateSuiteSummary(suiteName, stats) {
  const { passed, failed, total, duration } = stats;
  
  // Format the summary line
  const status = failed === 0 ? '✓' : '✗';
  const suiteNameFormatted = formatTestName(suiteName + ' ' + status, 40);
  const statsStr = `${passed}/${total} passed`.padEnd(15);
  const durationStr = formatDuration(duration).padStart(8);
  
  return `│ ${suiteNameFormatted} ${statsStr} ${durationStr}`;
}

// ============================================================================
// TEST PROCESSOR
// ============================================================================

/**
 * Create processor for test analysis
 */
function createTestProcessor(state) {
  const processor = {
    processorId: 'test-analyzer',
    description: 'Analyzes test logs and generates AI summaries',
    batchSize: 10,
    batchTimeout: CONFIG.logger.batchTimeout,
    // Signal immediate processing when shutting down
    forceProcessPartialBatch: false,
    process: async (ndjsonData) => {
      try {
        // Parse NDJSON
        const lines = ndjsonData.split('\n');
        const dataStart = lines.findIndex(l => l.includes('# NDJSON Log Data:'));
        if (dataStart === -1) return [];
        
        const logs = lines.slice(dataStart + 1)
          .filter(l => l.trim())
          .map(l => {
            try { return JSON.parse(l); }
            catch (e) { return undefined; }
          })
          .filter(Boolean);
          
        
        // Process logs
        let suiteCompleteEvent = undefined;
        
        for (const log of logs) {
          if (log.event === 'test-suite-start') {
            state.currentSuite = log.suite;
            state.currentSuiteFile = log.filePath;
          } else if (log.event === 'test-suite-complete') {
            suiteCompleteEvent = log;
          } else if (log.event === 'suite-summary') {
            // Handle suite summary from reporter - output immediately
            const output = processSuiteSummarySimple(log);
            if (output) {
              process.stderr.write(output);
            }
          } else if (log.event === 'test-start') {
            const test = {
              index: log.testIndex,
              name: log.testName,
              file: log.file || log.fileName,
              line: log.line,
              suite: state.currentSuite,
              startTime: new Date(log.ts).getTime()
            };
            state.testMap.set(log.testIndex, test);
            
            // Don't output when test starts - keep output minimal
          } else if (log.event === 'test-complete') {
            const test = state.testMap.get(log.testIndex);
            if (test) {
              test.state = log.state;
              test.duration = log.duration;
              test.endTime = new Date(log.ts).getTime();
              
              // Don't output individual test results - keep output minimal
            }
          } else if (log.event === 'assertion' || log.event === 'bool-result' || 
                     log.event === 'ai-validation' || log.event === 'ai-expect-result') {
            const test = state.testMap.get(log.testIndex);
            if (test) {
              if (!test.logs) test.logs = [];
              test.logs.push(log);
              
              // Track failure details
              if (log.passed === false) {
                test.failed = true;
                test.failureLog = log;
                // Don't overwrite test file/line with logger's file/line
                if (!test.file && log.file) {
                  test.failureFile = log.file;
                }
                if (!test.line && log.line) {
                  test.failureLine = log.line;
                }
              }
            }
          }
        }
        
        // Process suite completion
        if (suiteCompleteEvent && suiteCompleteEvent.suite) {
          const completionPromise = processSuiteComplete(suiteCompleteEvent.suite, state.currentSuiteFile, state);
          
          // Track this completion
          state.pendingSuiteCompletions.add(completionPromise);
          completionPromise.finally(() => state.pendingSuiteCompletions.delete(completionPromise));
          
          await completionPromise;
        }
        
        // Don't show progress for incomplete suites - keep output minimal
        
        return [];
      } catch (error) {
        return [];
      }
    }
  };
  
  return processor;
}

// Create a state container for the test run
function createTestRunState() {
  return {
    testMap: new Map(),
    currentSuite: undefined,
    currentSuiteFile: undefined,
    pendingAnalyses: new Set(),
    pendingSuiteCompletions: new Set(),
  };
}

let testRunState = undefined;

/**
 * Process suite summary from reporter
 */
function processSuiteSummarySimple(log) {
  const { suite, passed, failed, total, duration, state } = log;
  const terminalWidth = getTerminalWidth();
  const separator = '─'.repeat(terminalWidth);
  
  // Skip Bool verblet - it has its own detailed output
  if (suite === 'Bool verblet') {
    return undefined;
  }
  
  if (state === 'pass' && failed === 0) {
    // For passing suites, just show one line
    const status = '✓';
    const suiteNameFormatted = formatTestName(suite + ' ' + status, 40);
    const statsStr = `${passed}/${total} passed`.padEnd(15);
    const durationStr = formatDuration(duration).padStart(8);
    
    return `\n│ ${suiteNameFormatted} ${statsStr} ${durationStr}\n${separator}\n`;
  } else if (failed > 0) {
    // For failing suites, show basic info without detailed errors
    const status = '✗';
    const suiteNameFormatted = formatTestName(suite + ' ' + status, 40);
    const statsStr = `${passed}/${total} passed`.padEnd(15);
    const durationStr = formatDuration(duration).padStart(8);
    
    return `\n│ ${suiteNameFormatted} ${statsStr} ${durationStr}\n│ ${failed} test(s) failed\n${separator}\n`;
  }
  
  return undefined;
}

/**
 * Process suite completion and generate summary
 */
async function processSuiteComplete(suiteName, suiteFile, state) {
  
  const suiteTests = Array.from(state.testMap.values())
    .filter(t => t.suite === suiteName);
  
  const completed = suiteTests.filter(t => t.endTime);
  const started = suiteTests.filter(t => t.startTime);
  const passed = completed.filter(t => t.state === 'pass');
  const failed = completed.filter(t => t.state === 'fail' || t.failed);
  const hung = started.filter(t => !t.endTime);
  
  // Calculate suite duration
  const startTime = Math.min(...started.map(t => t.startTime));
  const endTime = Math.max(...completed.map(t => t.endTime || t.startTime));
  const duration = endTime - startTime;
  
  // Get terminal width for separator
  const terminalWidth = getTerminalWidth();
  const separator = '─'.repeat(terminalWidth);
  
  // Build complete output for the suite
  let output = '';
  
  // If all tests passed, show minimal output
  if (failed.length === 0) {
    output += '\n';
    
    // Suite summary on one line
    const summary = await generateSuiteSummary(suiteName, {
      passed: passed.length,
      failed: failed.length,
      total: started.length,
      duration,
    });
    
    output += `${summary}\n`;
    output += `${separator}\n`;
  } else {
    // For failing tests, show full output
    output += '\n';
    
    // Suite summary
    const summary = await generateSuiteSummary(suiteName, {
      passed: passed.length,
      failed: failed.length,
      total: started.length,
      duration,
    });
    
    output += `${summary}\n`;
    
    // Show failed tests more compactly
    const terminalWidth = getTerminalWidth();
    const prefix = '│ Failed: ';
    const names = failed.map(t => t.name);
    
    let line = prefix;
    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      const separator = i === 0 ? '' : ', ';
      
      if (line.length + separator.length + name.length > terminalWidth - 2) {
        output += line + '\n';
        line = '│         ' + name;
      } else {
        line += separator + name;
      }
    }
    output += line + '\n';
    
    // Analyze errors and collect output
    if (CONFIG.ai.maxErrorsToAnalyze > 0) {
      const errorsToAnalyze = failed.slice(0, CONFIG.ai.maxErrorsToAnalyze);
      
      // Create analysis promises and track them
      const analysisPromises = errorsToAnalyze.map(async (error) => {
        return await analyzeError(error); // Return the formatted output
      });
      
      // Add promises to state tracking
      analysisPromises.forEach(p => {
        state.pendingAnalyses.add(p);
        p.finally(() => state.pendingAnalyses.delete(p));
      });
      
      // Wait for all analyses to complete and collect output
      const errorOutputs = await Promise.all(analysisPromises);
      errorOutputs.forEach(errorOutput => {
        if (errorOutput) {
          output += errorOutput;
        }
      });
    }
    
    // Add separator at the end
    output += `\n${separator}\n`;
  }
  
  // Output everything at once
  process.stderr.write(output);
}

// ============================================================================
// VITEST HOOKS
// ============================================================================

// Hook into vitest's global test state
let currentSuiteFile = '';
let suiteTestCount = 0;

// Override describe to capture suite information
const originalDescribe = globalThis.describe;
if (originalDescribe) {
  globalThis.describe = function(name, fn) {
    return originalDescribe(name, function() {
      // Get the current test file from the stack
      const stack = new Error().stack;
      const match = stack.match(/at\s+.*\s+\((.+\.examples\.js):\d+:\d+\)/);
      if (match) {
        currentSuiteFile = match[1];
      }
      
      // Log suite start
      if (logger) {
        logger.info({
          event: 'test-suite-start',
          suite: name,
          filePath: currentSuiteFile,
        });
      }
      
      // Track test count
      const originalIt = globalThis.it;
      suiteTestCount = 0;
      
      // Run the suite
      const result = fn.call(this);
      
      // Log suite complete after all tests are defined
      // Skip Bool verblet - it logs its own completion in afterAll
      if (name !== 'Bool verblet') {
        setTimeout(() => {
          if (logger) {
            logger.info({
              event: 'test-suite-complete',
              suite: name,
            });
          }
        }, 0);
      }
      
      return result;
    });
  };
  
  // Copy all properties from original describe
  Object.setPrototypeOf(globalThis.describe, originalDescribe);
  Object.keys(originalDescribe).forEach(key => {
    globalThis.describe[key] = originalDescribe[key];
  });
}

// Output summary on process exit
process.on('exit', () => {
  if (testRunState && testRunState.currentSuite && testRunState.testMap.size > 0) {
    const suiteTests = Array.from(testRunState.testMap.values()).filter(t => t.suite === testRunState.currentSuite);
    const completed = suiteTests.filter(t => t.endTime);
    const started = suiteTests.filter(t => t.startTime);
    const hung = started.filter(t => !t.endTime);
    
    if (hung.length > 0) {
      process.stderr.write(`\n[Process Exit] Suite: ${testRunState.currentSuite}\n`);
      process.stderr.write(`  Completed: ${completed.length}/${started.length}\n`);
      process.stderr.write(`  Hung: ${hung.map(t => t.name).join(', ')}\n`);
    }
  }
});

// Create logger immediately (not in beforeAll) so it's available when describe runs
// But only if we're in a test environment and not already created
if (typeof beforeAll !== 'undefined' && !globalThis.testLogger) {
  testRunState = createTestRunState();

  logger = createLLMLogger({
    ringBufferSize: CONFIG.logger.ringBufferSize,
    flushInterval: CONFIG.logger.flushInterval,
    immediateFlush: CONFIG.logger.immediateFlush,
    lanes: [{
      laneId: 'stderr',
      writer: (logs) => {
        // Lane for AI-processed output
        logs.forEach(log => {
          if (log.aiOutput) {
            process.stderr.write(log.aiOutput);
          }
        });
      }
    }],
    processors: [createTestProcessor(testRunState)]
  });

  globalThis.testLogger = logger;

  // Output initial separator only once
  if (!globalThis._setupInitialized) {
    const terminalWidth = getTerminalWidth();
    const separator = '─'.repeat(terminalWidth);
    process.stderr.write(`${separator}\n`);
    globalThis._setupInitialized = true;
  }

  logger.info({
    event: 'test-run-start',
    environment: process.env.NODE_ENV || 'test'
  });
}

// Only run cleanup once
let cleanupDone = false;

afterAll(async () => {
  if (logger && !cleanupDone) {
    cleanupDone = true;
    logger.info({
      event: 'test-run-complete'
    });
    
    // Flush and wait for processing to complete
    logger.flush();
    
    // Force batch completion by filling the current batch
    // This is cleaner than waiting for timeout
    const dummyEvents = 15; // More than batch size to ensure processing
    for (let i = 0; i < dummyEvents; i++) {
      logger.info({
        event: 'end-of-test-run',
        index: i,
      });
    }
    
    // Wait for processors to finish processing
    if (logger.waitForProcessing) {
      await logger.waitForProcessing(10000);
    }
    
    // Wait for any pending suite completions
    if (testRunState.pendingSuiteCompletions.size > 0) {
      await Promise.all(Array.from(testRunState.pendingSuiteCompletions));
    }
    
    // Wait for any pending AI analyses to complete
    if (testRunState.pendingAnalyses.size > 0) {
      await Promise.all(Array.from(testRunState.pendingAnalyses));
    }
    
    // Don't output here - let the reporter handle final output
  }
  
  // Don't delete the logger - other tests might still need it
});

export { logger };