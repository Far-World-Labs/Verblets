// Shared expect functionality between Node and browser
import chatgpt from '../../lib/chatgpt/index.js';
import { asXML } from '../../prompts/wrap-variable.js';

/**
 * Core expect implementation
 * @param {*} actual - The actual value
 * @param {*} expected - The expected value
 * @param {string} constraint - Optional constraint description
 * @param {Object} context - Optional context (file info, code context, etc.)
 * @returns {Promise<boolean>} - Whether the assertion passes
 */
export async function expectCore(actual, expected, constraint, context = {}) {
  const { callerInfo, codeContext } = context;

  // Build debug context if available
  let debugContext = '';
  if (codeContext) {
    const location = callerInfo ? `${callerInfo.file}:${callerInfo.line}` : '';
    debugContext = asXML(codeContext.lines.join('\n'), {
      tag: 'debug-context',
      attributes: location ? { location } : {},
    });
  }

  // Build the assertion prompt
  const valueXml = asXML(actual, { tag: 'value', fit: 'compact' });
  const expectedXml =
    expected !== undefined ? asXML(expected, { tag: 'expected', fit: 'compact' }) : '';
  const constraintsXml = constraint
    ? asXML(constraint, { tag: 'constraints', fit: 'compact' })
    : '';

  // Default constraint when none provided is semantic equality
  const effectiveConstraint =
    constraint ||
    (expected !== undefined
      ? 'The value and expected value should represent the same identity or meaning. They may have different formats, shapes, or representations, but should denote the same underlying entity or concept.'
      : '');

  const prompt = `Does the value satisfy the constraints?

${valueXml}
${expectedXml}
${constraint ? constraintsXml : asXML(effectiveConstraint, { tag: 'constraints', fit: 'compact' })}
${debugContext ? `\n${debugContext}\n` : ''}
Return true if the value satisfies the constraints, false otherwise. Be balanced and reasonable in your evaluation - default to a generous interpretation unless the constraints explicitly require strict validation. The goal is practical accuracy, not pedantic strictness.`;

  // Make the LLM call
  const response = await chatgpt(prompt, {
    modelOptions: {
      temperature: 0,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'assertion_result',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              value: {
                type: 'boolean',
              },
            },
            required: ['value'],
            additionalProperties: false,
          },
        },
      },
    },
  });

  // chatGPT module returns the value directly when using responseFormat
  return response === true;
}

/**
 * Generate advice for failed assertions
 */
export async function generateAdvice(actual, expected, constraint, codeContext, callerInfo) {
  // Build debug context if available
  let debugContext = '';
  if (codeContext) {
    const location = callerInfo ? `${callerInfo.file}:${callerInfo.line}` : '';
    debugContext = asXML(codeContext.lines.join('\n'), {
      tag: 'debug-context',
      attributes: location ? { location } : {},
    });
  }

  const valueXml = asXML(actual, { tag: 'value', fit: 'compact' });
  const expectedXml =
    expected !== undefined ? asXML(expected, { tag: 'expected', fit: 'compact' }) : '';

  // Default constraint when none provided is semantic equality
  const effectiveConstraint =
    constraint ||
    (expected !== undefined
      ? 'The value and expected value should represent the same identity or meaning.'
      : '');
  const constraintsXml = asXML(effectiveConstraint, { tag: 'constraints', fit: 'compact' });

  const prompt = `Provide debugging advice for this failed assertion:

${valueXml}
${expectedXml}
${constraintsXml}
${debugContext ? `\n${debugContext}\n` : ''}
The assertion failed because the value did not satisfy the constraints.

Provide:
1. Why the assertion likely failed
2. Specific suggestions to fix it
3. Common pitfalls to check

Keep the advice concise and actionable.`;

  return await chatgpt(prompt, {
    modelOptions: {
      temperature: 0.3,
    },
  });
}

/**
 * Handle assertion result based on mode
 */
export function handleAssertionResult(
  passes,
  mode,
  actual,
  expected,
  constraint,
  advice,
  callerInfo
) {
  if (!passes) {
    const displayPath = callerInfo?.displayPath || callerInfo?.file || 'unknown';
    const line = callerInfo?.line || 0;

    let message = `LLM assertion failed at ${displayPath}:${line}`;
    if (advice) {
      message += `\n${advice}`;
    }

    if (mode === 'error') {
      throw new Error(message);
    } else if (mode === 'warn') {
      console.warn(message);
    } else if (mode === 'info') {
      console.info(message);
    }
  }

  return passes;
}
