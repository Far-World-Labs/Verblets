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
import { FirstFailureProcessor } from './processors/first-failure-processor.js';
import { CompletionTrackingProcessor } from './processors/completion-tracking-processor.js';
import { DiagnosticProcessor } from './processors/diagnostic-processor.js';
import SuiteDetectionProcessor from './processors/suite-detection-processor.js';
import { SuiteOutputProcessor } from './processors/suite-output-processor.js';
import { DetailsProcessor } from './processors/details-processor.js';
import { RunSeparatorProcessor } from './processors/run-separator-processor.js';

// Pure helper functions
function shouldProcessEvents(config) {
  return config?.aiMode;
}

function hasTestFilter() {
  const args = process.argv;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-t' || args[i] === '--testNamePattern') {
      return true;
    }
  }
  return false;
}

// Pure predicates

function isWatchMode() {
  // Vitest defaults to watch mode unless --run is specified
  // or when running in CI
  const hasRunFlag = process.argv.includes('--run');
  const isCI = process.env.CI === 'true';
  const hasWatchFlag = process.argv.includes('--watch');
  const vitestMode = process.env.VITEST_MODE === 'WATCH';

  // We're in watch mode if:
  // 1. Explicit --watch flag, OR
  // 2. VITEST_MODE is WATCH, OR
  // 3. No --run flag and not in CI (Vitest's default is watch)
  return hasWatchFlag || vitestMode || (!hasRunFlag && !isCI);
}

export default class TestAnalysisReporter {
  constructor() {
    this.reader = undefined;
    this.redis = undefined;
    this.config = undefined;
    this.currentRunId = null;
    this.lastEndedRunId = null;

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

    // Store current run ID for processors

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

      // Store reader for emitting events only
      this.reader = await ringBuffer.createReader('reporter');

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

    // Reset per-run state
    this.currentRunId = Date.now();

    // === DEBUG: Keep these messages - very useful for debugging input errors ===
    // console.error('[REPORTER] Test run starting, runId:', this.currentRunId, 'Watch mode:', isWatchMode());
    // === END DEBUG ===

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
    // console.error('[REPORTER] Test run ending, reason:', reason, 'runId:', this.currentRunId);
    // === END DEBUG ===

    // Prevent duplicate run-end events for the same run
    if (this.lastEndedRunId === this.currentRunId) {
      // console.error('[REPORTER] Duplicate run-end event, ignoring');
      return;
    }
    this.lastEndedRunId = this.currentRunId;

    // Early exit if not processing
    if (!shouldProcessEvents(config) || !this.reader) {
      return;
    }

    // Small delay to ensure all test events are written
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Now emit run-end event
    await this.reader.buffer.push({
      event: 'run-end',
      runId: this.currentRunId,
      timestamp: new Date().toISOString(),
      reason,
    });

    // Give processors a moment to consume the event
    // Use setTimeout(0) to avoid blocking the event loop
    await new Promise((resolve) => setTimeout(resolve, 0));

    // In non-watch mode, clean up to allow process to exit
    if (!isWatchMode()) {
      // Wait for processors to finish their work
      await this.waitForProcessorsToConsume();

      // Shutdown processors (stops their polling and waits for pending work)
      await this.shutdownProcessors();

      // Don't disconnect Redis - it's a shared singleton used by other parts of the app
      // Let it clean up naturally when the process exits
      this.reader = null;
    }
    // In watch mode, processors continue running for the next test run

    // Don't print anything extra at run end - processor handles it
  }

  // Pass through console logs to preserve test output
  // Commenting out to let Vitest handle all console output directly
  // onUserConsoleLog(log) {
  //   // Always pass through console logs to preserve test output and Vitest's UI
  //   if (log.content) {
  //     const stream = log.type === 'stdout' ? process.stdout : process.stderr;
  //     stream.write(log.content);
  //   }
  // }

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
    // console.error('[REPORTER] Watcher rerun triggered:', trigger);
    // Reset our state for the new run
    this._stdinDebugLogged = false;
    // Clear the last ended run ID to allow the next run-end
    this.lastEndedRunId = null;
  }

  // Helper methods

  // ===================================
  // === PROCESSOR METHODS START ===
  // ===================================

  async initializeProcessors(ringBuffer) {
    const isTestFilterMode = hasTestFilter();

    // Create processors - we'll decide which to enable based on mode
    const processors = [];

    // Always include these processors when in AI mode
    processors.push(new RunSeparatorProcessor({ ringBuffer }));
    processors.push(new FirstFailureProcessor({ ringBuffer }));
    processors.push(new CompletionTrackingProcessor({ ringBuffer }));
    processors.push(new DiagnosticProcessor({ ringBuffer }));
    processors.push(new SuiteDetectionProcessor(ringBuffer));

    if (isTestFilterMode) {
      // In test filter mode, use DetailsProcessor instead of SuiteOutputProcessor
      processors.push(new DetailsProcessor({ ringBuffer }));
    } else {
      // In suite mode, use SuiteOutputProcessor
      processors.push(new SuiteOutputProcessor({ ringBuffer }));
    }

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

  async waitForProcessorsToConsume() {
    // Let processors continue polling to consume the run-end event
    // Their handleRunEnd methods will be called when they consume it

    // Wait for any current polls to complete
    await Promise.all(
      this.processors.map(async (p) => {
        if (p.currentPoll) {
          await p.currentPoll.catch(() => {}); // Ignore errors
        }
      })
    );

    // Now stop them from polling
    this.processors.forEach((p) => {
      if (p.stopProcessing) {
        p.stopProcessing();
      }
    });

    // Give processors time to finish their final work
    await Promise.all(
      this.processors.map(async (p) => {
        if (p.waitForPendingWork) {
          await p.waitForPendingWork();
        }
      })
    );
  }

  // ===================================
  // === PROCESSOR METHODS END ===
  // ===================================
}
