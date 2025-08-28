/**
 * Test Summary View
 * Builds and renders test summary
 */

import { cyan, green, red, bold, dim } from '../output-utils.js';

export function renderTestSummary(testData) {
  // Calculate average from actual test durations
  const totalDuration = testData.tests.reduce((sum, t) => sum + (t.duration || 0), 0);
  const avgDuration = testData.stats.total ? Math.round(totalDuration / testData.stats.total) : 0;

  // Manually format table for proper alignment
  const statusWidth = 8;
  const durationWidth = 10;
  const testNameWidth = 60;

  const tableHeader = `      ${'Status'.padEnd(statusWidth)}${'Test'.padEnd(
    testNameWidth
  )}${'Duration'.padEnd(durationWidth)}`;
  const separator = `      ${dim('─'.repeat(statusWidth + testNameWidth + durationWidth))}`;

  const tableRows = testData.tests
    .map((test) => {
      const status = test.passed ? green('✓') : red('✗');
      const name =
        test.name.length > testNameWidth
          ? `${test.name.slice(0, testNameWidth - 3)}...`
          : test.name;
      return `      ${status.padEnd(statusWidth + 9)}${name.padEnd(
        testNameWidth
      )}${`${test.duration}ms`.padEnd(durationWidth)}`;
    })
    .join('\n');

  const summary = `      ${testData.stats.passed}/${testData.stats.total} tests passed
      Avg: ${avgDuration}ms per test`;

  // Add errors if any
  const errors = testData.tests
    .filter((t) => t.error || (!t.passed && t.errorLocation))
    .map((t) => {
      let errorMsg = `        ${red(`Error in "${t.name}"`)}`;
      if (t.errorLocation) {
        errorMsg += `\n        ${dim(t.errorLocation)}`;
      }
      if (t.error) {
        errorMsg += `\n        ${red(t.error)}`;
      }
      return errorMsg;
    })
    .join('\n\n');

  const output = `${bold(cyan('TEST SUMMARY'))}
${summary}

${tableHeader}
${separator}
${tableRows}${errors ? `\n\n${errors}` : ''}`;

  return output;
}
