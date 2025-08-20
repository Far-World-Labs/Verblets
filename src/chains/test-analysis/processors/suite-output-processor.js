/**
 * Suite Output Processor
 *
 * Outputs suite summaries as each suite completes.
 * Can be disabled via VERBLETS_NO_SUITE_OUTPUT env var.
 */

import { BaseProcessor } from './base-processor.js';

export class SuiteOutputProcessor extends BaseProcessor {
  constructor({ ringBuffer }) {
    super({
      name: 'SuiteOutput',
      ringBuffer,
      processAsync: true,
      alwaysEnabled: true, // Always enabled unless explicitly disabled
    });

    // Override the enabled flag after super() call
    // Invert the logic - enabled by default unless env var is set
    this.enabled = !process.env.VERBLETS_NO_SUITE_OUTPUT;

    // Track suites and their test counts
    this.suites = new Map(); // suite -> { started: Set, completed: Set, debounceTimer }
    this.outputSuites = new Set();
    this.currentRunId = null;
    this.DEBOUNCE_MS = 500; // Wait 500ms after last test event to ensure all events arrive
  }

  async onInitialize() {}

  handleRunStart(log) {
    // Reset for new run
    this.suites.clear();
    this.outputSuites.clear();
    this.currentRunId = log.runId || Date.now();
  }

  handleTestStart(log) {
    if (!log.suite) return;

    // Initialize suite tracking if needed
    if (!this.suites.has(log.suite)) {
      this.suites.set(log.suite, {
        started: new Set(),
        completed: new Set(),
        debounceTimer: null,
      });
    }

    const suite = this.suites.get(log.suite);
    const testKey = `${log.suite}-${log.testIndex}`;
    suite.started.add(testKey);

    // Reset debounce timer - new test started
    this.resetDebounce(log.suite);
  }

  handleTestComplete(log) {
    if (!log.suite) return;

    const suite = this.suites.get(log.suite);
    if (!suite) return;

    const testKey = `${log.suite}-${log.testIndex}`;
    suite.completed.add(testKey);

    // If there are still pending tests, reset debounce
    if (suite.started.size > suite.completed.size) {
      this.resetDebounce(log.suite);
    }

    // Check if suite is complete and start debounce
    this.checkSuiteCompletion(log.suite);
  }

  handleTestSkip(log) {
    if (!log.suite) return;

    // Initialize suite tracking if needed
    if (!this.suites.has(log.suite)) {
      this.suites.set(log.suite, {
        started: new Set(),
        completed: new Set(),
        debounceTimer: null,
      });
    }

    const suite = this.suites.get(log.suite);
    const testKey = `${log.suite}-${log.testIndex}`;

    // Skips are both started and completed immediately
    suite.started.add(testKey);
    suite.completed.add(testKey);

    // Don't reset debounce for skips - they're already complete
    // Just check if the suite is done
    this.checkSuiteCompletion(log.suite);
  }

  resetDebounce(suiteName) {
    const suite = this.suites.get(suiteName);
    if (!suite) return;

    // Clear existing timer
    if (suite.debounceTimer) {
      clearTimeout(suite.debounceTimer);
      suite.debounceTimer = null;
    }
  }

  checkSuiteCompletion(suiteName) {
    const suite = this.suites.get(suiteName);
    if (!suite) return;

    // Clear any existing timer
    if (suite.debounceTimer) {
      clearTimeout(suite.debounceTimer);
    }

    // Check if all started tests have completed
    const allComplete = suite.started.size > 0 && suite.started.size === suite.completed.size;

    if (allComplete) {
      // Capture current run ID for validation
      const runId = this.currentRunId;

      // Start debounce timer - output immediately after debounce
      suite.debounceTimer = setTimeout(async () => {
        // Only output if still in the same run
        if (this.currentRunId === runId) {
          // Just check our local tracking - if we think it's complete, output it
          if (suite.started.size === suite.completed.size && !this.outputSuites.has(suiteName)) {
            this.outputSuites.add(suiteName);
            await this.outputSuiteSummary(suiteName);
          }
        }
      }, this.DEBOUNCE_MS);
    }
  }

  async outputSuiteSummary(suiteName) {
    try {
      // Get recent events from the buffer
      const latestSequence = await this.ringBuffer.getLatestSequence();
      const logs = await this.reader.lookback(2000, latestSequence);

      // Find the current run's logs
      const runStartIndex = logs.findLastIndex(
        (l) => l.event === 'run-start' && (!this.currentRunId || l.runId === this.currentRunId)
      );
      const currentRunLogs = runStartIndex >= 0 ? logs.slice(runStartIndex + 1) : logs;

      // Filter to just this suite's logs
      const suiteLogs = currentRunLogs.filter((l) => l.suite === suiteName);

      if (suiteLogs.length === 0) return;

      // Use the aggregator to get suite statistics
      const { aggregateFromLogs } = await import('../aggregator.js');
      const { formatTestSummary } = await import('../output-utils.js');

      const suites = aggregateFromLogs(suiteLogs);
      const suiteData = suites.find((s) => s.name === suiteName);

      if (suiteData) {
        const summary = formatTestSummary(
          suiteData.name,
          suiteData.passedCount,
          suiteData.testCount,
          suiteData.avgDuration,
          suiteData.skippedCount || 0
        );
        console.log(summary);
      }
    } catch (err) {
      console.error(`[SuiteOutput] Error outputting suite ${suiteName}:`, err);
    }
  }

  async onShutdown() {
    // Output any remaining suites that might not have ended
    // This handles suites with only skipped tests
  }
}
