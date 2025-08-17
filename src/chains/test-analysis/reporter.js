/**
 * Test Analysis Reporter for Vitest
 *
 * ## Architecture Overview
 *
 * This reporter implements a distributed event collection system for Vitest tests running
 * in parallel across multiple worker processes. The system uses Redis as a shared medium
 * to collect test events from all workers and process them centrally.
 *
 * ## Parallel Test Execution Challenges
 *
 * Vitest runs test suites in parallel worker processes for performance. Each worker process
 * executes independently and terminates when its tests complete. This creates several
 * challenges for collecting comprehensive test data:
 *
 * - Test events are generated across multiple processes simultaneously
 * - Workers have no awareness of each other's state or progress
 * - Process termination can occur before events are fully processed
 * - Race conditions arise when multiple workers write to shared storage
 *
 * ## Event Collection Strategy
 *
 * ### Redis Ring Buffer
 *
 * The system uses a Redis-backed ring buffer as the central event store. This design was
 * chosen for several reasons:
 *
 * - Redis provides atomic operations necessary for concurrent access
 * - Ring buffer allows bounded memory usage with automatic old event eviction
 * - Multiple readers can consume events at different rates
 * - Events persist beyond individual process lifetimes
 *
 * ### Atomic Sequence Generation
 *
 * The most critical challenge was ensuring no events are lost during concurrent writes.
 * Initial implementations using Redis GET/SET operations for sequence tracking suffered
 * from race conditions where multiple workers could obtain the same sequence number.
 *
 * The solution uses Redis INCR for atomic sequence generation. Each write operation:
 * 1. Atomically increments the sequence counter to reserve a position
 * 2. Calculates the ring buffer position from the reserved sequence
 * 3. Writes data to the reserved position
 *
 * This guarantees each event gets a unique position even under high concurrency.
 *
 * ### Lookback vs Consumption
 *
 * The reporter uses two different reading strategies:
 *
 * - **Consumption**: During test execution, the reporter continuously consumes new events
 *   from the ring buffer. This moves the reader's offset forward and processes events
 *   as they arrive.
 *
 * - **Lookback**: When a suite completes, the reporter looks back through recent events
 *   to gather all data for that suite. Critically, lookback reads from the latest
 *   sequence position rather than the reader's consumption offset, ensuring all events
 *   are visible even if consumption hasn't caught up.
 *
 * ## Event Flow
 *
 * 1. **Initialization**: Reporter creates ring buffer and stores key in Redis
 * 2. **Worker Setup**: Each test worker connects to the same ring buffer
 * 3. **Test Execution**: Workers write events (test-start, expect, test-complete) to buffer
 * 4. **Event Processing**: Reporter polls buffer and processes events continuously
 * 5. **Suite Completion**: Reporter performs lookback to analyze suite results
 * 6. **Cleanup**: Reporter waits for pending work and cleans up Redis keys
 *
 * ## Design Decisions
 *
 * ### Event Loop Polling
 *
 * The reporter polls the ring buffer reader, which checks if new events have been written
 * beyond the reader's current offset. When new events are available, the reader retrieves
 * them from the Redis list that backs the ring buffer. This polling approach:
 *
 * - Provides consistent behavior across different Redis configurations
 * - Allows batched processing of multiple events per poll cycle
 * - Simplifies error handling and recovery
 * - Avoids complexity of Redis pub/sub or blocking reads
 *
 * The polling is not just checking a simple Redis key - it's comparing the reader's offset
 * against the buffer's sequence counter and fetching any new events that have been written
 * to the buffer's Redis list structure since the last poll.
 *
 * ### Suite-Level Analysis
 *
 * Analysis is triggered at suite completion rather than test completion because:
 * - Suite boundaries provide natural aggregation points
 * - Reduces analysis overhead by batching related tests
 * - Allows comprehensive view of test patterns within a suite
 * - Suite completion guarantees all tests have finished
 *
 * ### Synchronous Critical Path
 *
 * Test wrapper functions use async/await to ensure events are written to Redis before
 * proceeding. This prevents event loss if a test crashes or the process terminates
 * unexpectedly. While this adds minimal latency, the reliability gain is essential.
 */

import { getClient } from '../../services/redis/index.js';
import RedisRingBuffer from '../../lib/ring-buffer-redis/index.js';
import { getConfig, CONSTANTS } from './config.js';

