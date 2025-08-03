/**
 * Pure functions for parsing test logs
 */

const extractTestMetadata = (logs) => {
  const metadata = { testNames: {}, testFiles: {}, testLines: {} };
  
  logs.forEach(log => {
    if (log.event === 'test-start') {
      metadata.testNames[log.testIndex] = log.testName;
      metadata.testFiles[log.testIndex] = log.fileName;
      metadata.testLines[log.testIndex] = log.location?.line;
    }
  });
  
  return metadata;
};

const findFailedAssertion = (logs, metadata) => {
  for (const log of logs) {
    if ((log.event === 'assertion' || log.event === 'test-result') && log.passed === false) {
      const fileName = metadata.testFiles[log.testIndex] || 'unknown';
      const lineNumber = log.line || metadata.testLines[log.testIndex];
      
      return {
        ...log,
        testName: metadata.testNames[log.testIndex] || 'Unknown test',
        fileName,
        lineNumber,
        fileLocation: `${fileName}${lineNumber ? ':' + lineNumber : ''}`
      };
    }
  }
  return null;
};

const calculateTestStats = (logs) => {
  let totalTests = 0;
  let passedTests = 0;
  let totalDuration = 0;
  
  logs.forEach(log => {
    if (log.event === 'test-complete') {
      totalTests++;
      if (log.state === 'pass') passedTests++;
      if (log.duration) totalDuration += log.duration;
    }
  });
  
  const avgDuration = totalTests > 0 ? Math.round(totalDuration / totalTests) : 0;
  return { totalTests, passedTests, avgDuration };
};

export const parseTestLogs = (logs) => {
  const metadata = extractTestMetadata(logs);
  const firstFailedAssertion = findFailedAssertion(logs, metadata);
  const stats = calculateTestStats(logs);
  
  return {
    firstFailedAssertion,
    ...stats
  };
};