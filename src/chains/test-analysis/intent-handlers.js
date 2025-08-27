/**
 * Intent Processing with Auto Chain
 * Uses function calling to determine which intent handler to invoke
 */

import auto from '../../verblets/auto/index.js';
import { createLifecycleLogger } from '../../lib/lifecycle-logger/index.js';
import { createIntentHandler } from './intent-handlers/index.js';
import { cyan, bold } from './output-utils.js';

// Import all schemas
import showLLMPerformanceMetricsSchema from './schemas/show-llm-performance-metrics.json';
import listAllPromptsSchema from './schemas/list-all-prompts.json';
import analyzePromptSchema from './schemas/analyze-prompt.json';
import showTestErrorsSchema from './schemas/show-test-errors.json';
import analyzeFunctionSchema from './schemas/analyze-function.json';
import showAiInputOutputSchema from './schemas/show-ai-input-output.json';
import listModuleFunctionsSchema from './schemas/list-module-functions.json';

// Collect all schemas for auto
const intentSchemas = {
  showLLMPerformanceMetrics: showLLMPerformanceMetricsSchema,
  listAllPrompts: listAllPromptsSchema,
  analyzePrompt: analyzePromptSchema,
  showTestErrors: showTestErrorsSchema,
  analyzeFunction: analyzeFunctionSchema,
  showAiInputOutput: showAiInputOutputSchema,
  listModuleFunctions: listModuleFunctionsSchema,
};

export async function processIntent(intent, context) {
  // Create logger for this intent processing
  const logger = context.logger || globalThis.logger;
  const lifecycleLogger = logger ? createLifecycleLogger(logger, 'intent-processor') : undefined;

  try {
    // Debug: Check schemas are properly loaded
    if (!Object.keys(intentSchemas).length) {
      console.error('[ERROR] No intent schemas loaded!');
    }

    // Build prompt that describes the task for the LLM to perform
    const prompt = `${intent}

Context: You are analyzing the module at ${context.moduleDir} which has ${
      context.testData?.stats?.total || 0
    } tests.`;

    // Call auto with our intent schemas directly
    const result = await auto(prompt, {
      logger: lifecycleLogger,
      schemas: intentSchemas,
    });

    // Check if no function was matched
    if (result.noMatch) {
      console.log(`[INFO] No function matched for intent: "${intent}", using default`);
    }

    // Create handler with context
    const handleIntent = createIntentHandler(context);

    // Execute the selected handler
    return await handleIntent(result.name, result.arguments || {});
  } catch (error) {
    console.error('Error processing intent:', error);

    // Check if it's a missing handler error
    if (error.message?.includes('No handler found')) {
      return `${bold(cyan('INTENT NOT IMPLEMENTED'))}
      Intent: "${intent}"
      Selected function: ${error.message.split(':')[1]?.trim() || 'unknown'}
      Handler not yet implemented`;
    }

    return `${bold(cyan('INTENT PROCESSING ERROR'))}
      Intent: "${intent}"
      Error: ${error.message}`;
  }
}
