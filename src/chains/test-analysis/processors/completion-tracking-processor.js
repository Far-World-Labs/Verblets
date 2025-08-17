/**
 * Completion Tracking Processor
 *
 * Monitors test run completion by tracking suite and test events from the ring buffer.
 * Shows progress status after initial debounce, then periodically until all tests complete.
 */

import { BaseProcessor } from './base-processor.js';
import { getConfig } from '../config.js';

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
    this.runEnded = false;
  }

  async onInitialize() {}

  async processBatch(events) {
    for (const event of events) {
      await super.processEvent(event);
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
    // Reset all state for new run (including re-runs)
    this.suites.clear();
    this.suitesCompleted.clear();
    this.expectedSuites.clear();
    this.runStartTime = new Date(log.timestamp);
    this.currentRunId = log.runId || Date.now();
    this.hasShownFinalStatus = false;
    this.runEnded = false;

    this.clearTimeouts();
  }

  clearTimeouts() {
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

  handleTestStart(_log) {}

  handleSuiteEnd(log) {
    if (log.suite) {
      this.suitesCompleted.add(log.suite);
      this.checkAllSuitesComplete();
    }
  }

  handleRunEnd(_log) {
    // Mark that the run has ended
    this.runEnded = true;
    
    // Run-end means all tests are done, show final status
    if (!this.hasShownFinalStatus) {
      // Clear any pending status updates since we're done
      this.clearTimeouts();
      this.showFinalStatus();
    }
  }

  debounceSuiteTracking() {
    if (this.suiteDebounceTimeout) {
      clearTimeout(this.suiteDebounceTimeout);
    }

    this.suiteDebounceTimeout = setTimeout(() => {
      // Lock in the suites we're expecting
      this.expectedSuites = new Set(this.suites);

      setTimeout(() => {
        // Don't start showing status if already done
        if (this.hasShownFinalStatus || this.runEnded) return;
        
        if (this.checkIfAllComplete()) {
          this.showFinalStatus();
        } else {
          this.showCompletionStatus();
          this.scheduleStatusRepeat();
        }
      }, INITIAL_STATUS_DELAY_MS);
    }, SUITE_DEBOUNCE_MS);
  }

  checkIfAllComplete() {
    // If we haven't locked in expected suites yet, we're not complete
    if (this.expectedSuites.size === 0) return false;
    
    // Check if all expected suites have completed
    // Note: We use expectedSuites not this.suites to avoid race conditions
    // where new suites start after debounce
    return [...this.expectedSuites].every(suite => this.suitesCompleted.has(suite));
  }

  checkAllSuitesComplete() {
    if (this.checkIfAllComplete() && !this.hasShownFinalStatus) {
      this.showFinalStatus();
    }
  }

  showFinalStatus() {
    if (this.statusTimeout) {
      clearTimeout(this.statusTimeout);
      this.statusTimeout = null;
    }
    this.hasShownFinalStatus = true;
    this.showCompletionStatus();
  }

  scheduleStatusRepeat() {
    if (this.statusTimeout) clearTimeout(this.statusTimeout);
    if (this.hasShownFinalStatus || this.runEnded) return;

    this.statusTimeout = setTimeout(() => {
      // Stop if run has ended while we were waiting
      if (this.runEnded) {
        this.showFinalStatus();
        return;
      }
      
      if (this.checkIfAllComplete()) {
        this.showFinalStatus();
      } else {
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
    const latestSequence = await this.ringBuffer.getLatestSequence();
    const logs = await this.reader.lookback(2000, latestSequence);

    const runStartIndex = logs.findLastIndex(
      l => l.event === 'run-start' && (!this.currentRunId || l.runId === this.currentRunId)
    );
    const currentRunLogs = runStartIndex >= 0 ? logs.slice(runStartIndex + 1) : logs;

    // Count tests by tracking unique test keys
    const testStarts = new Map();
    const testCompletes = new Set();
    const skippedTests = new Set();
    const suitesStarted = new Set();
    const suitesComplete = new Set();

    currentRunLogs.forEach(log => {
      const key = `${log.suite}-${log.testIndex}`;
      
      switch (log.event) {
        case 'suite-start':
          if (log.suite) suitesStarted.add(log.suite);
          break;
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
          break;
        case 'suite-end':
          if (log.suite) suitesComplete.add(log.suite);
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

    // Determine actual completion status
    // We're complete if run has ended OR all suites/tests are done
    const isActuallyComplete = this.runEnded || 
      (stats.allComplete && stats.pendingTests.length === 0);
    
    const hasIncompleteWork = !isActuallyComplete;

    // Show status - WAIT if pending, PASS if complete
    const status = hasIncompleteWork ? 'WAIT' : 'PASS';
    const message = hasIncompleteWork
      ? 'Waiting for remaining suites to complete...'
      : 'Waiting for file changes...';
    
    // In debug mode, show what we're waiting for
    const config = getConfig();
    if (hasIncompleteWork && config.debug?.suites) {
      const pendingSuites = Array.from(this.expectedSuites).filter(s => !this.suitesCompleted.has(s));
      if (pendingSuites.length > 0) {
        console.log(`[DEBUG] Pending suites: ${pendingSuites.join(', ')}`);
      }
      if (stats.pendingTests.length > 0) {
        console.log(`[DEBUG] Pending tests: ${stats.pendingTests.slice(0, 5).map(t => `${t.suite}::${t.name}`).join(', ')}`);
      }
    }
    
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
    this.clearTimeouts();
  }
}
