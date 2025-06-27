import chatgpt from '../../lib/chatgpt/index.js';
import fs from 'fs';
import path from 'path';
import wrapVariable from '../../prompts/wrap-variable.js';

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
 * Generate intelligent advice for failed assertions
 */
async function generateAdvice(actual, expected, constraint, codeContext, callerInfo) {
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
    return 'Unable to generate debugging advice due to LLM error.';
  }
}

/**
 * Enhanced LLM expectation with debugging features
 */
export async function expect(actual, expected, constraint) {
  const mode = process.env.LLM_EXPECT_MODE || 'none';
  const callerInfo = getCallerInfo();

  // Build the assertion prompt
  let prompt;
  if (constraint && expected === undefined) {
    // Constraint-only mode
    prompt = `Given this constraint: "${constraint}"
    
Actual value: ${JSON.stringify(actual, null, 2)}

Does the actual value satisfy the constraint? Answer only "True" or "False".`;
  } else if (constraint && expected !== undefined) {
    // Both expected and constraint provided - use constraint
    prompt = `Given this constraint: "${constraint}"
    
Actual value: ${JSON.stringify(actual, null, 2)}
Expected value: ${JSON.stringify(expected, null, 2)}

Does the actual value satisfy the constraint? Answer only "True" or "False".`;
  } else if (expected !== undefined) {
    // Expected value only
    prompt = `Does the actual value strictly equal the expected value?

Actual: ${JSON.stringify(actual, null, 2)}
Expected: ${JSON.stringify(expected, null, 2)}

Answer only "True" or "False".`;
  } else {
    throw new Error('Either expected value or constraint must be provided');
  }

  try {
    const response = await chatgpt(prompt);
    const passed = response.trim().toLowerCase() === 'true';

    // Prepare result structure
    const result = {
      passed,
      advice: null,
      file: callerInfo.file,
      line: callerInfo.line,
    };

    // Handle failure cases based on mode
    if (!passed) {
      if (mode === 'info' || mode === 'error') {
        const codeContext = getCodeContext(callerInfo.file, callerInfo.line);
        result.advice = await generateAdvice(actual, expected, constraint, codeContext, callerInfo);

        const message = `LLM Assertion Failed at ${path.basename(callerInfo.file)}:${
          callerInfo.line
        }
${result.advice}`;

        if (mode === 'error') {
          throw new Error(message);
        } else if (mode === 'info') {
          console.info(message);
        }
      }
    }

    return [passed, result];
  } catch (error) {
    if (error.message.includes('LLM Assertion Failed')) {
      throw error; // Re-throw our custom errors
    }
    throw new Error(`LLM expectation failed due to error: ${error.message}`);
  }
}

/**
 * Fluent API wrapper for expect function
 */
class ExpectWrapper {
  constructor(actual) {
    this.actual = actual;
  }

  async toSatisfy(constraint) {
    const [passed] = await expect(this.actual, undefined, constraint);
    return passed;
  }

  async toEqual(expected) {
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
export default async function expectSimple(actual, expected, constraint) {
  const [passed] = await expect(actual, expected, constraint);
  return passed;
}
