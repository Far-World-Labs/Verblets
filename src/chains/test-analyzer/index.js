import chatGPT from '../../lib/chatgpt/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { extractCodeWindow } from '../../lib/code-extractor/index.js';

/**
 * Analyzes test failures using AI
 */
export default async function analyzeTestError({
  testName,
  testFile,
  testLine,
  logs,
  testSnippet,
  failureDetails,
}) {
  // Build structured data for each section
  const testInfo = {};
  if (testName) testInfo.name = testName;
  if (testFile) testInfo.file = testFile;
  if (testLine) testInfo.line = testLine;

  // Extract or use provided test code
  if (!testSnippet && testFile && testLine) {
    testSnippet = extractCodeWindow(testFile, testLine, 10);
  }

  // Build assertion/expectation data
  const assertion = {};
  if (failureDetails) {
    assertion.expected = failureDetails.expected;
    assertion.actual = failureDetails.actual || failureDetails.result;
    assertion.passed = failureDetails.passed;
    if (failureDetails.description) {
      assertion.description = failureDetails.description;
    }
  }

  // Filter and structure execution logs
  const executionLogs = [];
  if (logs && logs.length > 0) {
    logs.forEach((log) => {
      if (
        log.event === 'bool-result' ||
        log.event === 'assertion' ||
        log.event === 'ai-validation' ||
        log.event === 'error' ||
        log.error
      ) {
        executionLogs.push({
          event: log.event,
          ...log,
        });
      }
    });
  }

  // KEEP THIS DO NOT DELETE - Original detailed format for future use:
  /* 
  const outputFormat = `Test: ${testName}  
Expected: ${assertion.expected}
Actual: ${assertion.actual}

Analysis:
  Explain exactly what the test is verifying.
  Explain why the actual result differed (code logic, data flow, env, etc).
  Identify the locus of failure: code bug, bad test assumption, env/setup, or intentional.
  Suggest what to inspect or fix first, if resolution is possible from data.
  Mention any inconsistency across logs/assertion metadata.
  Highlight any likely red herrings or non-issues.
  Call out any confusing behavior (e.g. actual: null vs result: false).
  If relevant, infer possible missing code paths (e.g. early return, exception swallowed).

Goals:
  Be succinct but diagnostic-grade precise.
  Do not pad with generic disclaimers.
  Prioritize signal: what failed, where, why, and what's likely fixable now.
  Think like a debugging engineer reviewing CI logs under pressure.

If critical information is missing, state exactly what's needed to diagnose further.`;

  const prompt = `You are a diagnostic assistant reviewing the cause of a failed test case in a JavaScript project.

Analyze the following structured test output:

${asXML(testInfo, { tag: 'test-info' })}

${testSnippet ? asXML(testSnippet, { tag: 'test-code' }) : ''}

${asXML(assertion, { tag: 'assertion' })}

${executionLogs.length > 0 ? asXML(executionLogs, { tag: 'execution-logs' }) : ''}

${asXML(outputFormat, { tag: 'output-format' })}`;
  */

  // Succinct analysis format - just the analysis part
  const outputFormat = `Analysis (be succinct):
- What the test verifies
- Why it failed (logic/data/env) 
- Root cause location${testSnippet ? ' (reference line numbers from code)' : ''}
- Actionable fix

Be diagnostic-precise. No fluff.`;

  const prompt = `Analyze this JavaScript test failure:

Test: ${testName}  
Expected: ${assertion.expected}
Actual: ${assertion.actual}

${asXML(testInfo, { tag: 'test-info' })}

${testSnippet ? asXML(testSnippet, { tag: 'test-code' }) : ''}

${asXML(assertion, { tag: 'assertion' })}

${executionLogs.length > 0 ? asXML(executionLogs, { tag: 'execution-logs' }) : ''}

${outputFormat}`;

  try {
    const response = await chatGPT(prompt, { modelOptions: { max_tokens: 300 } });
    return response.trim();
  } catch (error) {
    console.error('AI analysis failed:', error.message);
    return '';
  }
}
