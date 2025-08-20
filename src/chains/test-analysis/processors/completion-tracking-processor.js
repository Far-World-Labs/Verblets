/**
 * Completion Tracking Processor
 *
 * Shows test run summary after all suites have completed.
 */

import { BaseProcessor } from './base-processor.js';
import { analyzeSuiteStates } from './suite-tracking-utils.js';

export class CompletionTrackingProcessor extends BaseProcessor {
  constructor({ ringBuffer }) {
    super({
      name: 'CompletionTracking',
      alwaysEnabled: true,
      processAsync: true,
      ringBuffer,
    });

    this.currentRunId = undefined;
    this.runStartTime = undefined;
    this.runEnded = false;
    this.statusShown = false;
  }

  async onInitialize() {}

  handleRunStart(log) {
    this.currentRunId = log.runId || Date.now();
    this.runStartTime = new Date(log.timestamp);
    this.runEnded = false;
    this.statusShown = false;
  }

  handleRunEnd(_log) {
    this.runEnded = true;

    // Capture current run ID for validation
    const runId = this.currentRunId;

    // Wait for suites to finish outputting (they have 500ms debounce)
    const timer = setTimeout(async () => {
      // Only show status if still in the same run
      if (this.currentRunId === runId && !this.statusShown) {
        await this.showStatus();
      }
    }, 1000);

    // Unref the timer so it doesn't block the event loop
    timer.unref();
  }

  async showStatus() {
    this.statusShown = true;

    try {
      const stats = await this.gatherStatistics();
      this.renderStatus(stats);

      // If still waiting for suites, schedule an update
      if (!stats.allComplete) {
        const runId = this.currentRunId;

        const updateTimer = setTimeout(async () => {
          // Only update if still in the same run
          if (this.currentRunId === runId && this.runEnded) {
            this.statusShown = false; // Reset to allow showing again
            await this.showStatus();
          }
        }, 10000); // Update every 10 seconds

        // Unref so it doesn't block the event loop
        updateTimer.unref();
      }
    } catch (err) {
      console.error('[CompletionTracking] Error showing status:', err);
    }
  }

  async gatherStatistics() {
    const latestSequence = await this.ringBuffer.getLatestSequence();
    const logs = await this.reader.lookback(5000, latestSequence);

    const runStartIndex = logs.findLastIndex(
      (l) => l.event === 'run-start' && (!this.currentRunId || l.runId === this.currentRunId)
    );
    const currentRunLogs = runStartIndex >= 0 ? logs.slice(runStartIndex + 1) : logs;

    // Use shared suite tracking logic
    const suiteAnalysis = analyzeSuiteStates(currentRunLogs);

    // Count tests
    const testStarts = new Map();
    const testCompletes = new Set();
    const skippedTests = new Set();
    const failedTests = new Set();

    currentRunLogs.forEach((log) => {
      const key = `${log.suite}-${log.testIndex}`;

      switch (log.event) {
        case 'test-start':
          testStarts.set(key, log);
          if (log.skipped) skippedTests.add(key);
          break;
        case 'test-skip':
          testStarts.set(key, log);
          testCompletes.add(key);
          skippedTests.add(key);
          break;
        case 'test-complete':
          testCompletes.add(key);
          if (log.state === 'skip') skippedTests.add(key);
          if (log.state === 'fail') failedTests.add(key);
          break;
      }
    });

    const pendingTests = Array.from(testStarts.entries())
      .filter(([key]) => !testCompletes.has(key))
      .map(([, startLog]) => ({
        name: startLog.testName,
        suite: startLog.suite,
      }));

    const duration = this.runStartTime
      ? ((Date.now() - this.runStartTime) / 1000).toFixed(2)
      : '0.00';

    const timeOptions = { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' };
    const startTime = (this.runStartTime || new Date()).toLocaleTimeString('en-US', timeOptions);

    return {
      totalSuites: suiteAnalysis.suitesStarted.size,
      completedSuites: suiteAnalysis.suitesCompleted.size,
      pendingSuites: suiteAnalysis.suitesPending.size,
      totalTests: testStarts.size,
      completedTests: testCompletes.size,
      skippedTests: skippedTests.size,
      failedTests: failedTests.size,
      pendingTests,
      allComplete: suiteAnalysis.suitesPending.size === 0 && pendingTests.length === 0,
      duration,
      startTime,
    };
  }

  renderStatus(stats) {
    console.log(); // Empty line before status

    // ANSI color codes
    const GRAY = '\x1b[38;5;247m';
    const GREEN = '\x1b[32m';
    const RED = '\x1b[31m';
    const YELLOW = '\x1b[33m';
    const BG_GREEN = '\x1b[42m';
    const BG_RED = '\x1b[41m';
    const BG_YELLOW = '\x1b[43m';
    const WHITE = '\x1b[37m';
    const BOLD = '\x1b[1m';
    const RESET = '\x1b[0m';

    // Show test files and tests count
    const fileStatus = stats.failedTests > 0 ? RED : GREEN;
    console.log(
      `${GRAY} Test Files${RESET}  ${fileStatus}${stats.completedSuites} passed${RESET} ${GRAY}(${stats.totalSuites})${RESET}`
    );

    // Format test line
    const passedTests = stats.completedTests - stats.skippedTests - stats.failedTests;
    let testLine = `${GRAY}      Tests${RESET}  ${GREEN}${passedTests} passed${RESET}`;
    if (stats.failedTests > 0) {
      testLine += ` ${GRAY}|${RESET} ${RED}${stats.failedTests} failed${RESET}`;
    }
    if (stats.skippedTests > 0) {
      testLine += ` ${GRAY}|${RESET} ${YELLOW}${stats.skippedTests} skipped${RESET}`;
    }
    testLine += ` ${GRAY}(${stats.totalTests})${RESET}`;
    console.log(testLine);

    // Show timing info
    console.log(`${GRAY}   Start at${RESET}  ${stats.startTime}`);
    console.log(`${GRAY}   Duration${RESET}  ${stats.duration}s`);

    // Determine status
    const hasIncompleteWork = !stats.allComplete;
    const hasFailures = stats.failedTests > 0;

    // Show status with background color
    let statusLabel, bgColor, messageColor;
    if (hasIncompleteWork) {
      statusLabel = ' WAIT ';
      bgColor = BG_YELLOW;
      messageColor = YELLOW;
    } else if (hasFailures) {
      statusLabel = ' FAIL ';
      bgColor = BG_RED;
      messageColor = RED;
    } else {
      statusLabel = ' PASS ';
      bgColor = BG_GREEN;
      messageColor = GREEN;
    }

    const message = hasIncompleteWork
      ? 'Waiting for remaining suites to complete...'
      : 'Waiting for file changes...';

    console.log(
      `\n${bgColor}${BOLD}${WHITE}${statusLabel}${RESET}  ${messageColor}${message}${RESET}\n`
    );
  }
}