// Constants
import { formatTestSummary, formatAnalysisOutput } from './output-utils.js';
import { aggregateFromLogs } from './aggregator.js';
import analyzeTestError from '../test-analyzer/index.js';
import { extractCodeWindow } from '../../lib/code-extractor/index.js';
import { FirstFailureProcessor } from './processors/first-failure-processor.js';
import { CompletionTrackingProcessor } from './processors/completion-tracking-processor.js';
import { DiagnosticProcessor } from './processors/diagnostic-processor.js';

// Pure helper functions
function shouldProcessEvents(config) {
  return config?.aiMode;
}

function isDebugMode(config) {
  return config?.aiModeDebug;
}

function shouldAnalyze(config) {
  return config?.aiModeAnalysis;
}

async function waitForPendingWork(pendingWork, label) {
  if (!pendingWork || pendingWork.length === 0) return;

  const config = getConfig();
  const interval = setInterval(() => {
    console.log(`[${label}] Waiting for ${pendingWork.length} analyses...`);
  }, config?.polling?.statusInterval || CONSTANTS.WAIT_STATUS_INTERVAL_MS);

  try {
    // Use allSettled to avoid hanging on failed promises
    await Promise.allSettled(pendingWork);
  } finally {
    clearInterval(interval);
  }
}

// Pure predicates
const isEvent = (event) => (log) => log.event === event;
const isTestComplete = isEvent('test-complete');

const hasState = (state) => (log) => log.state === state;
const isFailed = hasState('fail');

const isFailedTest = (log) => isTestComplete(log) && isFailed(log);

const inSuite = (suite) => (log) => log.suite === suite;
const forTest = (suite, index) => (log) => log.suite === suite && log.testIndex === index;

// Pure sorting functions
const byTestIndex = (a, b) => a.testIndex - b.testIndex;
const byTimestamp = (a, b) => new Date(a.timestamp) - new Date(b.timestamp);

function isWatchMode() {
  return process.env.VITEST_MODE === 'WATCH' || process.argv.includes('--watch');
}

export default class TestAnalysisReporter {
  constructor() {
    this.reader = undefined;
    this.redis = undefined;
    this.config = undefined;
    this.pendingAnalyses = [];
    this.failedCount = 0;
    this.pollInterval = undefined;
    this.currentRunId = null;
    this.processedSuites = new Set();
    this.seenSuites = new Set();

    // Stdin monitor removed - was interfering with Vitest's watch mode

    // === PROCESSORS START ===
    // Ring buffer processors that can be toggled via env flags
    this.processors = [];
    // === PROCESSORS END ===
  }

  // Vitest v3 lifecycle methods

  async onInit(vitest) {
    // Store vitest instance for debugging
    this.vitest = vitest;
    //
    // Reporter initialization - check if AI mode is enabled
    // onInit runs once per Vitest process start (main process)
    //
    const config = getConfig();

    if (!config?.aiMode) {
      return;
    }

    // Store config
    this.config = config;

    // Reset counters for each run
    this.pendingAnalyses = [];
    this.failedCount = 0;

    // Stdin monitor removed - was interfering with Vitest's watch mode input handling

    // Only initialize Redis and ring buffer on first run
    if (!this.redis) {
      // Create the ring buffer here in the reporter
      this.redis = await getClient();

      // Clean up any existing keys first
      const prefix = CONSTANTS.REDIS_KEY_PREFIX;
      const testKeys = [`${prefix}logs-key`, `${prefix}processor-active`];
      await this.redis.del(testKeys);

      // Create new ring buffer
      const ringBufferKey = `test-logs-${Date.now()}`;
      const ringBuffer = new RedisRingBuffer({
        key: ringBufferKey,
        redisClient: this.redis,
        maxSize: config.ringBufferSize,
      });

      // Initialize the ring buffer before storing the key
      await ringBuffer.initialize();

      // Store key for test workers to find
      await this.redis.set(`${CONSTANTS.REDIS_KEY_PREFIX}logs-key`, ringBufferKey);
      await this.redis.set(`${CONSTANTS.REDIS_KEY_PREFIX}processor-active`, 'true');

      //
      // Create reader and start event loop to consume test events
      //

      this.reader = await ringBuffer.createReader('reporter');
      this.startEventLoop();

      // === PROCESSORS START ===
      // Initialize processors
      await this.initializeProcessors(ringBuffer);
      // === PROCESSORS END ===
    }
  }

