/* eslint-disable no-await-in-loop */

import chatGPT from '../../lib/chatgpt/index.js';
import pave from '../../lib/pave/index.js';
import shortenText from '../../lib/shorten-text/index.js';
import {
  summarize as basicSummarize,
  tokenBudget,
} from '../../prompts/index.js';

const summarize = ({ budget, type, value }) => {
  let fixes = '';
  if (budget) {
    fixes += ` - ${tokenBudget(budget)}`;
  }

  if (type === 'code') {
    fixes += ` - Output function signature lines and a closing bracket.
 - Comment out the bodies of the functions and leave a summary of the implementation.
 - Remove the function header if it exists.`;
  }

  return chatGPT(basicSummarize(value, `${fixes}\n`));
};

/**
 * SummarizingMap is a utility class for managing inputs to prompts,
 * which are often too large for the desired token budget
 * This class implements per-variable summarization, whose summarization sizes are computed
 * relative to an overall target token size for an AI prompt.
 */
export default class SummarizingMap extends Map {
  constructor({ targetTokens, maxPromptTokens }) {
    super();
    this.cache = new Map();
    this.data = new Map();
    this.isCacheValid = false;
    this.maxPromptTokens = maxPromptTokens;
    this.targetTokens = targetTokens;
  }

  getCache() {
    return this.cache;
  }

  calculateBudgets() {
    const totalSizeWeight = [...this.data.values()].reduce(
      (sum, valueObject) => {
        return sum + valueObject.weight * valueObject.value.length;
      },
      0
    );
    const sortedEntries = [...this.data.entries()].sort(
      (a, b) => a[1].weight - b[1].weight
    );

    const budgets = [];
    for (const [entryKey, valueObject] of sortedEntries) {
      const { weight } = valueObject;
      const sizeWeight = valueObject.value.length * weight;
      const budget = Math.floor(
        (sizeWeight / totalSizeWeight) * this.targetTokens
      );
      budgets.push({ key: entryKey, budget });
    }

    return { totalSizeWeight, budgets };
  }

  async myFillCache() {
    const { budgets } = this.calculateBudgets();

    for (const { key, budget } of budgets) {
      const valueObject = this.data.get(key);
      const summarizedValue = await summarize({
        budget,
        type: valueObject.type,
        value: valueObject.value,
      });
      this.cache.set(key, summarizedValue);
    }

    this.isCacheValid = true;
  }

  set(key, config) {
    const valueNew = shortenText(config.value, this.maxPromptTokens);

    const configNew = { ...config, value: valueNew };

    this.data.set(key, configNew);
    this.isCacheValid = false;
  }

  delete(key) {
    this.data.delete(key);
    this.isCacheValid = false;
  }

  clear() {
    this.data.clear();
    this.isCacheValid = false;
  }

  get(key) {
    if (!super.has(key)) {
      return null;
    }

    if (!this.isCacheValid) {
      return this.myFillCache()
        .then(() => this.cache.get(key))
        .catch((error) => {
          console.error(`SummarizingMap get key [error]: ${error.message}`);
          return undefined;
        });
    }

    return Promise.resolve(this.cache.get(key));
  }

  getAllStale() {
    let result = {};

    for (const [path, value] of this.cache.entries()) {
      result = pave(result, path, value);
    }

    return result;
  }

  values() {
    if (!this.isCacheValid) {
      return this.myFillCache()
        .then(() => this.cache.values())
        .catch((error) => {
          console.error(`SummarizingMap values [error]: ${error.message}`);
          return undefined;
        });
    }
    return Promise.resolve(this.getAllStale());
  }

  entries() {
    if (!this.isCacheValid) {
      return this.myFillCache()
        .then(() => this.cache.entries())
        .catch((error) => {
          console.error(`SummarizingMap values [error]: ${error.message}`);
          return undefined;
        });
    }
    return Promise.resolve(this.getAllStale());
  }

  getAll() {
    if (!this.isCacheValid) {
      return this.myFillCache()
        .then(() => this.getAllStale())
        .catch((error) => {
          console.error(`SummarizingMap getAll [error]: ${error.message}`);
          return undefined;
        });
    }
    return Promise.resolve(this.getAllStale());
  }
}
