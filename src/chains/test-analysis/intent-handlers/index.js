/**
 * Intent Handler Registry
 * Maps intent function names to their implementations
 */

import { showLLMPerformanceMetrics } from './llm-performance.js';
import { showTestErrors } from './test-errors.js';
import { listAllPrompts } from './prompt-inventory.js';
import { analyzePrompt } from './analyze-prompt.js';
import { analyzeFunction } from './analyze-function.js';
import { showAiInputOutput } from './show-ai-io.js';
import { listModuleFunctions } from './list-functions.js';

// Registry of all intent handlers
export const handlers = {
  showLLMPerformanceMetrics,
  showTestErrors,
  listAllPrompts,
  analyzePrompt,
  analyzeFunction,
  showAiInputOutput,
  listModuleFunctions,
};

/**
 * Create an intent handler with context
 * Higher-order function that captures context and returns a handler
 */
export function createIntentHandler(context) {
  return async function (functionName, args) {
    const handler = handlers[functionName];

    if (!handler) {
      throw new Error(`No handler found for function: ${functionName}`);
    }

    // Call the handler with context and args
    return await handler(context, args);
  };
}
