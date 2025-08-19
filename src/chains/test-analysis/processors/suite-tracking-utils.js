/**
 * Shared utilities for tracking suite completion across processors
 *
 * This module provides consistent logic for determining when suites
 * start and complete based on test events.
 */

/**
 * Analyzes logs to determine suite states
 * @param {Array} logs - Array of test event logs
 * @returns {Object} Suite tracking data
 */
export function analyzeSuiteStates(logs) {
  const suites = new Map(); // suite -> { started: Set, completed: Set }
  const suitesStarted = new Set();
  const suitesWithExplicitEnd = new Set();

  logs.forEach((log) => {
    if (!log.suite) return;

    // Initialize suite tracking if needed
    if (!suites.has(log.suite)) {
      suites.set(log.suite, {
        started: new Set(),
        completed: new Set(),
      });
    }

    const suite = suites.get(log.suite);
    const testKey = `${log.suite}-${log.testIndex}`;

    switch (log.event) {
      case 'suite-start':
        suitesStarted.add(log.suite);
        break;

      case 'test-start':
        // Test start implies suite has started
        suitesStarted.add(log.suite);
        suite.started.add(testKey);
        break;

      case 'test-skip':
        // Skip events imply both start and complete
        suitesStarted.add(log.suite);
        suite.started.add(testKey);
        suite.completed.add(testKey);
        break;

      case 'test-complete':
        suite.completed.add(testKey);
        break;

      case 'suite-end':
        suitesWithExplicitEnd.add(log.suite);
        break;
    }
  });

  // Check which suites are actually complete
  // A suite is complete when all started tests have completed
  const actuallyCompletedSuites = new Set();
  const pendingSuites = new Set();

  for (const [suiteName, suite] of suites) {
    if (suite.started.size > 0 && suite.started.size === suite.completed.size) {
      actuallyCompletedSuites.add(suiteName);
    } else if (suite.started.size > suite.completed.size) {
      pendingSuites.add(suiteName);
    }
  }

  return {
    suites,
    suitesStarted,
    suitesCompleted: actuallyCompletedSuites,
    suitesPending: pendingSuites,
    explicitSuiteEnds: suitesWithExplicitEnd,
  };
}

/**
 * Checks if a specific suite is complete based on test events
 * @param {Map} suiteData - Suite tracking data from analyzeSuiteStates
 * @param {string} suiteName - Name of the suite to check
 * @returns {boolean} Whether the suite is complete
 */
export function isSuiteComplete(suiteData, suiteName) {
  const suite = suiteData.get(suiteName);
  if (!suite) return false;

  return suite.started.size > 0 && suite.started.size === suite.completed.size;
}