  async onTestRunStart(_specs) {
    //
    // Called at the beginning of every run & rerun in watch mode
    //
    const config = getConfig();
    if (!config?.aiMode || !this.reader) return;

    // === DEBUG: Keep these messages - very useful for debugging input errors ===
    // console.error('[REPORTER] Test run starting...');
    // === END DEBUG ===

    // Reset per-run counters
    this.pendingAnalyses = [];
    this.failedCount = 0;
    this.currentRunId = Date.now();
    this.processedSuites.clear();
    this.seenSuites.clear();

    // Mark run-start so lookbacks can slice to current run
    await this.reader.buffer.push({
      event: 'run-start',
      runId: this.currentRunId,
      timestamp: new Date().toISOString(),
      mode: isWatchMode() ? 'watch' : 'single',
    });
  }

  async onTestRunEnd(results, unhandledErrors, reason) {
    //
    // Called after all files for the run are done (replaces onFinished in v2)
    //
    const config = getConfig();

    // === DEBUG: Keep these messages - very useful for debugging input errors ===
    // console.error('[REPORTER] Test run ending, reason:', reason);
    // === END DEBUG ===

    // Early exit if not processing
    if (!shouldProcessEvents(config) || !this.reader) {
      return;
    }

    // Emit run-end and process remaining events
    await this.reader.buffer.push({
      event: 'run-end',
      timestamp: new Date().toISOString(),
      reason,
    });
    await this.processRemainingEvents();

    // Wait for all pending work (summaries and/or analyses)
    // Skip waiting in watch mode to avoid blocking reruns
    if (!isWatchMode()) {
      await waitForPendingWork(this.pendingAnalyses, 'Run End');
    }

    // Reset for next run
    this.pendingAnalyses = [];

    // Don't print anything extra at run end - processor handles it
  }

  // Pass through console logs to preserve test output
  onUserConsoleLog(log) {
    // Only write if it's actual test output, not stdin echo
    if (log.content && !log.content.includes('\x1b[')) {
      const stream = log.type === 'stdout' ? process.stdout : process.stderr;
      stream.write(log.content);
    }
  }

  // Watch mode lifecycle methods - needed for stdin to work
  onWatcherStart(files, errors) {
    // This is called when watch mode starts
    // Without this, Vitest might not set up stdin properly
    if (errors?.length) {
      console.error('Errors during watch mode start:', errors);
    }
  }

  onWatcherRerun(_files, _trigger) {
    // Called when tests are rerun in watch mode
    // Reset our state for the new run
    this._stdinDebugLogged = false;
  }

  // Event processing flow

  startEventLoop() {
    const config = getConfig();
    //
    // Poll ring buffer for new events at configured interval
    //
    this.pollInterval = setInterval(async () => {
      try {
        const logs = await this.reader.consume(config.batch.size);
        if (logs.length > 0) {
          //
          // Process consumed events from ring buffer
          //
          await this.handleEvents(logs);
        }
      } catch (error) {
        // Error handler can be configured if needed
        if (this.config?.onError) {
          this.config.onError(error);
        }
      }
    }, config.polling.interval);

    // CRITICAL: Unref so the interval doesn't block the event loop
    this.pollInterval.unref();
  }

  async handleEvents(logs) {
    const config = getConfig();

    for (const log of logs) {
      if (config.aiModeDebug) {
        console.log(JSON.stringify(log));
      }
      //
      // Route event to appropriate handler
      //
      await this.handleEvent(log);
    }
  }

  async handleEvent(log) {
    const handlers = {
      'test-start': this.handleTestStart.bind(this),
      'test-complete': this.handleTestComplete.bind(this),
      expect: this.handleExpectation.bind(this),
      'ai-expect': this.handleExpectation.bind(this),
      'suite-start': () => {}, // Just track it, don't double-handle
      'suite-end': this.handleSuiteEnd.bind(this),
      'run-end': this.handleRunEnd.bind(this),
    };

    const handler = handlers[log.event];
    if (handler) await handler(log);
  }

  async handleTestStart(_log) {}

  handleTestComplete(log) {
    if (log.state === 'fail') {
      this.failedCount = (this.failedCount || 0) + 1;
      // TODO: Implement error pattern analysis for failed tests
    }
  }

  async handleExpectation() {
    // Just let the log flow through the ring buffer
    // Analysis will query the buffer when needed
  }

