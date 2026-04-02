/**
 * Pure extractor functions for structured progress event data.
 *
 * Migrated from lifecycle-logger — these extract analysis properties
 * from prompts, batches, and results without any logger dependency.
 */

/**
 * Extract batch processing properties for progress events.
 * @param {Object} config - Batch processing configuration
 * @returns {Object} Batch properties for event payloads
 */
export const extractBatchConfig = (config) => {
  const { batchSize, maxAttempts, maxParallel, totalItems, totalBatches, retryCount, failedItems } =
    config;

  return {
    batchSize,
    maxAttempts,
    maxParallel,
    totalItems,
    totalBatches,
    retryCount,
    failedItems,
  };
};

/**
 * Extract prompt analysis properties for progress events.
 * @param {string|Object} prompt - Prompt or messages array
 * @returns {Object} Prompt analysis for event payloads
 */
export const extractPromptAnalysis = (prompt) => {
  if (typeof prompt === 'string') {
    return {
      promptLength: prompt.length,
      promptType: 'string',
    };
  }

  if (Array.isArray(prompt)) {
    const types = prompt.map((m) => m.role).filter(Boolean);
    const totalLength = prompt.reduce((sum, m) => sum + (m.content?.length || 0), 0);

    return {
      promptLength: totalLength,
      promptType: 'messages',
      messageTypes: types,
      messageCount: prompt.length,
    };
  }

  if (typeof prompt === 'object' && prompt !== null) {
    const analysis = {
      promptType: 'object',
    };

    if (prompt.system) {
      analysis.systemPromptLength = prompt.system.length;
    }
    if (prompt.user) {
      analysis.userPromptLength = prompt.user.length;
    }
    if (prompt.system || prompt.user) {
      analysis.promptLength = (prompt.system?.length || 0) + (prompt.user?.length || 0);
    }

    return analysis;
  }

  return { promptType: 'unknown' };
};

/**
 * Extract LLM configuration analysis properties.
 * @param {Object} llmConfig - LLM configuration object
 * @returns {Object} Config analysis for event payloads
 */
export const extractLLMConfig = (llmConfig) => {
  if (!llmConfig) {
    return { hasLlmConfig: false };
  }

  const extracted = {
    hasLlmConfig: true,
  };

  if (llmConfig.response_format?.type) {
    extracted.responseFormat = llmConfig.response_format.type;
  }
  if (llmConfig.model) {
    extracted.model = llmConfig.model;
  }
  if (llmConfig.temperature !== undefined) {
    extracted.temperature = llmConfig.temperature;
  }
  if (llmConfig.max_tokens !== undefined) {
    extracted.maxTokens = llmConfig.max_tokens;
  }

  return extracted;
};
