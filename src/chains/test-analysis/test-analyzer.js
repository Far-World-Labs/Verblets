/**
 * Test analyzer - tracks test state and builds viewmodels
 */

export function createTestAnalyzer() {
  // Map of suite name to test data
  const suites = new Map();

  function getSuiteData(suiteName) {
    if (!suites.has(suiteName)) {
      suites.set(suiteName, {
        name: suiteName,
        tests: new Map(),
        startTime: Date.now(),
        filePath: null,
      });
    }
    return suites.get(suiteName);
  }

  return {
    onSuiteStart(log) {
      const suite = getSuiteData(log.suite);
      suite.filePath = log.filePath;
      suite.startTime = new Date(log.ts).getTime();
    },

    onTestStart(log) {
      const suite = getSuiteData(log.suite || 'default');
      const test = {
        index: log.testIndex,
        name: log.testName,
        file: log.file || log.fileName,
        line: log.line,
        startTime: new Date(log.ts).getTime(),
        logs: [],
        failed: false,
      };
      suite.tests.set(log.testIndex, test);
    },

    onTestComplete(log) {
      // Find test across all suites
      for (const suite of suites.values()) {
        const test = suite.tests.get(log.testIndex);
        if (test) {
          test.state = log.state;
          test.duration = log.duration;
          test.endTime = new Date(log.ts).getTime();
          if (log.state === 'fail') {
            test.failed = true;
          }
          break;
        }
      }
    },

    onExpect(log) {
      // Find test across all suites
      for (const suite of suites.values()) {
        const test = suite.tests.get(log.testIndex);
        if (test) {
          test.logs.push(log);

          // Track failure
          if (log.passed === false) {
            test.failed = true;
            test.failureLog = log;
            if (log.file) test.failureFile = log.file;
            if (log.line) test.failureLine = log.line;
          }
          break;
        }
      }
    },

    getSuiteStats(suiteName) {
      const suite = suites.get(suiteName);
      if (!suite) return null;

      const tests = Array.from(suite.tests.values());
      const completed = tests.filter((t) => t.state);
      const passed = completed.filter((t) => t.state === 'pass' && !t.failed);
      const failed = completed.filter((t) => t.state === 'fail' || t.failed);

      const endTime = Math.max(...completed.map((t) => t.endTime || t.startTime));
      const duration = endTime - suite.startTime;

      return {
        passed: passed.length,
        failed: failed.length,
        total: tests.length,
        duration,
      };
    },

    getFailedTests(suiteName) {
      const suite = suites.get(suiteName);
      if (!suite) return [];

      return Array.from(suite.tests.values())
        .filter((t) => t.failed || t.state === 'fail')
        .sort((a, b) => a.index - b.index);
    },

    clearSuite(suiteName) {
      suites.delete(suiteName);
    },
  };
}
