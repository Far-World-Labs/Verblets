import chatGPT from '../../index.js';
import pave from '../../lib/pave/index.js';
import {
  summarize,
} from '../../prompts/fragment-functions/index.js'

/**
 * SummarizingMap is a utility class for managing inputs to prompts,
 * which are often too large for the desired token budget
 * This class implements per-variable summarization, whose summarization sizes are computed
 * relative to an overall target token size for an AI prompt.
 */
class SummarizingMap {
  constructor(targetTokenSize) {
    this.targetTokenSize = targetTokenSize;
    this.data = new Map();
    this.cache = new Map();
    this.isCacheValid = false;
  }

  getCache() {
    return this.cache;
  }

  calculateBudgets() {
    const totalSizeWeight = Array.from(this.data.values()).reduce((sum, valueObject) => sum + (valueObject.weight * valueObject.value.length), 0);
    const sortedEntries = Array.from(this.data.entries()).sort((a, b) => a[1].weight - b[1].weight);

    const budgets = [];
    for (const [entryKey, valueObject] of sortedEntries) {
      const { weight } = valueObject;
      const sizeWeight = valueObject.value.length * weight;
      const budget = Math.floor((sizeWeight / totalSizeWeight) * this.targetTokenSize);
      budgets.push({ key: entryKey, budget });
    }

    return { totalSizeWeight, budgets };
  }

  async _fillCache() {
    const { budgets } = this.calculateBudgets();

    for (const { key, budget } of budgets) {
      const valueObject = this.data.get(key);
      const summarizedValue = await this._summarize({ value: valueObject.value, type: valueObject.type, budget });
      this.cache.set(key, summarizedValue);
    }

    this.isCacheValid = true;
  }

  async _summarize({ value, type, budget }) {
    let fixes = '';
    if (budget) {
      fixes = fixes + ` - Keep the output within ${budget} tokens.`;
    }

    if (type === 'code') {
      fixes = fixes + ` - Output function signature lines and a closing bracket.
 - Summarize comment out the bodies of the functions.
 - Leave the function header summaries, adding them if they don't exist. Remove the remaining jsDoc or examples.`
    }

    return await chatGPT(summarize(value, `${fixes}\n`));
  }

  set({ key, value, weight, type }) {
    this.data.set(key, { value, weight, type });
    this.isCacheValid = false;
  }

  async get(key) {
    if (!this.data.has(key)) {
      return null;
    }

    if (!this.isCacheValid) {
      await this._fillCache();
    }

    return this.cache.get(key);
  }

  async getAll() {
    if (!this.isCacheValid) {
      await this._fillCache();
    }

    let result = {};

    for (const [path, value] of this.cache.entries()) {
      result = pave(result, path, value);
    }

    return result;
  }
};

export default SummarizingMap;
