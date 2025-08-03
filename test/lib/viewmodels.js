// ============================================================================
// VIEWMODELS - Transform logs into structured data for display
// ============================================================================

// Build test run viewmodel from logs
export const buildRunViewModel = (logs) => {
  const runStart = logs.find(l => l.event === 'run-start');
  const runComplete = logs.find(l => l.event === 'run-complete');
  
  return {
    runId: runStart?.runId,
    environment: runStart?.environment,
    startTime: runStart?.ts,
    endTime: runComplete?.ts,
    duration: runStart && runComplete ? 
      new Date(runComplete.ts) - new Date(runStart.ts) : null,
  };
};

// Build suite viewmodel from logs
export const buildSuiteViewModel = (logs, suiteId) => {
  const suiteStart = logs.find(l => l.event === 'suite-start' && l.suiteId === suiteId);
  const suiteComplete = logs.find(l => l.event === 'suite-complete' && l.suiteId === suiteId);
  
  // Get all tests for this suite
  const testStarts = logs.filter(l => l.event === 'test-start' && l.suiteId === suiteId);
  const testIds = testStarts.map(t => t.testId);
  
  // Get test results
  const testCompletes = logs.filter(l => 
    l.event === 'test-complete' && testIds.includes(l.testId)
  );
  
  const passed = testCompletes.filter(t => t.state === 'pass').length;
  const failed = testCompletes.filter(t => t.state === 'fail').length;
  const total = testStarts.length;
  
  return {
    suiteId,
    name: suiteStart?.suite,
    filePath: suiteStart?.filePath,
    passed,
    failed,
    total,
    startTime: suiteStart?.ts,
    endTime: suiteComplete?.ts,
    duration: suiteStart && suiteComplete ?
      new Date(suiteComplete.ts) - new Date(suiteStart.ts) : null,
    tests: testIds.map(testId => buildTestViewModel(logs, testId)),
  };
};

// Build test viewmodel from logs
export const buildTestViewModel = (logs, testId) => {
  const testStart = logs.find(l => l.event === 'test-start' && l.testId === testId);
  const testComplete = logs.find(l => l.event === 'test-complete' && l.testId === testId);
  
  // Get all events for this test
  const testLogs = logs.filter(l => l.testId === testId);
  const assertions = testLogs.filter(l => l.event === 'assertion');
  const verbletCalls = testLogs.filter(l => l.event === 'verblet-call');
  const aiAnalyses = testLogs.filter(l => l.event === 'ai-analysis');
  
  // Find failure details
  const failedAssertion = assertions.find(a => !a.passed);
  const failedVerblet = verbletCalls.find(v => !v.passed);
  
  return {
    testId,
    name: testStart?.testName,
    state: testComplete?.state,
    duration: testComplete?.duration,
    assertions,
    verbletCalls,
    aiAnalyses,
    failure: failedAssertion || failedVerblet || null,
  };
};

// Extract all suites from logs
export const extractSuites = (logs) => {
  const suiteStarts = logs.filter(l => l.event === 'suite-start');
  return suiteStarts.map(s => s.suiteId);
};

// Extract failed tests from logs
export const extractFailedTests = (logs) => {
  const failedCompletes = logs.filter(l => 
    l.event === 'test-complete' && l.state === 'fail'
  );
  
  return failedCompletes.map(t => buildTestViewModel(logs, t.testId));
};

// Find patterns across failures
export const findFailurePatterns = (logs) => {
  const failedTests = extractFailedTests(logs);
  
  // Group by failure type
  const patterns = {};
  
  failedTests.forEach(test => {
    const key = test.failure?.expected + ':' + test.failure?.actual;
    if (!patterns[key]) {
      patterns[key] = [];
    }
    patterns[key].push(test);
  });
  
  return Object.entries(patterns)
    .map(([key, tests]) => ({
      pattern: key,
      count: tests.length,
      tests,
    }))
    .sort((a, b) => b.count - a.count);
};