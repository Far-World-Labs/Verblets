import * as tokenizer from 'gpt-tokenizer';

import Model from './model.js';
import {
  frequencyPenalty as frequencyPenaltyConfig,
  models,
  presencePenalty as presencePenaltyConfig,
  temperature as temperatureConfig,
  topP as topPConfig,
} from '../../constants/models.js';

// Prioritized list of models (best to worst, excluding privacy/reasoning which are never auto-invoked)
const prioritizedModels = [
  'fastGoodCheap',
  'fastGoodCheapMulti',
  'fastGood',
  'fastGoodMulti',
  'goodCheap',
  'goodCheapMulti',
  'good',
  'goodMulti',
  'fastCheap',
  'fastCheapMulti',
  'fast',
  'fastMulti',
  'cheap',
  'cheapMulti',
  'multi',
  'fastCheapReasoning',
  'fastCheapReasoningMulti',
  'fastReasoning',
  'fastReasoningMulti',
  'cheapReasoning',
  'cheapReasoningMulti',
  'reasoning',
  'reasoningMulti',
];

class ModelService {
  constructor() {
    this.models = {};
    this.models = Object.entries(models).reduce(
      (acc, [key, modelDef]) => ({
        ...acc,
        [key]: new Model({
          ...modelDef,
          key,
          tokenizer: tokenizer.encode,
        }),
      }),
      {}
    );

    // Always default to fastGood for public model
    this.bestPublicModelKey = 'fastGood';

    // Global overrides
    this.globalOverrides = {
      modelName: null, // Force specific model
      negotiate: null, // Force specific negotiation options
      temperature: null, // Force specific temperature
      maxTokens: null, // Force specific max tokens
      topP: null, // Force specific top_p
      frequencyPenalty: null, // Force specific frequency penalty
      presencePenalty: null, // Force specific presence penalty
    };
  }

  // Global override management
  setGlobalOverride(key, value) {
    if (!(key in this.globalOverrides)) {
      throw new Error(
        `Invalid override key: ${key}. Valid keys are: ${Object.keys(this.globalOverrides).join(
          ', '
        )}`
      );
    }
    this.globalOverrides[key] = value;
  }

  clearGlobalOverride(key) {
    if (key) {
      if (!(key in this.globalOverrides)) {
        throw new Error(
          `Invalid override key: ${key}. Valid keys are: ${Object.keys(this.globalOverrides).join(
            ', '
          )}`
        );
      }
      this.globalOverrides[key] = null;
    } else {
      // Clear all overrides
      Object.keys(this.globalOverrides).forEach((k) => {
        this.globalOverrides[k] = null;
      });
    }
  }

  getGlobalOverride(key) {
    return this.globalOverrides[key];
  }

  getAllGlobalOverrides() {
    return { ...this.globalOverrides };
  }

  // Apply global overrides to model options
  applyGlobalOverrides(modelOptions) {
    const result = { ...modelOptions };

    // Apply each override if it's set (not null)
    Object.entries(this.globalOverrides).forEach(([key, value]) => {
      if (value !== null) {
        result[key] = value;
      }
    });

    return result;
  }

  getBestPublicModel() {
    return this.models[this.bestPublicModelKey];
  }

  getBestPrivateModel() {
    if (!this.models.privacy) {
      throw new Error(
        'No privacy model configured. Configure a privacy model or use a public model instead.'
      );
    }
    return this.models.privacy;
  }

  updateBestPublicModel(name) {
    this.bestPublicModelKey = name;
  }

  getModel(name) {
    if (!name) {
      return this.getBestPublicModel();
    }

    // First try to find by key
    let modelFound = this.models[name];

    // If not found by key, try to find by model name
    if (!modelFound) {
      modelFound = Object.values(this.models).find((model) => model.name === name);
    }

    if (!modelFound) {
      throw new Error(`Get model by name [error]: '${name}' not found.`);
    }
    return modelFound;
  }

