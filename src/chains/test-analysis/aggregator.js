/**
 * Aggregates test data from ring buffer
 */

const aggregateLogs = (logs) =>
  logs.reduce((suites, log) => {
    if (!log.event || !log.testIndex) return suites;

    const suite = log.suite || 'default';
    if (!suites[suite]) suites[suite] = { tests: {}, name: suite };

    const test = suites[suite].tests[log.testIndex] || {};

    switch (log.event) {
      case 'test-complete':
        test.state = log.state;
        test.duration = log.duration || 0;
        break;
      case 'test-start':
        test.name = log.testName;
        break;
    }

    suites[suite].tests[log.testIndex] = test;
    return suites;
  }, {});

const calculateStats = (suite) => {
  const tests = Object.values(suite.tests);
  const completed = tests.filter((t) => t.state);
  const passed = completed.filter((t) => t.state === 'pass');
  const totalDuration = completed.reduce((sum, t) => sum + t.duration, 0);

  return {
    name: suite.name,
    testCount: tests.length,
    passedCount: passed.length,
    avgDuration: completed.length ? Math.round(totalDuration / completed.length) : 0,
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
