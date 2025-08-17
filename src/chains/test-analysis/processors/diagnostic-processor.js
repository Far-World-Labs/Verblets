/**
 * Diagnostic Processor
 *
 * Helps debug test execution issues by tracking specific event patterns.
 * Can be configured via environment variables to focus on different aspects.
 *
 * Debug modes (set VERBLETS_DEBUG to one or more comma-separated values):
 * - suites: Track suite starts/ends and missing suites
 * - skipped: Track skipped tests
 * - timing: Track slow tests and timeouts
 * - events: Show all events (verbose)
 * - counts: Track test/suite counts per run
 * - missing: Track tests that complete without starts
 */

import { BaseProcessor } from './base-processor.js';

// Parse debug modes from environment
const parseDebugModes = () => {
  const debug = process.env.VERBLETS_DEBUG;
  if (!debug) return new Set();
  return new Set(
    debug
      .toLowerCase()
      .split(',')
      .map((s) => s.trim())
  );
};

export class DiagnosticProcessor extends BaseProcessor {
  constructor({ ringBuffer }) {
    const debugModes = parseDebugModes();

    super({
      name: 'Diagnostic',
      envFlag: 'VERBLETS_DEBUG', // Enable if any debug mode is set
      alwaysEnabled: false,
      ringBuffer,
    });

    this.debugModes = debugModes;
    this.currentRunId = null;

    // Suite tracking
    this.suitesSeen = new Set();
    this.suitesStarted = new Set();
    this.suitesCompleted = new Set();

    // Test tracking
    this.testsSeen = new Map(); // key -> test info
    this.testsStarted = new Set();
    this.testsCompleted = new Set();

    // Timing tracking
    this.testStartTimes = new Map();
    this.suiteStartTimes = new Map();

    // Count tracking
    this.counts = {
      files: 0,
      tests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
    };
  }

  onInitialize() {
    if (this.debugModes.size > 0) {
      console.log(`[Diagnostic] Active debug modes: ${Array.from(this.debugModes).join(', ')}`);
    }
  }

  async processBatch(events) {
    for (const event of events) {
      // Show all events if in events mode
      if (this.debugModes.has('events')) {
        console.log(`[Diagnostic:Event] ${event.event}`, {
          suite: event.suite,
          test: event.testName,
          index: event.testIndex,
        });
      }

      // Let base class handle state resets and routing
      await super.processEvent(event);
    }
  }

  handleRunStart(log) {
    // Reset tracking for new run
    this.currentRunId = log.runId;
    this.suitesSeen.clear();
    this.suitesStarted.clear();
    this.suitesCompleted.clear();
    this.testsSeen.clear();
    this.testsStarted.clear();
    this.testsCompleted.clear();
    this.testStartTimes.clear();
    this.suiteStartTimes.clear();
    this.counts = {
      files: 0,
      tests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
    };

    if (this.debugModes.has('suites') || this.debugModes.has('counts')) {
      console.log(`[Diagnostic] === Run started (ID: ${this.currentRunId}) ===`);
    }
  }

  handleSuiteStart(log) {
    if (!log.suite) return;

    this.suitesStarted.add(log.suite);
    this.suiteStartTimes.set(log.suite, Date.now());

    if (this.debugModes.has('suites')) {
      console.log(`[Diagnostic:Suite] START "${log.suite}"`);
    }
  }

  handleTestStart(log) {
    const key = `${log.suite}-${log.testIndex}`;

    // Track suite from test if we haven't seen suite-start
    if (log.suite && !this.suitesStarted.has(log.suite)) {
      this.suitesSeen.add(log.suite);
      if (this.debugModes.has('missing') || this.debugModes.has('suites')) {
        console.log(
          `[Diagnostic:Missing] Suite "${log.suite}" has test-start but no suite-start event!`
        );
      }
    }

    this.testsSeen.set(key, {
      suite: log.suite,
      name: log.testName,
      index: log.testIndex,
      skipped: log.skipped,
    });

    if (!log.skipped) {
      this.testsStarted.add(key);
      this.testStartTimes.set(key, Date.now());
    }

    if (this.debugModes.has('skipped') && log.skipped) {
      console.log(`[Diagnostic:Skipped] Test "${log.testName}" in suite "${log.suite}"`);
    }
  }

