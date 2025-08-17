/**
 * Completion Tracking Processor
 *
 * Monitors test run completion by tracking suite and test events from the ring buffer.
 * Shows progress status after initial debounce, then periodically until all tests complete.
 */

import { BaseProcessor } from './base-processor.js';

// Constants
const SUITE_DEBOUNCE_MS = 5000; // Wait 5s for all suites to start
const INITIAL_STATUS_DELAY_MS = 1000; // Show status 1s after debounce
const STATUS_REPEAT_INTERVAL_MS = 10000; // Repeat status every 10s

export class CompletionTrackingProcessor extends BaseProcessor {
  constructor({ ringBuffer }) {
    super({
      name: 'CompletionTracking',
      alwaysEnabled: true, // Always run regardless of env flags
      ringBuffer,
    });

    this.suites = new Set();
    this.suitesCompleted = new Set();
    this.expectedSuites = new Set();
    this.runStartTime = null;
    this.currentRunId = null;
    this.suiteDebounceTimeout = null;
    this.statusTimeout = null;
    this.hasShownFinalStatus = false;
  }

  async onInitialize() {
    // Called by BaseProcessor after reader is created
    // Processing will start automatically if processAsync is true
  }

  // Override processBatch to handle events
  async processBatch(events) {
    for (const event of events) {
      // Let base class handle state resets and routing
      await super.processEvent(event);
      // Also handle our custom events
      await this.handleEvent(event);
    }
  }

  handleEvent(log) {
    switch (log.event) {
      case 'run-start':
        this.handleRunStart(log);
        break;
      case 'suite-start':
        this.handleSuiteStart(log);
        break;
      case 'test-start':
        this.handleTestStart(log);
        break;
      case 'suite-end':
        this.handleSuiteEnd(log);
        break;
      case 'run-end':
        this.handleRunEnd(log);
        break;
    }
  }

  handleRunStart(log) {
    // Reset state for new run
    this.suites.clear();
    this.suitesCompleted.clear();
    this.expectedSuites.clear();
    this.runStartTime = new Date(log.timestamp);
    this.currentRunId = log.runId || Date.now();
    this.hasShownFinalStatus = false;

    // Clear any existing timeouts
    if (this.suiteDebounceTimeout) {
      clearTimeout(this.suiteDebounceTimeout);
      this.suiteDebounceTimeout = null;
    }
    if (this.statusTimeout) {
      clearTimeout(this.statusTimeout);
      this.statusTimeout = null;
    }
  }

  handleSuiteStart(log) {
    if (log.suite && !this.suites.has(log.suite)) {
      this.suites.add(log.suite);
      this.debounceSuiteTracking();
    }
  }

  handleTestStart(_log) {
    // Don't track suites from test-start anymore, we'll use suite-start events
  }

  handleSuiteEnd(log) {
    if (log.suite) {
      this.suitesCompleted.add(log.suite);
      this.checkAllSuitesComplete();
    }
  }

  handleRunEnd(_log) {
    // Show final status if not already shown
    if (!this.hasShownFinalStatus && this.checkIfAllComplete()) {
      this.showFinalStatus();
    }
  }

  debounceSuiteTracking() {
    // Reset debounce timer each time a new suite starts
    if (this.suiteDebounceTimeout) {
      clearTimeout(this.suiteDebounceTimeout);
    }

    this.suiteDebounceTimeout = setTimeout(() => {
      // Lock in the suites we're expecting
      this.expectedSuites = new Set(this.suites);

      // After 1s more, show initial status
      setTimeout(() => {
        const allComplete = this.checkIfAllComplete();

        if (allComplete) {
          // Everything done already - show final status
          this.showFinalStatus();
        } else {
          // Still waiting - show initial status and schedule repeats
          this.showCompletionStatus();
          this.scheduleStatusRepeat();
        }
      }, INITIAL_STATUS_DELAY_MS);
    }, SUITE_DEBOUNCE_MS);
  }

  checkIfAllComplete() {
    if (this.expectedSuites.size === 0) return false;
    return [...this.expectedSuites].every((suite) => this.suitesCompleted.has(suite));
  }

  checkAllSuitesComplete() {
    if (this.checkIfAllComplete() && !this.hasShownFinalStatus) {
      this.showFinalStatus();
    }
  }

  showFinalStatus() {
    // Cancel any pending status updates
    if (this.statusTimeout) {
      clearTimeout(this.statusTimeout);
      this.statusTimeout = null;
    }

    // Show final completion status
    this.hasShownFinalStatus = true;
    this.showCompletionStatus();
  }

