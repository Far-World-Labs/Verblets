import { debug } from '../../lib/debug/index.js';
import llm from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import { extractCodeWindow } from '../../lib/code-extractor/index.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { DomainEvent, Outcome, ErrorPosture } from '../../lib/progress/constants.js';
import { getOption, nameStep, getOptions, withPolicy } from '../../lib/context/option.js';
import parallelBatch from '../../lib/parallel-batch/index.js';
import { asXML } from '../../prompts/wrap-variable.js';

const name = 'test-analyzer';

// File-level constants
const DEFAULT_MAX_TOKENS = 300;
const DEFAULT_MAX_WINDOW = 50;
const DEFAULT_CONTEXT = 25;
const DEFAULT_ANALYSIS_DEPTH = {
  context: DEFAULT_CONTEXT,
  maxWindow: DEFAULT_MAX_WINDOW,
  maxTokens: DEFAULT_MAX_TOKENS,
};

const ANALYSIS_DEPTH_LEVELS = {
  low: { context: 10, maxWindow: 25, maxTokens: 150 },
  med: DEFAULT_ANALYSIS_DEPTH,
  high: { context: 50, maxWindow: 100, maxTokens: 600 },
};

// ===== Option Mappers =====

/**
 * Map analysisDepth option to context/window/token config.
 * Accepts 'low'|'high' or a raw {context, maxWindow, maxTokens} object.
 * @param {string|Object|undefined} value
 * @returns {{ context: number, maxWindow: number, maxTokens: number }}
 */
export const mapAnalysisDepth = (value) => {
  if (value === undefined) return DEFAULT_ANALYSIS_DEPTH;
  if (typeof value === 'object') return value;
  return ANALYSIS_DEPTH_LEVELS[value] ?? DEFAULT_ANALYSIS_DEPTH;
};

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
const calculateCodeWindow = (
  testLine,
  testLineCount,
  assertionLine,
  { context, maxWindow } = {}
) => {
  const contextSize = context || DEFAULT_CONTEXT;
  const windowLimit = maxWindow || DEFAULT_MAX_WINDOW;
  if (!testLine || !assertionLine) return contextSize;

  const testEndLine = testLine + (testLineCount || 0);
  const beforeAssertion = assertionLine - testLine;
  const afterAssertion = testEndLine - assertionLine;

  // Show whole test if it fits
  if (testLineCount && testLineCount <= windowLimit) {
    return Math.max(beforeAssertion, afterAssertion) + 2;
  }

  // Otherwise balance around assertion within test bounds
  return Math.min(contextSize, Math.max(beforeAssertion, afterAssertion));
};

/**
 * Analyzes test failures using AI
 * @param {Array} logs - Complete test execution logs from test-start to test-complete
 * @param {Object} config - Options including maxAttempts
 */
export default async function analyzeTestError(logs, config = {}) {
  if (Array.isArray(logs) && logs.length > 0 && Array.isArray(logs[0])) {
    return parallelBatch(logs, (logGroup) => analyzeTestError(logGroup, config), {
      maxParallel: 3,
      errorPosture: ErrorPosture.resilient,
      abortSignal: config.abortSignal,
      label: 'test-analyzer:collection',
    });
  }
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();
  emitter.emit({ event: DomainEvent.input, value: logs });
  const { analysisDepth: depthConfig } = await getOptions(runConfig, {
    analysisDepth: withPolicy(mapAnalysisDepth),
  });

  const contextSize = await getOption('contextSize', runConfig, depthConfig.context);
  const maxWindow = await getOption('maxWindow', runConfig, depthConfig.maxWindow);
  const maxTokens = await getOption('maxTokens', runConfig, depthConfig.maxTokens);
  if (!logs || logs.length === 0) {
    debug('analyzeTestError: No logs provided');
    emitter.complete({ outcome: Outcome.success });
    return '';
  }

  const testStart = getTestStart(logs);
  const testComplete = getTestComplete(logs);
  const failedAssertion = getFailedAssertion(logs);

  if (!testStart || !testComplete) {
    debug('analyzeTestError: Missing test-start or test-complete logs');
    emitter.complete({ outcome: Outcome.success });
    return '';
  }

  try {
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

    const windowSize = calculateCodeWindow(testInfo.line, testInfo.lineCount, assertionLine, {
      context: contextSize,
      maxWindow,
    });

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

${asXML(testSnippet, { tag: 'test-code' })}

${asXML(
  executionLogs.length > 0
    ? executionLogs.map((log) => JSON.stringify(log)).join('\n')
    : 'No logs captured',
  { tag: 'execution-logs' }
)}

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

    const response = await retry(() => llm(prompt, { ...runConfig, maxTokens }), {
      label: 'test-analyzer',
      config: runConfig,
    });

    const result = response.trim();
    emitter.emit({ event: DomainEvent.output, value: result });
    emitter.complete({ outcome: Outcome.success });

    return result;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

analyzeTestError.knownTexts = [];
