/**
 * Extract helpers — pure functions that pull structured properties
 * from chain inputs, configs, and results for event enrichment.
 *
 * These are the property suppliers that anchor events and domain
 * events use to carry rich context without the caller having to
 * manually assemble the fields.
 */

/**
 * Extract LLM configuration properties.
 * @param {Object} llmConfig - LLM configuration object
 * @returns {Object} Structured properties for event enrichment
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

/**
 * Extract prompt shape properties.
 * @param {string|Array|Object} prompt - Prompt or messages array
 * @returns {Object} Structured properties for event enrichment
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
 * Extract result value properties.
 * @param {*} rawValue - Raw value from processing
 * @param {*} value - Interpreted/resolved value
 * @returns {Object} Structured properties for event enrichment
 */
export const extractResultValue = (rawValue, value) => {
  return { rawValue, value };
};

/**
 * Extract batch processing properties.
 * @param {Object} config - Batch processing configuration
 * @returns {Object} Structured properties for event enrichment
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
