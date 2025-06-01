import * as tokenizer from 'gpt-tokenizer';

import Model from './model.js';
import {
  frequencyPenalty as frequencyPenaltyConfig,
  models,
  presencePenalty as presencePenaltyConfig,
  temperature as temperatureConfig,
  topP as topPConfig,
} from '../../constants/models.js';

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

    if (Object.keys(this.models).length === 0) {
      this.models.fastGood = new Model({
        name: 'test-model',
        maxTokens: 1000,
        requestTimeout: 1000,
        key: 'fastGood',
        tokenizer: tokenizer.encode,
      });
    }

    // Default to reasoning model when available
    this.bestPublicModelKey = this.models.reasoning ? 'reasoning' : 'fastGood';

    if (process.env.TEST === 'true') {
      this.bestPublicModelKey = this.models.reasoning ? 'reasoning' : 'fastGood';
    }

    this.bestPrivateModelKey = this.models.privacy ? 'privacy' : this.bestPublicModelKey;
  }

  getBestPublicModel() {
    return this.models[this.bestPublicModelKey];
  }

  getBestPrivateModel() {
    return this.models[this.bestPrivateModelKey];
  }

  updateBestPublicModel(name) {
    this.bestPublicModelKey = name;
  }

  getModel(name) {
    if (!name) {
      return this.getBestPublicModel();
    }

    const modelFound = this.models[name];
    if (!modelFound) {
      throw new Error(`Get model by name [error]: '${name}' not found.`);
    }
    return modelFound;
  }

  negotiateModel(preferred, negotiation = {}) {
    const { privacy, reasoning, fast, cheap } = negotiation;

    if (privacy && this.models.privacy) {
      return 'privacy';
    }

    if (reasoning && this.models.reasoning) {
      return 'reasoning';
    }

    if (fast && this.models.fastGood) {
      return 'fastGood';
    }

    if (cheap && this.models.fastCheap) {
      return 'fastCheap';
    }

    return preferred || this.bestPublicModelKey;
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
