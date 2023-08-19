import { camelCase, camelCaseTransformMerge } from 'change-case';
import * as tokenizer3 from 'gpt3-tokenizer';
// import * as tokenizer4 from 'gpt4-tokenizer';

import Model from './model.js';
import {
  frequencyPenalty as frequencyPenaltyConfig,
  models,
  presencePenalty as presencePenaltyConfig,
  temperature as temperatureConfig,
  topP as topPConfig,
} from '../../constants/openai.js';

// This library really doesn't import well with nodejs
// This may not be the best solution, but it works
// with the standard way of running the app as well as
// with 'npm run script'
let Tokenizer3 = { ...tokenizer3 };
if (Tokenizer3.default) {
  Tokenizer3 = Tokenizer3.default;
}
if (Tokenizer3.default) {
  Tokenizer3 = Tokenizer3.default;
}

// let Tokenizer4 = { ...tokenizer4 };
// if (Tokenizer4.default) {
//   Tokenizer4 = Tokenizer4.default;
// }
// if (Tokenizer4.default) {
//   Tokenizer4 = Tokenizer4.default;
// }

const toTokensChatGPT3 = (item) => {
  const enc = new Tokenizer3({ type: 'gpt3' });
  return enc.encode(item).text;
};
// const toTokensChatGPT4 = (item) => {
//   const enc = new Tokenizer4({ type: 'gpt3' });
//   return enc.encode(item).text;
// };

class ModelService {
  constructor() {
    this.models = {};
    this.models = Object.entries(models).reduce(
      (acc, [key, modelDef]) => ({
        ...acc,
        [key]:
          new Model({
            ...modelDef,
            tokenizer: /gpt-4/.test(modelDef.name)
              ? toTokensChatGPT3
              : toTokensChatGPT3,
          }),
      }),
      {}
    );

    this.bestAvailableModel = this.models.gpt4 ?? this.models.gpt35Turbo;
    if (process.env.TEST === 'true') {
      // this.bestAvailableModel = this.models.textDavinci003;
      this.bestAvailableModel = this.models.gpt35Turbo;
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
    const {
      functions,
      function_call,
      modelName,
      prompt,
      systemPrompt,
    } = options;

    const modelFound = this.getModel(modelName);

    let requestPrompt = { prompt: prompt };
    if (/chat/.test(modelFound.endpoint)) {
      const userMessage = { role: 'user', content: prompt };
      const systemMessages = systemPrompt ? [{
        role: 'system',
        content: systemPrompt,
      }] : [];
      requestPrompt = {
        messages: [
          ...systemMessages,
          userMessage
        ],
        functions,
        function_call,
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
