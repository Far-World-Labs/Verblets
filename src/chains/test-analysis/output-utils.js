import { execSync } from 'child_process';

/**
 * Display utilities for test output
 */

export const getTerminalWidth = () => {
  for (let i = 0; i < 3; i++) {
    try {
      const result = execSync('stty size < /dev/tty', {
        encoding: 'utf8',
        timeout: 1000,
        stdio: ['pipe', 'pipe', 'ignore'],
      }).trim();
      const parts = result.split(' ');
      if (parts.length === 2) {
        const width = parseInt(parts[1], 10);
        if (width > 0) return width;
      }
    } catch {
      // Continue trying
    }
  }

  return 80;
};

export const createSeparator = (width = getTerminalWidth(), char = '─') => {
  return char.repeat(Math.max(1, width));
};

export const writeInitialSeparator = () => {
  console.error(createSeparator());
};

const formatSuiteHeader = (suiteName, passedTests, totalTests, avgDuration) => {
  return `\nSuite: ${suiteName}, Tests: ${passedTests}/${totalTests} passed, Avg: ${avgDuration}ms`;
};

const formatFailedTest = (testName, fileLocation) => {
  return [`Failed Test: ${testName}`, `File: ${fileLocation}`];
};

const formatCodeBlock = (codeSnippet) => {
  if (!codeSnippet) return [];
  return ['```javascript', codeSnippet, '```'];
};

export const displayTestFailure = (suiteData, failureData, analysis, codeSnippet) => {
  const { suiteName, passedTests, totalTests, avgDuration } = suiteData;
  const { testName, fileLocation } = failureData;

  // Build output with proper spacing
  const lines = [];

  // Suite header
  lines.push(formatSuiteHeader(suiteName, passedTests, totalTests, avgDuration));

  // Test details
  lines.push(...formatFailedTest(testName, fileLocation));

  // Code block if available
  if (codeSnippet) {
    lines.push(''); // Empty line before code
    lines.push(...formatCodeBlock(codeSnippet));
  }

  // Analysis if available
  if (analysis && analysis.trim()) {
    lines.push(''); // Empty line before analysis
    lines.push(analysis);
  }

  // Output with final newline
  console.error(`${lines.join('\n')}\n`);
};

export const formatTestSummary = (name, passed, total, avgDuration) =>
  `Suite: ${name} ${passed}/${total} ${avgDuration}ms (average)`;
