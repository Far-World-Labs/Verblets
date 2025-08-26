/**
 * JSON schemas for test analysis intent functions
 * These schemas enable auto to parse and map intents to handlers
 */

export const showError = {
  type: 'object',
  description: 'Show a specific error from test execution',
  properties: {
    index: {
      type: 'number',
      description: 'Index of the error to show (0-based)',
      default: 0,
    },
  },
};

export const analyzePrompt = {
  type: 'object',
  description: 'Analyze and enhance a prompt found in the module',
  properties: {
    promptName: {
      type: 'string',
      description: 'Name or partial name of the prompt to analyze',
    },
    index: {
      type: 'number',
      description: 'Index of the prompt if name not provided',
    },
  },
};

export const analyzeFunction = {
  type: 'object',
  description: 'Analyze a specific function in the module',
  properties: {
    functionName: {
      type: 'string',
      description: 'Name of the function to analyze',
    },
  },
  required: ['functionName'],
};

export const showPerformance = {
  type: 'object',
  description: 'Show performance metrics from test execution',
  properties: {
    metric: {
      type: 'string',
      description: 'Specific metric to show (e.g., "llm" for LLM metrics)',
      enum: ['llm', 'all'],
    },
  },
};

export const listPrompts = {
  type: 'object',
  description: 'List all prompts found in the module',
  properties: {},
};