  handleTestComplete(log) {
    const key = `${log.suite}-${log.testIndex}`;

    // Check if we saw test-start
    if (!this.testsSeen.has(key)) {
      if (this.debugModes.has('missing')) {
        console.log(`[Diagnostic:Missing] Test complete without start: ${key}`);
      }
    }

    this.testsCompleted.add(key);

    // Update counts
    if (log.state === 'pass') {
      this.counts.passed++;
    } else if (log.state === 'fail') {
      this.counts.failed++;
    } else if (log.state === 'skip') {
      this.counts.skipped++;
    }

    // Check timing
    if (this.debugModes.has('timing') && this.testStartTimes.has(key)) {
      const duration = Date.now() - this.testStartTimes.get(key);
      if (duration > 5000) {
        // Tests taking more than 5s
        console.log(`[Diagnostic:Slow] Test "${this.testsSeen.get(key)?.name}" took ${duration}ms`);
      }
    }
  }

  handleSuiteEnd(log) {
    if (!log.suite) return;

    this.suitesCompleted.add(log.suite);
    this.counts.files++;

    // Check if we saw suite-start
    if (!this.suitesStarted.has(log.suite)) {
      if (this.debugModes.has('missing') || this.debugModes.has('suites')) {
        console.log(`[Diagnostic:Missing] Suite end without start: "${log.suite}"`);
      }
    }

    if (this.debugModes.has('suites')) {
      // Count tests in this suite
      const suiteTests = Array.from(this.testsSeen.entries()).filter(
        ([_key, info]) => info.suite === log.suite
      );

      const completed = suiteTests.filter(([key]) => this.testsCompleted.has(key)).length;
      const skipped = suiteTests.filter(([_key, info]) => info.skipped).length;

      console.log(
        `[Diagnostic:Suite] END "${log.suite}" - ${completed}/${suiteTests.length} tests (${skipped} skipped)`
      );
    }

    // Check timing
    if (this.debugModes.has('timing') && this.suiteStartTimes.has(log.suite)) {
      const duration = Date.now() - this.suiteStartTimes.get(log.suite);
      if (duration > 10000) {
        // Suites taking more than 10s
        console.log(`[Diagnostic:Slow] Suite "${log.suite}" took ${duration}ms`);
      }
    }
  }

  handleRunEnd(_log) {
    // Calculate total tests
    this.counts.tests = this.testsCompleted.size;

    if (this.debugModes.has('counts')) {
      console.log(`[Diagnostic:Counts] Run ended:`);
      console.log(
        `  Files: ${this.counts.files} (started: ${this.suitesStarted.size}, completed: ${this.suitesCompleted.size})`
      );
      console.log(
        `  Tests: ${this.counts.tests} (seen: ${this.testsSeen.size}, started: ${this.testsStarted.size}, completed: ${this.testsCompleted.size})`
      );
      console.log(`  Passed: ${this.counts.passed}`);
      console.log(`  Failed: ${this.counts.failed}`);
      console.log(`  Skipped: ${this.counts.skipped}`);
    }

    if (this.debugModes.has('missing')) {
      // Find tests that started but didn't complete
      const incomplete = Array.from(this.testsStarted)
        .filter((key) => !this.testsCompleted.has(key))
        .map((key) => this.testsSeen.get(key));

      if (incomplete.length > 0) {
        console.log(`[Diagnostic:Missing] Tests started but not completed:`);
        incomplete.forEach((test) => {
          console.log(`  - "${test.name}" in suite "${test.suite}"`);
        });
      }

      // Find suites that started but didn't complete
      const incompleteSuites = Array.from(this.suitesStarted).filter(
        (suite) => !this.suitesCompleted.has(suite)
      );

      if (incompleteSuites.length > 0) {
        console.log(`[Diagnostic:Missing] Suites started but not completed:`);
        incompleteSuites.forEach((suite) => {
          console.log(`  - "${suite}"`);
        });
      }

      // List all suites we've seen (from any source)
      const allSuites = new Set([...this.suitesStarted, ...this.suitesSeen]);
      console.log(`[Diagnostic:Missing] All suites detected: ${allSuites.size}`);
      if (this.debugModes.has('suites')) {
        Array.from(allSuites)
          .sort()
          .forEach((suite) => {
            const hasStart = this.suitesStarted.has(suite) ? '✓' : '✗';
            const hasEnd = this.suitesCompleted.has(suite) ? '✓' : '✗';
            console.log(`  ${hasStart}start ${hasEnd}end - "${suite}"`);
          });
      }
    }
  }

  async onShutdown() {
    // Clean up any resources
  }
}
