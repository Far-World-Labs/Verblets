import chatGPT from '../../lib/chatgpt/index.js';
import retry from '../../lib/retry/index.js';
import { extractCodeWindow } from '../../lib/code-extractor/index.js';

// File-level constants
const MAX_TOKENS = 300;
const MAX_WINDOW = 50;
const DEFAULT_CONTEXT = 25;

// Pure predicates
const isEvent = (event) => (log) => log.event === event;
const isTestStart = isEvent('test-start');
const isTestComplete = isEvent('test-complete');
const isAssertion = (log) =>
  log.event === 'expect' ||
  log.event === 'ai-expect' ||
  log.event === 'bool-result' ||
  log.event === 'assertion';

const isFailed = (log) => log.passed === false;

// Pure data extraction
const getTestStart = (logs) => logs.find(isTestStart);
const getTestComplete = (logs) => logs.find(isTestComplete);
const getAssertions = (logs) => logs.filter(isAssertion);
const getFailedAssertion = (logs) => getAssertions(logs).find(isFailed);

// Pure window calculation
const calculateCodeWindow = (testLine, testLineCount, assertionLine) => {
  if (!testLine || !assertionLine) return DEFAULT_CONTEXT;

  const testEndLine = testLine + (testLineCount || 0);
  const beforeAssertion = assertionLine - testLine;
  const afterAssertion = testEndLine - assertionLine;

  // Show whole test if it fits
  if (testLineCount && testLineCount <= MAX_WINDOW) {
    return Math.max(beforeAssertion, afterAssertion) + 2;
  }

  // Otherwise balance around assertion within test bounds
  return Math.min(DEFAULT_CONTEXT, Math.max(beforeAssertion, afterAssertion));
};

/**
 * Analyzes test failures using AI
 * @param {Array} logs - Complete test execution logs from test-start to test-complete
 * @param {Object} options - Options including maxAttempts
 */
export default async function analyzeTestError(logs, options = {}) {
  const { maxAttempts = 3, onProgress } = options;
  if (!logs || logs.length === 0) {
    console.error('analyzeTestError: No logs provided');
    return '';
  }

  const testStart = getTestStart(logs);
  const testComplete = getTestComplete(logs);
  const failedAssertion = getFailedAssertion(logs);

  if (!testStart || !testComplete) {
    console.error('analyzeTestError: Missing test-start or test-complete logs');
    return '';
  }

  // Build test info
  const testInfo = {
    name: testStart.testName,
    file: testStart.file,
    line: testStart.line,
    lineCount: testStart.testLineCount || 0,
  };

  // Use the file from the test info
  const actualTestFile = testInfo.file;

  // Extract test code showing the failed assertion
  const assertionLine = failedAssertion?.line || testInfo.line;

  const windowSize = calculateCodeWindow(testInfo.line, testInfo.lineCount, assertionLine);

  const testSnippet =
    actualTestFile && assertionLine
      ? extractCodeWindow(actualTestFile, assertionLine, windowSize)
      : '';

  // Build assertion data
  const assertion = failedAssertion
    ? {
        expected: failedAssertion.expected,
        actual: failedAssertion.actual,
        passed: !!failedAssertion.passed,
        description: failedAssertion.description,
      }
    : {};

  // Include all logs for the test as NDJSON
  const executionLogs = logs;

  const prompt = `Failure: ${testInfo.name}

Expected: ${assertion.expected ?? 'undefined'}
Actual: ${assertion.actual ?? 'undefined'}

${
  testSnippet
    ? `<test-code>
${testSnippet}
</test-code>`
    : ''
}

${
  executionLogs.length > 0
    ? `<execution-logs>\n${executionLogs
        .map((log) => JSON.stringify(log))
        .join('\n')}\n</execution-logs>`
    : '<execution-logs>No logs captured</execution-logs>'
}

<primary-task>
Provide output in this exact format:

Solution: [One line describing the fix or action needed. If no clear solution exists, state "Needs investigation"]

Discussion:
[Only include this section if the solution needs explanation. Keep to 2-3 sentences maximum. Skip entirely if solution is self-explanatory.]
</primary-task>

<analysis-guidelines>
- Identify what the test is verifying
- Determine why actual differed from expected (code logic, data flow, environment)
- Identify locus of failure: code bug, bad test assumption, env/setup issue, or intentional behavior
- Note any inconsistencies across logs/assertion metadata
- Flag likely red herrings or non-issues
- Identify confusing behavior patterns
- Infer possible missing code paths if relevant
- Be diagnostic-grade precise but succinct
- Think like a debugging engineer reviewing CI logs
- State exactly what's needed if critical information is missing
</analysis-guidelines>`;

  try {
    const response = await retry(
      () => chatGPT(prompt, { modelOptions: { max_tokens: MAX_TOKENS } }),
      { maxAttempts, onProgress, label: 'test analyzer' }
    );
    return response.trim();
  } catch (error) {
    console.error('AI analysis failed:', error.message);
    return '';
  }
}
