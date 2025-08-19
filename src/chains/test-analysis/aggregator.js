/**
 * Aggregates test data from ring buffer
 */

// Pure predicates
const isTestComplete = (log) => log.event === 'test-complete';
const isTestSkip = (log) => log.event === 'test-skip';
const hasTestName = (log) => Boolean(log.testName);

// Get unique test identifier
const getTestKey = (log) => `${log.suite}:${log.testName}`;

const aggregateLogs = (logs) => {
  const testMap = new Map();
  const suiteNames = new Set();

  // Debug: count events
  const eventCounts = {};
  const suiteTestNames = {};

  // First pass: collect all unique tests by name
  for (const log of logs) {
    // Debug counting
    if (log.event) {
      eventCounts[log.event] = (eventCounts[log.event] || 0) + 1;
    }

    // Include test-skip events even if they don't have testName
    if (!hasTestName(log) && !isTestSkip(log)) continue;

    const key = getTestKey(log);
    suiteNames.add(log.suite || 'default');

    // Debug: track test names per suite
    const suite = log.suite || 'default';
    if (!suiteTestNames[suite]) suiteTestNames[suite] = new Set();
    suiteTestNames[suite].add(log.testName);

    if (!testMap.has(key)) {
      testMap.set(key, {
        suite: log.suite || 'default',
        name: log.testName,
        state: undefined,
        duration: 0,
      });
    }

    const test = testMap.get(key);

    if (isTestComplete(log)) {
      test.state = log.state;
      test.duration = log.duration || 0;
    } else if (isTestSkip(log)) {
      test.state = 'skip';
      test.duration = 0;
    }
  }

  // Group by suite
  const suites = {};
  for (const suiteName of suiteNames) {
    suites[suiteName] = {
      name: suiteName,
      tests: {},
    };
  }

  // Assign tests to suites with sequential indices per suite
  const suiteIndices = new Map();
  for (const test of testMap.values()) {
    const suite = suites[test.suite];
    if (!suiteIndices.has(test.suite)) {
      suiteIndices.set(test.suite, 0);
    }
    const index = suiteIndices.get(test.suite);
    suite.tests[index] = test;
    suiteIndices.set(test.suite, index + 1);
  }

  return suites;
};

// Pure predicates for stats
const isCompleted = (test) => Boolean(test.state);
const isPassed = (test) => test.state === 'pass';
const isSkipped = (test) => test.state === 'skip';

const calculateStats = (suite) => {
  const tests = Object.values(suite.tests);
  const completed = tests.filter(isCompleted);
  const passed = completed.filter(isPassed);
  const skipped = tests.filter(isSkipped);
  const totalDuration = completed
    .filter((t) => !isSkipped(t))
    .reduce((sum, t) => sum + t.duration, 0);
  const nonSkippedCompleted = completed.filter((t) => !isSkipped(t));

  return {
    name: suite.name,
    testCount: tests.length, // Now this is the actual unique test count
    passedCount: passed.length,
    skippedCount: skipped.length,
    avgDuration: nonSkippedCompleted.length
      ? Math.round(totalDuration / nonSkippedCompleted.length)
      : 0,
  };
};

export const aggregateFromRingBuffer = async (reader, lookback = 1000) => {
  const logs = await reader.consume(lookback);
  const suites = aggregateLogs(logs);

  return Object.values(suites).map(calculateStats);
};

export const aggregateFromLogs = (logs) => {
  const suites = aggregateLogs(logs);
  return Object.values(suites).map(calculateStats);
};
