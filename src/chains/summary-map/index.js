/* eslint-disable no-await-in-loop */

import chatGPT from '../../lib/chatgpt/index.js';
import shortenText from '../../lib/shorten-text/index.js';
import {
  summarize as basicSummarize,
  tokenBudget,
} from '../../prompts/index.js';

const summarize = ({ budget, type, value }) => {
  const fixes = [];
  if (budget) {
    fixes.push(tokenBudget(budget));
  }

  if (type === 'code') {
    fixes.push('Output function signature lines and a closing bracket.');
    fixes.push(
      'Comment out the bodies of the functions and leave a summary of the implementation.'
    );
    fixes.push('Remove the function header if it exists.');
  }

  const fixesAsBullets = fixes.map((fix) => ` - ${fix}`);

  return chatGPT(basicSummarize(value, `${fixesAsBullets.join('\n')}`));
};

/**
 * SummaryMap is a utility class for automatically summarizing prompt inputs  *   to fit within a desired desired token budget.
 */
export default class SummaryMap extends Map {
  constructor({ targetTokens, maxPromptTokens }) {
    super();
    this.cache = new Map();
    this.data = new Map();
    this.isCacheValid = false;
    this.maxPromptTokens = maxPromptTokens;
    this.targetTokens = targetTokens;
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

      const value = shortenText(valueObject.value, this.maxPromptTokens);

      const summarizedValue = await summarize({
        budget,
        type: valueObject.type,
        value,
      });
      this.cache.set(key, summarizedValue);
    }

    this.isCacheValid = true;
  }

  getCache() {
    return this.cache;
  }

  set(key, config) {
    this.data.set(key, config);
    this.cache.delete(key);
    this.isCacheValid = false;
  }

  delete(key) {
    this.data.delete(key);
    this.cache.delete(key);
    this.isCacheValid = false;
  }

  clear() {
    this.data.clear();
    this.cache.clear();
    this.isCacheValid = false;
  }

  getStale(key) {
    return this.cache.get(key);
  }

  get(key) {
    if (!super.has(key)) {
      return null;
    }

    if (!this.isCacheValid) {
      return this.myFillCache()
        .then(() => this.cache.get(key))
        .catch((error) => {
          console.error(`SummaryMap get key [error]: ${error.message}`);
          return undefined;
        });
    }

    return Promise.resolve(this.getStale(key));
  }

  valuesStale() {
    return this.cache.values();
  }

  values() {
    if (!this.isCacheValid) {
      return this.myFillCache()
        .then(() => this.cache.values())
        .catch((error) => {
          console.error(`SummaryMap values [error]: ${error.message}`);
          return undefined;
        });
    }
    return Promise.resolve(this.valuesStale());
  }

  entriesStale() {
    return this.cache.entries();
  }

  entries() {
    if (!this.isCacheValid) {
      return this.myFillCache()
        .then(() => this.cache.entries())
        .catch((error) => {
          console.error(`SummaryMap values [error]: ${error.message}`);
          return undefined;
        });
    }
    return Promise.resolve(this.entriesStale());
  }
}