  handleSuiteEnd(log) {
    const config = getConfig();

    // Debug mode shows raw logs only
    if (isDebugMode(config)) return;

    // Only process each suite once per run
    const suiteKey = `${this.currentRunId}-${log.suite}`;
    if (this.processedSuites.has(suiteKey)) return;
    this.processedSuites.add(suiteKey);

    // Always show suite summary, with or without analysis
    this.pendingAnalyses.push(this.runSuiteAnalysis(log));
  }

  async handleRunEnd() {
    const config = getConfig();
    if (shouldAnalyze(config)) {
      await waitForPendingWork(this.pendingAnalyses, 'Run End');
    }
  }

  // Analysis methods

  async runSuiteAnalysis(log) {
    const config = getConfig();

    // Get the latest sequence and lookback from there
    const latestSequence = await this.reader.buffer.getLatestSequence();
    const logs = await this.reader.lookback(config.batch.lookbackSize, latestSequence);

    // Filter logs to only include those from the current run
    // Find the most recent run-start or run-restart event
    const runStartIndex = logs.findLastIndex(
      (l) => l.event === 'run-start' || l.event === 'run-restart'
    );

    // Only use logs after the most recent run start
    const currentRunLogs = runStartIndex >= 0 ? logs.slice(runStartIndex + 1) : logs;

    const suites = aggregateFromLogs(currentRunLogs);
    const suiteData = suites.find((s) => s.name === log.suite);

    if (!suiteData) {
      // No data found, show empty suite completed
      console.log(formatTestSummary(log.suite, 0, 0, 0));
      return;
    }

    // Build summary but don't print yet
    const summary = formatTestSummary(
      suiteData.name,
      suiteData.passedCount,
      suiteData.testCount,
      suiteData.avgDuration
    );

    // Early exit if not analyzing
    if (!shouldAnalyze(config)) {
      // Don't print suite summaries in logs-only mode
      // Vitest already provides its own summary
      return;
    }

    // Find first failed test for analysis
    const firstFailed = currentRunLogs
      .filter((l) => isFailedTest(l) && inSuite(log.suite)(l))
      .sort(byTestIndex)[0];

    if (!firstFailed) {
      // All tests passed, just show summary
      console.log(summary);
      return;
    }

    // Get all logs for the failed test
    const testLogs = currentRunLogs
      .filter(forTest(log.suite, firstFailed.testIndex))
      .sort(byTimestamp);

    // Get test name from test-start event
    const testStart = testLogs.find((l) => l.event === 'test-start');
    const testName = testStart?.testName;

    // Get failure location from failed expect event
    const failedExpect = testLogs.find(
      (l) => (l.event === 'expect' || l.event === 'ai-expect') && l.passed === false
    );

    // Skip analysis if no failure location found
    if (!failedExpect || !failedExpect.file) {
      console.log(summary);
      return;
    }

    // Extract code snippet at failure location
    const codeSnippet = await extractCodeWindow(failedExpect.file, failedExpect.line, 5);

    // Get analysis before printing anything
    const analysis = await analyzeTestError(testLogs);

    // Now print everything atomically
    console.log(summary);

    if (analysis) {
      console.log(); // Empty line before analysis
      const formatted = formatAnalysisOutput(
        analysis,
        testName,
        failedExpect.file,
        failedExpect.line,
        codeSnippet
      );
      console.log(formatted);
      console.log(); // Empty line after analysis
    }
  }

  // Helper methods

  async processRemainingEvents() {
    const config = getConfig();
    let logs;
    while ((logs = await this.reader.consume(config.batch.drainSize)).length > 0) {
      await this.handleEvents(logs);
    }
  }

  stopEventLoop() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = undefined;
    }
  }

  // ===================================
  // === PROCESSOR METHODS START ===
  // ===================================

  async initializeProcessors(ringBuffer) {
    // Create and initialize processors based on env flags
    const processors = [
      new FirstFailureProcessor({ ringBuffer }),
      new CompletionTrackingProcessor({ ringBuffer }),
      new DiagnosticProcessor({ ringBuffer }),
      // Add more processors here as they're created
    ];

    // Initialize enabled processors
    for (const processor of processors) {
      if (processor.enabled) {
        await processor.initialize();
        this.processors.push(processor);
      }
    }
  }

  async shutdownProcessors() {
    await Promise.all(this.processors.map((p) => p.shutdown()));
  }

  // ===================================
  // === PROCESSOR METHODS END ===
  // ===================================
}
