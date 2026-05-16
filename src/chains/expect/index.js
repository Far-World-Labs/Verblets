import llm from '../../lib/llm/index.js';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { asXML } from '../../prompts/wrap-variable.js';
import { env } from '../../lib/env/index.js';
import { expectCore, handleAssertionResult, generateAdvice } from './shared.js';
import { extractFileContext } from '../../lib/logger/index.js';
import { nameStep, getOptions, withPolicy } from '../../lib/context/option.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { DomainEvent, Outcome } from '../../lib/progress/constants.js';

const uncertaintySchema = {
  type: 'object',
  properties: {
    confidence: { type: 'number' },
    confidenceInterval: {
      type: 'object',
      properties: {
        low: { type: 'number' },
        high: { type: 'number' },
      },
      required: ['low', 'high'],
      additionalProperties: false,
    },
    unknowns: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['confidence', 'confidenceInterval', 'unknowns'],
  additionalProperties: false,
};

const name = 'expect';

// ===== Option Mappers =====

/**
 * Map advice option to an advice configuration.
 * Controls the depth of debugging advice when assertions fail.
 * low: basic advice only — no module introspection (no extra LLM call, no file reads).
 * high: full introspection — finds module under test via LLM, reads source, includes in advice prompt.
 * Default (undefined): full introspection (existing behavior).
 * @param {string|object|undefined} value
 * @returns {{ introspection: boolean }}
 */
export const mapAdvice = (value) => {
  if (value === undefined) return { introspection: true };
  if (typeof value === 'object') return value;
  return (
    { low: { introspection: false }, med: { introspection: true }, high: { introspection: true } }[
      value
    ] ?? { introspection: true }
  );
};

/**
 * Get git-aware file path or full path if not in git repo
 */
function getDisplayPath(filePath) {
  try {
    // Try to get git root
    const gitRoot = execSync('git rev-parse --show-toplevel', {
      cwd: path.dirname(filePath),
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'], // Suppress stderr
    }).trim();

    // Return relative path from git root
    return path.relative(gitRoot, filePath);
  } catch {
    // Not in git repo or git not available, return full path
    return filePath;
  }
}

/**
 * Read code context around the assertion
 */
function getCodeContext(filePath, lineNumber) {
  try {
    if (!fs.existsSync(filePath)) return undefined;

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    // Get 400 lines before and 100 lines after
    const start = Math.max(0, lineNumber - 400);
    const end = Math.min(lines.length, lineNumber + 100);

    return {
      lines: lines.slice(start, end),
      startLine: start + 1,
      assertionLine: lineNumber,
    };
  } catch {
    return undefined;
  }
}

function getImports(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content
      .split('\n')
      .filter((l) => l.trim().startsWith('import'))
      .join('\n');
  } catch {
    return '';
  }
}

async function findModuleUnderTest(filePath, lineNumber, config = {}) {
  const context = getCodeContext(filePath, lineNumber);
  const imports = getImports(filePath);
  const prompt = `Given the following code snippet and import list, identify the import path of the function or module under test.

${asXML(imports, { tag: 'imports' })}

${asXML(context?.lines.join('\n') || '', { tag: 'code-snippet' })}

Respond with the import path or 'unknown'.`;
  try {
    return (await llm(prompt, { ...config, llm: { fast: true, good: true, cheap: true } })).trim();
  } catch {
    return 'unknown';
  }
}

/**
 * Generate intelligent advice for failed assertions with file introspection
 */
