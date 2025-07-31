import chatGPT from '../../lib/chatgpt/index.js';

/**
 * Build the error analysis prompt with XML structure
 */
function buildErrorAnalysisPrompt(config) {
  const { testName, logs = [], testSnippet, failureDetails } = config;

  // Format logs for the prompt - focus on failures
  const failedLogs = logs.filter((log) => log.passed === false);
  const formattedLogs = failedLogs
    .map((log) => {
      if (log.event === 'assertion') {
        return `Expected: ${JSON.stringify(log.expected)}
Actual: ${JSON.stringify(log.actual || log.result)}
Description: ${log.description}`;
      } else if (log.event === 'bool-result') {
        return `Bool verblet returned: ${log.result}
Expected: ${log.expected !== undefined ? log.expected : 'true'}`;
      }
      return `${log.event}: expected ${log.expected}, got ${log.result || log.actual}`;
    })
    .join('\n\n');

  const xmlBlocks = [];

  xmlBlocks.push(`<test_name>${testName}</test_name>`);

  if (testSnippet) {
    xmlBlocks.push(`<failing_code>
${testSnippet}
</failing_code>`);
  }

  if (failedLogs.length > 0) {
    xmlBlocks.push(`<failures>
${formattedLogs}
</failures>`);
  }

  if (failureDetails) {
    xmlBlocks.push(`<error>
Expected: ${failureDetails.expected}
Actual: ${failureDetails.result !== undefined ? failureDetails.result : failureDetails.actual}
</error>`);
  }

  return `Analyze this test failure:

${xmlBlocks.join('\n\n')}

In one sentence, explain why it failed and what to change. Be extremely concise.`;
}

/**
 * Analyzes test failures and provides concise, actionable insights
 *
 * @param {Object} config - Configuration object
 * @param {string} config.testName - Name of the failed test
 * @param {string} config.testFile - File path of the test
 * @param {number} config.testLine - Line number where test is defined
 * @param {Array} config.logs - Array of test logs
 * @param {string} [config.sourceCode] - Source code context around the test
 * @param {Object} [config.failureDetails] - Specific failure information
 * @returns {Promise<string>} Analysis result
 */
export default async function analyzeTestError(config) {
  const prompt = buildErrorAnalysisPrompt(config);

  try {
    const analysis = await chatGPT(prompt);
    return analysis.trim();
  } catch (error) {
    throw new Error(`Test analysis failed: ${error.message}`);
  }
}

/**
 * Build the suite summary prompt
 */
function buildSuiteSummaryPrompt(stats) {
  const { suiteName, passed, failed, total, duration } = stats;

  const xmlBlocks = [];

  xmlBlocks.push(`<suite_stats>
Name: ${suiteName}
Passed: ${passed}
Failed: ${failed}
Total: ${total}
Duration: ${duration}ms
Success Rate: ${((passed / total) * 100).toFixed(1)}%
</suite_stats>`);

  if (failed > 0 && stats.failedTests && stats.failedTests.length > 0) {
    xmlBlocks.push(`<failed_tests>
${stats.failedTests.map((test, i) => `${i + 1}. ${test}`).join('\n')}
</failed_tests>`);
  }

  return `Analyze test suite results and provide insights:

${xmlBlocks.join('\n\n')}

Provide:
1. One-line health assessment
2. Key concern if any (or "All tests passing" if none)
3. Recommendation for next steps`;
}

/**
 * Analyzes test suite results and provides a summary
 *
 * @param {Object} stats - Test suite statistics
 * @param {string} stats.suiteName - Name of the test suite
 * @param {number} stats.passed - Number of passed tests
 * @param {number} stats.failed - Number of failed tests
 * @param {number} stats.total - Total number of tests
 * @param {number} stats.duration - Suite duration in milliseconds
 * @param {Array} [stats.failedTests] - Array of failed test names
 * @returns {Promise<Object>} Summary object with insights
 */
export async function analyzeSuiteResults(stats) {
  const { suiteName, passed, failed, total, duration } = stats;

  // For simple cases, return formatted stats without AI
  if (failed === 0) {
    return {
      summary: `${suiteName}: ${passed}/${total} passed in ${duration}ms`,
      healthScore: 100,
      assessment: 'All tests passing',
      recommendations: [],
    };
  }

  // Use AI for more complex analysis when there are failures
  const prompt = buildSuiteSummaryPrompt(stats);

  try {
    const analysis = await chatGPT(prompt, {
      modelOptions: {
        modelName: 'fastGood',
        temperature: 0.3,
        maxTokens: 150,
      },
    });

    return {
      summary: `${suiteName}: ${passed}/${total} passed in ${duration}ms`,
      healthScore: (passed / total) * 100,
      analysis: analysis.trim(),
    };
  } catch {
    // Fallback to basic analysis
    return {
      summary: `${suiteName}: ${passed}/${total} passed in ${duration}ms`,
      healthScore: (passed / total) * 100,
      recommendations: ['Fix failing tests before deployment'],
    };
  }
}
