import * as tokenizer from 'gpt-tokenizer';

import Model from './model.js';
import {
  frequencyPenalty as frequencyPenaltyConfig,
  models,
  presencePenalty as presencePenaltyConfig,
  temperature as temperatureConfig,
  topP as topPConfig,
} from '../../constants/openai.js';

class ModelService {
  constructor() {
    this.models = {};
    this.models = Object.entries(models).reduce(
      (acc, [key, modelDef]) => ({
        ...acc,
        [key]: new Model({
          ...modelDef,
          tokenizer: tokenizer.encode,
        }),
      }),
      {}
    );

    // Default to gptReasoning if enabled, otherwise fall back to gptBase
    this.bestAvailableModel =
      process.env.GPT_REASONING_ENABLED === 'true'
        ? this.models.gptReasoning
        : this.models.gptBase;

    if (process.env.TEST === 'true') {
      // Use the same model selection logic in test mode
      this.bestAvailableModel =
        process.env.GPT_REASONING_ENABLED === 'true'
          ? this.models.gptReasoning
          : this.models.gptBase;
    }
  }

  getBestAvailableModel() {
    return this.bestAvailableModel;
  }

  updateBestAvailableModel(name) {
    this.bestAvailableModel = this.getModel(name);
  }

  getModel(name) {
    let modelFound = this.getBestAvailableModel();
    if (name && process.env.TEST !== 'true') {
      modelFound = this.models[name];
      if (!modelFound) {
        throw new Error(`Get model by name [error]: '${name}' not found.`);
      }
    }
    return modelFound;
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
      maxTokensFound = modelFound.maxTokens - modelFound.toTokens(prompt);
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
    const { tools, toolChoice, modelName, prompt, systemPrompt } = options;

    const modelFound = this.getModel(modelName);

    let requestPrompt = { prompt: prompt };
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

    return {
      ...requestPrompt,
      ...data,
    };
  }
}

export default new ModelService();