async function generateAdviceWithIntrospection(
  actual,
  expected,
  constraint,
  codeContext,
  callerInfo,
  config = {}
) {
  const codeContextBlock = codeContext
    ? asXML(codeContext.lines.join('\n'), { tag: 'code-context' })
    : '';

  const imports = getImports(callerInfo.file);
  const modulePath = await findModuleUnderTest(callerInfo.file, callerInfo.line, config);

  let moduleCode = '';
  if (modulePath && modulePath !== 'unknown') {
    const resolved = path.resolve(path.dirname(callerInfo.file), modulePath);
    if (fs.existsSync(resolved)) {
      moduleCode = fs.readFileSync(resolved, 'utf8');
    }
  }

  const assertionDetails = [
    `Actual: ${JSON.stringify(actual, null, 2)}`,
    `Expected: ${expected ? JSON.stringify(expected, null, 2) : 'N/A'}`,
    `Constraint: ${constraint || 'N/A'}`,
    `File: ${callerInfo.file}:${callerInfo.line}`,
  ].join('\n');

  const parts = [
    'You are a debugging assistant helping with a failed LLM assertion.',
    asXML(assertionDetails, { tag: 'assertion-details' }),
    codeContextBlock,
    asXML(imports, { tag: 'imports' }),
    asXML(moduleCode, { tag: 'implementation', name: modulePath || 'unknown' }),
    `Provide structured debugging advice in this format:

ISSUE: [Brief description of why the assertion failed]
FIX: [Specific actionable steps to resolve the issue]
CONTEXT: [Additional context about the problem and potential root causes]

Keep your response concise but actionable. Focus on practical solutions.`,
  ];

  const prompt = parts.filter(Boolean).join('\n\n');

  try {
    return await llm(prompt, { ...config, llm: { fast: true, good: true, cheap: true } });
  } catch {
    return await generateAdvice(actual, expected, constraint, codeContext, callerInfo, config);
  }
}

/**
 * Enhanced LLM expectation with debugging features
 */
