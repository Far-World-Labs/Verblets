import chatgpt from '../../lib/chatgpt/index.js';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import wrapVariable from '../../prompts/wrap-variable.js';
import { env } from '../../lib/env/index.js';
import { expectCore, handleAssertionResult } from './shared.js';

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
 * Get the calling file and line number from stack trace
 */
function getCallerInfo() {
  // stack[0] is Error, stack[1] is this function, stack[2] is expect wrapper,
  // stack[3] should be the caller
  const line = new Error().stack.split('\n')[3] || '';
  const match = line.match(/\((.+):(\d+):\d+\)/) || line.match(/at (.+):(\d+):(\d+)/);
  if (match) {
    return { file: match[1], line: parseInt(match[2], 10) };
  }
  return { file: 'unknown', line: 0 };
}

/**
 * Read code context around the assertion
 */
function getCodeContext(filePath, lineNumber) {
  try {
    if (!fs.existsSync(filePath)) return null;

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
    return null;
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

async function findModuleUnderTest(filePath, lineNumber) {
  const context = getCodeContext(filePath, lineNumber);
  const imports = getImports(filePath);
  const prompt = `Given the following code snippet and import list, identify the import path of the function or module under test.\nImports:\n${imports}\n\nSnippet:\n${
    context?.lines.join('\n') || ''
  }\n\nRespond with the import path or 'unknown'.`;
  try {
    return (await chatgpt(prompt, { modelOptions: { modelName: 'fastGoodCheapCoding' } })).trim();
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
  callerInfo
) {
  const contextInfo = codeContext
    ? `\nCode context around assertion (line ${codeContext.assertionLine}):\n${wrapVariable(
        codeContext.lines.join('\n'),
        { tag: 'code-context' }
      )}`
    : '';

  const imports = getImports(callerInfo.file);
  const modulePath = await findModuleUnderTest(callerInfo.file, callerInfo.line);

  let moduleCode = '';
  if (modulePath && modulePath !== 'unknown') {
    const resolved = path.resolve(path.dirname(callerInfo.file), modulePath);
    if (fs.existsSync(resolved)) {
      moduleCode = fs.readFileSync(resolved, 'utf8');
    }
  }

  const prompt = `You are a debugging assistant helping with a failed LLM assertion.

ASSERTION DETAILS:
- Actual value: ${JSON.stringify(actual, null, 2)}
- Expected value: ${expected ? JSON.stringify(expected, null, 2) : 'N/A'}
- Constraint: ${constraint || 'N/A'}
- File: ${callerInfo.file}:${callerInfo.line}

${contextInfo}

Imports in the file:\n${wrapVariable(imports, { tag: 'imports' })}

Implementation under test (${modulePath || 'unknown'}):\n${wrapVariable(moduleCode, {
    tag: 'implementation',
  })}

Provide structured debugging advice in this format:

ISSUE: [Brief description of why the assertion failed]
FIX: [Specific actionable steps to resolve the issue]
CONTEXT: [Additional context about the problem and potential root causes]

Keep your response concise but actionable. Focus on practical solutions.`;

  try {
    return await chatgpt(prompt, { modelOptions: { modelName: 'fastGoodCheapCoding' } });
  } catch {
    // Fallback to shared generateAdvice if introspection fails
    const { generateAdvice } = await import('./shared.js');
    return await generateAdvice(actual, expected, constraint, codeContext, callerInfo);
  }
}

/**
 * Enhanced LLM expectation with debugging features
 */
export async function expect(actual, expected, constraint) {
  const mode = env.LLM_EXPECT_MODE || 'none';

  const callerInfo = getCallerInfo();

  // Get code context if mode requires it and not in examples
  let codeContext = null;
  if ((mode === 'warn' || mode === 'info' || mode === 'error') && !env.EXAMPLES) {
    codeContext = getCodeContext(callerInfo.file, callerInfo.line);
  }

  // Add display path to caller info
  if (callerInfo.file) {
    callerInfo.displayPath = getDisplayPath(callerInfo.file);
  }

  // Try to find module under test if codeContext is available
  if (codeContext) {
    try {
      const moduleUnderTest = await findModuleUnderTest(callerInfo.file, callerInfo.line);
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
  const passes = await expectCore(actual, expected, constraint, { callerInfo, codeContext });

  // Generate advice if needed
  let advice = null;
  if (!passes && (mode === 'warn' || mode === 'info' || mode === 'error')) {
    advice = await generateAdviceWithIntrospection(
      actual,
      expected,
      constraint,
      codeContext,
      callerInfo
    );
  }

  // Handle result based on mode - this may throw an error in 'error' mode
  try {
    const result = handleAssertionResult(
      passes,
      mode,
      actual,
      expected,
      constraint,
      advice,
      callerInfo
    );
    // For backward compatibility with existing tests
    return [result, { passed: result, advice, file: callerInfo.file, line: callerInfo.line }];
  } catch (error) {
    // In error mode, handleAssertionResult throws - let it propagate
    if (mode === 'error') {
      throw error;
    }
    // For other modes, this shouldn't happen but handle gracefully
    return [false, { passed: false, advice, file: callerInfo.file, line: callerInfo.line }];
  }
}

/**
 * Fluent API wrapper for expect function
 */
class ExpectWrapper {
  constructor(actual) {
    this.actual = actual;
  }

  async toSatisfy(constraint, options = {}) {
    if (options.throws === false) {
      try {
        const [passed] = await expect(this.actual, undefined, constraint);
        return passed;
      } catch {
        return false;
      }
    }
    const [passed] = await expect(this.actual, undefined, constraint);
    return passed;
  }

  async toEqual(expected, options = {}) {
    if (options.throws === false) {
      try {
        const [passed] = await expect(this.actual, expected, undefined);
        return passed;
      } catch {
        return false;
      }
    }
    const [passed] = await expect(this.actual, expected, undefined);
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

// Export aiExpect as default for cleaner imports
export default aiExpect;
