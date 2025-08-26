/**
 * Test Errors Handler
 */

import { cyan, bold } from '../output-utils.js';

export function showTestErrors(context, _args) {
  const failedTests = context.testData?.tests?.filter((t) => !t.passed) || [];

  if (failedTests.length === 0) {
    return `${bold(cyan('TEST ERRORS'))} [MOCKED]
      No test failures detected - all tests passed!`;
  }

  const errorList = failedTests
    .map((test) => `      • ${test.name}: ${test.error || 'Failed'}`)
    .join('\n');

  return `${bold(cyan('TEST ERRORS'))} [MOCKED]
      ${failedTests.length} test(s) failed:
${errorList}`;
}