export async function expect(actual, expected, constraint, config = {}) {
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();
  emitter.emit({ event: DomainEvent.input, value: actual });
  const { mode: rawMode, introspection } = await getOptions(runConfig, {
    mode: env.VERBLETS_LLM_EXPECT_MODE || 'none',
    advice: withPolicy(mapAdvice, ['introspection']),
  });
  // Tuning-knob convention: an unrecognized mode (typo'd env var or stale
  // config) falls back silently to 'none'. The set is small and stable, so
  // a user who really needs strict mode would notice the no-op quickly.
  const VALID_MODES = new Set(['none', 'warn', 'info', 'error']);
  const mode = VALID_MODES.has(rawMode) ? rawMode : 'none';

  try {
    const callerInfo = extractFileContext(5);

    // Get code context if mode requires it
    let codeContext;
    if (mode === 'warn' || mode === 'info' || mode === 'error') {
      codeContext = getCodeContext(callerInfo.file, callerInfo.line);
    }

    // Add display path to caller info
    if (callerInfo.file) {
      callerInfo.displayPath = getDisplayPath(callerInfo.file);
    }

    // Try to find module under test if codeContext is available and introspection is enabled
    if (codeContext && introspection) {
      try {
        const moduleUnderTest = await findModuleUnderTest(
          callerInfo.file,
          callerInfo.line,
          runConfig
        );
        if (moduleUnderTest !== 'unknown') {
          callerInfo.module = moduleUnderTest;
        }
      } catch {
        // Ignore errors in finding module
      }
    }

    // Validate inputs
    if (expected === undefined && !constraint) {
      throw new Error('Either expected value or constraint must be provided');
    }

    // Run core expect with context
    const passes = await expectCore(
      actual,
      expected,
      constraint,
      { callerInfo, codeContext },
      runConfig
    );

    // Generate advice if needed
    let advice;
    if (!passes && (mode === 'warn' || mode === 'info' || mode === 'error')) {
      if (introspection) {
        advice = await generateAdviceWithIntrospection(
          actual,
          expected,
          constraint,
          codeContext,
          callerInfo,
          runConfig
        );
      } else {
        advice = await generateAdvice(
          actual,
          expected,
          constraint,
          codeContext,
          callerInfo,
          runConfig
        );
      }
    }

    // Emit before handleAssertionResult — it intentionally throws in 'error' mode
    emitter.emit({ event: DomainEvent.output, value: passes });
    emitter.complete({ outcome: Outcome.success });

    // Handle result based on mode - this may throw an error in 'error' mode
    const result = handleAssertionResult(
      passes,
      mode,
      actual,
      expected,
      constraint,
      advice,
      callerInfo
    );

    return [result, { passed: result, advice, file: callerInfo.file, line: callerInfo.line }];
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

function validateUncertainty(u) {
  if (!u || typeof u !== 'object' || Array.isArray(u)) {
    throw new Error(
      `expect: expected uncertainty object from LLM (got ${u === null ? 'null' : typeof u})`
    );
  }
  if (typeof u.confidence !== 'number') {
    throw new Error(`expect: uncertainty.confidence must be a number (got ${typeof u.confidence})`);
  }
  const ci = u.confidenceInterval;
  if (!ci || typeof ci !== 'object' || typeof ci.low !== 'number' || typeof ci.high !== 'number') {
    throw new Error('expect: uncertainty.confidenceInterval must be { low: number, high: number }');
  }
  if (!Array.isArray(u.unknowns)) {
    throw new Error(`expect: uncertainty.unknowns must be an array (got ${typeof u.unknowns})`);
  }
}

async function assessUncertainty(actual, expected, constraint, passed, config) {
  const valueXml = asXML(actual, { tag: 'value', fit: 'compact' });
  const expectedXml =
    expected !== undefined ? asXML(expected, { tag: 'expected', fit: 'compact' }) : '';
  const constraintXml = constraint ? asXML(constraint, { tag: 'constraint', fit: 'compact' }) : '';

  const prompt = `Assess the uncertainty of this assertion result.

${valueXml}
${expectedXml}
${constraintXml}

The assertion ${passed ? 'passed' : 'failed'}.

Evaluate:
- Your confidence in this result (0.0 to 1.0)
- A confidence interval with low and high bounds (0.0 to 1.0)
- Factors that make the assessment uncertain (as a list of unknowns)`;

  const response = await llm(prompt, {
    ...config,
    temperature: 0,
    responseFormat: {
      type: 'json_schema',
      json_schema: { name: 'uncertainty_assessment', schema: uncertaintySchema },
    },
  });

  validateUncertainty(response);
  return response;
}

/**
 * Expect with structured uncertainty output.
 * Wraps the standard expect result with confidence intervals and unknown flags.
 * @param {*} actual - The actual value
 * @param {*} expected - The expected value
 * @param {string} constraint - Optional constraint description
 * @param {Object} config - Configuration options
 * @returns {Promise<[boolean, { passed, uncertainty, file, line }]>}
 */
export async function expectWithUncertainty(actual, expected, constraint, config = {}) {
  const [passed, details] = await expect(actual, expected, constraint, config);

  const runConfig = nameStep('expect:uncertainty', config);
  const emitter = createProgressEmitter('expect:uncertainty', runConfig.onProgress, runConfig);
  emitter.start();
  const uncertainty = await assessUncertainty(actual, expected, constraint, passed, runConfig);
  emitter.uncertainty(uncertainty);
  emitter.complete({ passed });

  return [passed, { ...details, uncertainty }];
}

/**
 * Fluent API wrapper for expect function
 */
class ExpectWrapper {
  constructor(actual) {
    this.actual = actual;
  }

  async toSatisfy(constraint, options = {}) {
    const mode = options.mode !== undefined ? options.mode : 'error';
    const [passed] = await expect(this.actual, undefined, constraint, { mode });
    return passed;
  }

  async toEqual(expected, options = {}) {
    const mode = options.mode !== undefined ? options.mode : 'error';
    const [passed] = await expect(this.actual, expected, undefined, { mode });
    return passed;
  }

  toBe(expected) {
    const actual = this.actual;
    if (actual !== expected) {
      throw new Error(`Expected ${actual} to be ${expected}`);
    }
    return true;
  }
}

/**
 * Create a fluent expectation wrapper
 */
export function aiExpect(actual) {
  return new ExpectWrapper(actual);
}

/**
 * Simple LLM expectation (backward compatibility)
 */
export async function expectSimple(actual, expected, constraint) {
  const [passed] = await expect(actual, expected, constraint);
  return passed;
}

aiExpect.knownTexts = [];

// Export aiExpect as default for cleaner imports
export default aiExpect;
