import chatgpt from '../../lib/chatgpt/index.js';

export default async function llmExpect(actual, expected, constraint, options = {}) {
  const { context, ...otherOptions } = options;

  // Build the assertion prompt
  let prompt;
  if (constraint) {
    prompt = `Given this constraint: "${constraint}"
    
Actual value: ${JSON.stringify(actual, null, 2)}

${
  context ? `Additional context: ${JSON.stringify(context, null, 2)}\n` : ''
}Does the actual value satisfy the constraint? Answer only "True" or "False".`;
  } else if (expected !== undefined) {
    prompt = `Does the actual value strictly equal the expected value?

Actual: ${JSON.stringify(actual, null, 2)}
Expected: ${JSON.stringify(expected, null, 2)}

${
  context ? `Additional context: ${JSON.stringify(context, null, 2)}\n` : ''
}Answer only "True" or "False".`;
  } else {
    throw new Error('Either expected value or constraint must be provided');
  }

  try {
    const response = await chatgpt(prompt);
    const result = response.trim().toLowerCase() === 'true';

    // Throw by default unless explicitly disabled
    const shouldThrow = otherOptions.throw !== false;

    if (!result && shouldThrow) {
      const contextInfo = context ? `\nContext: ${JSON.stringify(context, null, 2)}` : '';
      const errorMessage = `LLM assertion failed: ${
        constraint || 'Does the actual value strictly equal the expected value?'
      }${contextInfo}`;
      throw new Error(errorMessage);
    }

    return result;
  } catch (error) {
    if (error.message.includes('LLM assertion failed')) {
      throw error; // Re-throw our custom errors
    }
    throw new Error(`LLM expectation failed due to error: ${error.message}`);
  }
}
