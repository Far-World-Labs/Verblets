/**
 * Default intents extracted from available schemas
 */

import showLLMPerformanceMetricsSchema from '../schemas/show-llm-performance-metrics.json';
import listAllPromptsSchema from '../schemas/list-all-prompts.json';
import analyzePromptSchema from '../schemas/analyze-prompt.json';
import showTestErrorsSchema from '../schemas/show-test-errors.json';
import analyzeFunctionSchema from '../schemas/analyze-function.json';
import showAiInputOutputSchema from '../schemas/show-ai-input-output.json';
import listModuleFunctionsSchema from '../schemas/list-module-functions.json';

// Collect all schemas
const allSchemas = {
  showLLMPerformanceMetrics: showLLMPerformanceMetricsSchema,
  listAllPrompts: listAllPromptsSchema,
  analyzePrompt: analyzePromptSchema,
  showTestErrors: showTestErrorsSchema,
  analyzeFunction: analyzeFunctionSchema,
  showAiInputOutput: showAiInputOutputSchema,
  listModuleFunctions: listModuleFunctionsSchema,
};

/**
 * Get default intents from schema descriptions
 * @returns {string[]} Array of intent description strings
 */
export function getDefaultIntents() {
  // Extract descriptions from schemas, filtering out parameterized ones
  return Object.values(allSchemas)
    .filter((schema) => {
      // Only include schemas that don't require parameters
      const requiredParams = schema.required || [];
      return requiredParams.length === 0;
    })
    .map((schema) => schema.description);
}

/**
 * Get all available intent schemas
 * @returns {Object} Object with schema names as keys
 */
export function getAllSchemas() {
  return allSchemas;
}
