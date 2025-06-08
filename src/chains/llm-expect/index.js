import chatgpt from '../../lib/chatgpt/index.js';
import fs from 'fs';
import path from 'path';

/**
 * Get the calling file and line number from stack trace
 */
function getCallerInfo() {
  const { stack } = new Error();
  const lines = stack.split('\n');

  // Find the first line that's not this file
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('at ') && !line.includes('llm-expect')) {
      const match = line.match(/at .* \((.+):(\d+):\d+\)/);
      if (match) {
        return { file: match[1], line: parseInt(match[2]) };
      }
      // Handle cases without parentheses
      const simpleMatch = line.match(/at (.+):(\d+):\d+/);
      if (simpleMatch) {
        return { file: simpleMatch[1], line: parseInt(simpleMatch[2]) };
      }
    }
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
  } catch (error) {
    return null;
  }
}

/**
 * Generate intelligent advice for failed assertions
 */
async function generateAdvice(actual, expected, constraint, codeContext) {
  const contextInfo = codeContext
    ? `
Code context around assertion (line ${codeContext.assertionLine}):
\`\`\`
${codeContext.lines.join('\n')}
\`\`\`
`
    : '';

  const prompt = `You are a debugging assistant helping with a failed LLM assertion.

ASSERTION DETAILS:
- Actual value: ${JSON.stringify(actual, null, 2)}
- Expected value: ${expected ? JSON.stringify(expected, null, 2) : 'N/A'}
- Constraint: ${constraint || 'N/A'}

${contextInfo}

Provide structured debugging advice in this format:

ISSUE: [Brief description of why the assertion failed]
FIX: [Specific actionable steps to resolve the issue]
CONTEXT: [Additional context about the problem and potential root causes]

Keep your response concise but actionable. Focus on practical solutions.`;

  try {
    return await chatgpt(prompt);
  } catch (error) {
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
  if (constraint) {
    prompt = `Given this constraint: "${constraint}"
    
Actual value: ${JSON.stringify(actual, null, 2)}

Does the actual value satisfy the constraint? Answer only "True" or "False".`;
  } else if (expected !== undefined) {
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
        result.advice = await generateAdvice(actual, expected, constraint, codeContext);

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
 * Simple LLM expectation (backward compatibility)
 */
export default async function llmExpect(actual, expected, constraint) {
  const [passed] = await expect(actual, expected, constraint);
  return passed;
}
