import { camelCase, camelCaseTransformMerge } from 'change-case';
import * as tokenizer3 from 'gpt3-tokenizer';
// import * as tokenizer4 from 'gpt4-tokenizer';

import Model from './model.js';
import { models } from '../../constants/openai.js';

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
    this.models = Object.values(models).reduce(
      (acc, modelDef) => ({
        ...acc,
        [camelCase(modelDef.name, { transform: camelCaseTransformMerge })]:
          new Model({
            ...modelDef,
            tokenizer: /gpt-4/.test(modelDef.name)
              ? toTokensChatGPT3
              : toTokensChatGPT3,
          }),
      }),
      {}
    );

    this.bestAvailableModel = this.models.gpt4 || this.models.gpt35Turbo;
  }

  getBestAvailableModel() {
    if (process.env.NODE_ENV === 'test') {
      return this.models.gpt35Turbo;
    }
    return this.bestAvailableModel;
  }

  updateBestAvailableModel(modelName) {
    const newModel = this.getModelByName(modelName);
    this.bestAvailableModel = newModel;
  }

  getModelByName(name) {
    const modelFound = this.models[name];
    if (!modelFound) {
      throw new Error(`Get model by name [error]: '${name}' not found.`);
    }
    return modelFound;
  }
}

export default new ModelService();
