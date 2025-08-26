import { BaseProcessor } from './base-processor.js';
import { getConfig } from '../config.js';

export default class SuiteDetectionProcessor extends BaseProcessor {
  constructor({ ringBuffer, policy: _policy }) {
    super({
      name: 'SuiteDetection',
      alwaysEnabled: true,
      ringBuffer,
    });

    this.config = getConfig();
    this.suiteData = new Map();
    this.missingTests = new Map();
    this.skipReasons = new Map();
  }

  processEvent(event) {
    const { type, suite, test, reason, status, file } = event;

    switch (type) {
      case 'suite-start':
        if (!this.suiteData.has(suite)) {
          this.suiteData.set(suite, {
            name: suite,
            file: file || event.file || 'unknown',
            startTime: event.timestamp,
            tests: new Set(),
            skippedTests: new Set(),
            status: 'running',
          });
        }
        break;

      case 'test-start':
        if (suite) {
          const suiteInfo = this.suiteData.get(suite);
          if (suiteInfo) {
            suiteInfo.tests.add(test);
          } else {
            // Test started without suite-start event
            if (!this.missingTests.has(suite)) {
              this.missingTests.set(suite, new Set());
            }
            this.missingTests.get(suite).add(test);
          }
        }
        break;

      case 'test-skip':
        {
          const testName = event.testName || test;
          if (suite) {
            const suiteInfo = this.suiteData.get(suite);
            if (suiteInfo) {
              suiteInfo.tests.add(testName);
              suiteInfo.skippedTests.add(testName);
            } else {
              // Suite hasn't started yet but test is being skipped
              if (!this.missingTests.has(suite)) {
                this.missingTests.set(suite, new Set());
              }
              this.missingTests.get(suite).add(testName);
            }
            // Track skip reasons
            const key = `${suite}::${testName}`;
            this.skipReasons.set(key, reason || 'unknown');
          }
        }
        break;

      case 'test-end':
        if (suite && status === 'skip') {
          const suiteInfo = this.suiteData.get(suite);
          if (suiteInfo) {
            suiteInfo.skippedTests.add(test);
          }
        }
        break;

      case 'suite-end':
        if (this.suiteData.has(suite)) {
          const suiteInfo = this.suiteData.get(suite);
          suiteInfo.endTime = event.timestamp;
          suiteInfo.status = 'completed';
        }
        break;
    }
  }

  finish() {
    // Analyze missing suites and tests
    const analysis = {
      totalSuites: this.suiteData.size,
      completedSuites: 0,
      runningSuites: 0,
      suitesWithSkippedTests: 0,
      totalTests: 0,
      totalSkippedTests: 0,
      missingSuiteStarts: [],
      skipPatterns: {},
    };

    for (const [, suiteInfo] of this.suiteData) {
      if (suiteInfo.status === 'completed') {
        analysis.completedSuites++;
      } else {
        analysis.runningSuites++;
      }

      analysis.totalTests += suiteInfo.tests.size;
      analysis.totalSkippedTests += suiteInfo.skippedTests.size;

      if (suiteInfo.skippedTests.size > 0) {
        analysis.suitesWithSkippedTests++;
      }
    }

    // Check for tests that ran without suite-start
    for (const [suite, tests] of this.missingTests) {
      analysis.missingSuiteStarts.push({
        suite,
        testCount: tests.size,
        tests: Array.from(tests),
      });
    }

    // Analyze skip patterns
    for (const [key, reason] of this.skipReasons) {
      if (!analysis.skipPatterns[reason]) {
        analysis.skipPatterns[reason] = [];
      }
      analysis.skipPatterns[reason].push(key);
    }

    // Show analysis if debug.suites is enabled or if we found issues
    const hasIssues = analysis.missingSuiteStarts.length > 0 || analysis.runningSuites > 0;

    if (this.config.debug?.suites || hasIssues) {
      console.log('\n=== Suite Detection Analysis ===');
      console.log(`Total Suites: ${analysis.totalSuites}`);
      console.log(`Completed: ${analysis.completedSuites}, Running: ${analysis.runningSuites}`);
      console.log(`Total Tests: ${analysis.totalTests}, Skipped: ${analysis.totalSkippedTests}`);

      if (analysis.missingSuiteStarts.length > 0) {
        console.log('\nWARNING: Tests running without suite-start events:');
        for (const missing of analysis.missingSuiteStarts) {
          console.log(`  - ${missing.suite}: ${missing.testCount} tests`);
        }
      }

      if (analysis.runningSuites > 0) {
        console.log('\nWARNING: Suites that never completed:');
        for (const [name, info] of this.suiteData) {
          if (info.status === 'running') {
            console.log(`  - ${name} (${info.tests.size} tests)`);
          }
        }
      }

      if (Object.keys(analysis.skipPatterns).length > 0) {
        console.log('\nSkip Patterns:');
        for (const [reason, tests] of Object.entries(analysis.skipPatterns)) {
          console.log(`  ${reason}: ${tests.length} tests`);
        }
      }

      // In suite debug mode, list all suites
      if (this.config.debug?.suites) {
        console.log('\nAll Suites Detected:');
        const sortedSuites = Array.from(this.suiteData.keys()).sort();
        for (const suiteName of sortedSuites) {
          const info = this.suiteData.get(suiteName);
          const status = info.status === 'completed' ? '✓' : '⚠';
          const skipInfo = info.skippedTests.size > 0 ? ` (${info.skippedTests.size} skip)` : '';
          console.log(`  ${status} ${suiteName}: ${info.tests.size} tests${skipInfo}`);
        }
      }
    }

    return analysis;
  }
}