  scheduleStatusRepeat() {
    // Clear any existing timeout to avoid duplicates
    if (this.statusTimeout) {
      clearTimeout(this.statusTimeout);
    }

    // Don't schedule if already done
    if (this.hasShownFinalStatus) return;

    // Schedule next status update
    this.statusTimeout = setTimeout(() => {
      if (this.checkIfAllComplete()) {
        // Tests finished while we were waiting - show final
        this.showFinalStatus();
      } else {
        // Still waiting - show status and schedule next
        this.showCompletionStatus();
        this.scheduleStatusRepeat();
      }
    }, STATUS_REPEAT_INTERVAL_MS);
  }

  async showCompletionStatus() {
    const stats = await this.gatherStatistics();
    this.renderStatus(stats);
  }

  async gatherStatistics() {
    // Use lookback to gather complete statistics
    const latestSequence = await this.ringBuffer.getLatestSequence();
    const logs = await this.reader.lookback(2000, latestSequence);

    // Find the most recent run-start that matches our current run ID
    const runStartIndex = logs.findLastIndex(
      (l) => l.event === 'run-start' && (this.currentRunId ? l.runId === this.currentRunId : true)
    );
    const currentRunLogs = runStartIndex >= 0 ? logs.slice(runStartIndex + 1) : logs;

    // Count tests by tracking unique test keys
    const testStarts = new Map();
    const testCompletes = new Set();
    const skippedTests = new Set();
    const suitesStarted = new Set();
    const suitesComplete = new Set();

    // Count all unique tests and suites
    currentRunLogs.forEach((log) => {
      if (log.event === 'suite-start') {
        // Track suites that have started from explicit suite-start events
        if (log.suite) suitesStarted.add(log.suite);
      } else if (log.event === 'test-start') {
        const key = `${log.suite}-${log.testIndex}`;
        testStarts.set(key, log);
        // Track skipped tests from test-start events
        if (log.skipped) {
          skippedTests.add(key);
        }
      } else if (log.event === 'test-complete') {
        const key = `${log.suite}-${log.testIndex}`;
        testCompletes.add(key);
        if (log.state === 'skip') {
          skippedTests.add(key);
        }
      } else if (log.event === 'suite-end') {
        if (log.suite) suitesComplete.add(log.suite);
      }
    });

    // Calculate pending tests
    const pendingTests = [];
    for (const [key, startLog] of testStarts.entries()) {
      if (!testCompletes.has(key)) {
        pendingTests.push({
          name: startLog.testName,
          suite: startLog.suite,
        });
      }
    }

    // Calculate duration
    const duration = this.runStartTime
      ? ((Date.now() - this.runStartTime) / 1000).toFixed(2)
      : '0.00';

    // Format start time
    const startTime = this.runStartTime
      ? this.runStartTime.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      : new Date().toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });

    return {
      totalSuites: suitesStarted.size,
      completedSuites: suitesComplete.size,
      totalTests: testStarts.size,
      completedTests: testCompletes.size,
      skippedTests: skippedTests.size,
      pendingTests,
      allComplete: this.checkIfAllComplete(),
      duration,
      startTime,
    };
  }

  renderStatus(stats) {
    console.log(); // Empty line before status

    // Show test files and tests count
    console.log(` Test Files  ${stats.completedSuites} passed (${stats.totalSuites})`);

    // Format test line with skipped if any
    const passedTests = stats.completedTests - stats.skippedTests;
    const testLine =
      stats.skippedTests > 0
        ? `      Tests  ${passedTests} passed | ${stats.skippedTests} skipped (${stats.totalTests})`
        : `      Tests  ${passedTests} passed (${stats.totalTests})`;
    console.log(testLine);

    // Show timing info
    console.log(`   Start at  ${stats.startTime}`);
    console.log(`   Duration  ${stats.duration}s`);

    // Determine actual completion status based on pending tests AND suites
    const hasIncompleteWork = stats.pendingTests.length > 0 || !stats.allComplete;

    // Show status - WAIT if pending, PASS if complete
    const status = hasIncompleteWork ? 'WAIT' : 'PASS';
    const message = hasIncompleteWork
      ? 'Waiting for remaining suites to complete...'
      : 'Waiting for file changes...';
    console.log(`\n ${status}  ${message}\n`);

    // Show pending tests if not complete and not too many
    if (hasIncompleteWork && stats.pendingTests.length > 0 && stats.pendingTests.length <= 10) {
      console.log(` Pending tests:`);
      stats.pendingTests.slice(0, 5).forEach((test) => {
        console.log(`   ○ ${test.name} (${test.suite})`);
      });
      if (stats.pendingTests.length > 5) {
        console.log(`   ... and ${stats.pendingTests.length - 5} more`);
      }
      console.log();
    }
  }

  onShutdown() {
    // Clear any pending timeouts
    if (this.suiteDebounceTimeout) {
      clearTimeout(this.suiteDebounceTimeout);
    }
    if (this.statusTimeout) {
      clearTimeout(this.statusTimeout);
    }
  }
}