  negotiateModel(preferred, negotiation = {}) {
    const { privacy, reasoning, fast, cheap, good, multi } = negotiation;

    // Privacy models take absolute priority
    if (privacy) {
      if (!this.models.privacy) {
        return undefined;
      }
      return 'privacy';
    }

    // Helper function to check if a model matches all requirements
    const matchesRequirements = (modelKey) => {
      if (!this.models[modelKey]) {
        return false;
      }

      const lowerModelKey = modelKey.toLowerCase();

      // Check each requirement - support both positive and negative (false) requirements
      // Only check requirements that are explicitly specified (not undefined)
      if (fast === true && !/fast/i.test(lowerModelKey)) {
        return false;
      }
      if (fast === false && /fast/i.test(lowerModelKey)) {
        return false;
      }
      if (cheap === true && !/cheap/i.test(lowerModelKey)) {
        return false;
      }
      if (cheap === false && /cheap/i.test(lowerModelKey)) {
        return false;
      }
      if (good === true && !/good/i.test(lowerModelKey)) {
        return false;
      }
      if (good === false && /good/i.test(lowerModelKey)) {
        return false;
      }
      if (reasoning === true && !/reasoning/i.test(lowerModelKey)) {
        return false;
      }
      if (reasoning === false && /reasoning/i.test(lowerModelKey)) {
        return false;
      }
      if (multi === true && !/multi/i.test(lowerModelKey)) {
        return false;
      }
      if (multi === false && /multi/i.test(lowerModelKey)) {
        return false;
      }
      return true;
    };

    // Check if any specific requirements are given
    const hasSpecificRequirements =
      fast !== undefined ||
      cheap !== undefined ||
      good !== undefined ||
      reasoning !== undefined ||
      multi !== undefined;

    // If no specific requirements are given, return preferred model if available
    if (!hasSpecificRequirements) {
      if (preferred && this.models[preferred]) {
        return preferred;
      }
      return this.bestPublicModelKey;
    }

    // Find the first model that matches all requirements
    for (const modelKey of prioritizedModels) {
      if (matchesRequirements(modelKey)) {
        return modelKey;
      }
    }

    // Check if specific critical requirements were requested but couldn't be satisfied
    if (reasoning === true) {
      return undefined;
    }

    // If specific requirements were given but couldn't be satisfied, return undefined
    return undefined;
  }

  getRequestParameters(options = {}) {
    const frequencyPenalty = options.frequencyPenalty ?? frequencyPenaltyConfig;
    const presencePenalty = options.presencePenalty ?? presencePenaltyConfig;
    const temperature = options.temperature ?? temperatureConfig;
    const topP = options.topP ?? topPConfig;
    const { maxTokens, modelName, prompt } = options;

    const modelFound = this.getModel(modelName);

    let maxTokensFound = maxTokens;
    if (!maxTokens) {
      const promptTokens = modelFound.toTokens(prompt).length;
      const availableTokens = modelFound.maxContextWindow - promptTokens;
      // Cap to the model's maximum output tokens
      maxTokensFound = Math.min(availableTokens, modelFound.maxOutputTokens);
    }

    return {
      model: modelFound.name,
      temperature,
      max_tokens: maxTokensFound,
      top_p: topP,
      frequency_penalty: frequencyPenalty,
      presence_penalty: presencePenalty,
    };
  }

  getRequestConfig(options) {
    const { tools, toolChoice, modelName, prompt, systemPrompt, response_format } = options;

    const modelFound = this.getModel(modelName);

    let requestPrompt = { prompt };
    if (/chat/.test(modelFound.endpoint)) {
      const userMessage = { role: 'user', content: prompt };
      const systemMessages = systemPrompt
        ? [
            {
              role: 'system',
              content: systemPrompt,
            },
          ]
        : [];
      requestPrompt = {
        messages: [...systemMessages, userMessage],
        tools,
        tool_choice: tools && !toolChoice ? 'auto' : toolChoice,
      };
    }
    const data = this.getRequestParameters(options);

    const result = {
      ...requestPrompt,
      ...data,
    };

    if (response_format) {
      result.response_format = response_format;
    }

    return result;
  }
}

export default new ModelService();
