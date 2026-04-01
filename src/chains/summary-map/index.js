import llm from '../../lib/llm/index.js';
import pave from '../../lib/pave/index.js';
import shortenText from '../../lib/shorten-text/index.js';
import { summarize as basicSummarize, tokenBudget } from '../../prompts/index.js';
import modelService from '../../services/llm-model/index.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { nameStep } from '../../lib/context/option.js';

const summarize = ({ budget, type, value, fixes = [], llmOptions, sensitivity }) => {
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

  if (sensitivity?.whitelist) {
    fixes.push(`Only share information matching: ${sensitivity.whitelist}.`);
  }

  if (sensitivity?.blacklist) {
    fixes.push(`Do not share information matching: ${sensitivity.blacklist}.`);
  }

  const fixesAsBullets = fixes.map((fix) => ` - ${fix}`);

  return llm(basicSummarize(value, `${fixesAsBullets.join('\n')}`), {
    ...llmOptions,
  });
};

/**
 * SummaryMap is a utility class for automatically summarizing prompt inputs
 *   to fit within a desired desired token budget.
 */
// ===== Option Mappers =====

const DEFAULT_SUMMARY_RATIO = 0.3;

/**
 * Map summaryDetail option to a targetTokensTotalRatio.
 * Accepts 'low'|'high' or a raw number (0-1).
 * @param {string|number|undefined} value
 * @returns {number} Token ratio (lower = more detailed summary)
 */
export const mapSummaryDetail = (value) => {
  if (value === undefined) return DEFAULT_SUMMARY_RATIO;
  if (typeof value === 'number') return value;
  return { low: 0.4, med: DEFAULT_SUMMARY_RATIO, high: 0.2 }[value] ?? DEFAULT_SUMMARY_RATIO;
};

const chainName = 'summary-map';

export default class SummaryMap extends Map {
  constructor({
    maxTokensPerValue,
    model = modelService.getBestPublicModel(),
    modelOptions = { modelName: model.name },
    promptText,
    targetTokens,
    summaryDetail,
    // used with promptText, when targetTokens isn't supplied
    targetTokensTotalRatio = mapSummaryDetail(summaryDetail),
    ...config
  }) {
    super();
    this.cache = new Map();
    this.data = new Map();
    this.isCacheValid = false;
    this.maxTokensPerValue = maxTokensPerValue ?? model.maxTokens;
    this.llmOptions = { modelName: model.name, ...modelOptions };
    this.runConfig = nameStep(chainName, config);

    if (targetTokens) {
      this.targetTokens = targetTokens;
    } else if (promptText && model) {
      this.promptTokens = model.toTokens(promptText).length;
      const maxModelTokens = model.maxTokens;
      const remainingTokens = maxModelTokens - this.promptTokens;
      this.targetTokens = Math.floor(remainingTokens - remainingTokens * targetTokensTotalRatio);
    } else {
      throw new Error('Either "promptText" and "model" or "targetTokens" must be provided.');
    }
  }

  calculateBudgets() {
    const totalSizeWeight = [...this.data.values()]
      .filter((obj) => obj?.summary !== false)
      .reduce((sum, valueObject) => {
        return sum + (valueObject.weight ?? 1) * valueObject.value.length;
      }, 0);
    const sortedEntries = [...this.data.entries()].toSorted((a, b) => a[1].weight - b[1].weight);

    const budgets = [];
    for (const [entryKey, valueObject] of sortedEntries) {
      const sizeWeight = valueObject.value.length * (valueObject.weight ?? 1);
      const budget = Math.floor((sizeWeight / totalSizeWeight) * this.targetTokens);

      if (valueObject.weight) {
        budgets.push({ key: entryKey, budget });
      } else {
        budgets.push({ key: entryKey });
      }
    }

    return { totalSizeWeight, budgets };
  }

  async myFillCache() {
    const emitter = createProgressEmitter(chainName, this.runConfig.onProgress, this.runConfig);
    emitter.start();

    try {
      const { budgets } = this.calculateBudgets();
      const batchDone = emitter.batch(budgets.length);

      for (const { key, budget } of budgets) {
        const valueObject = this.data.get(key);

        const entryLlmOptions = {
          ...this.llmOptions,
          ...valueObject.modelOptions,
        };

        if (valueObject.sensitivity?.whitelist || valueObject.sensitivity?.blacklist) {
          entryLlmOptions.sensitive = true;
        }

        const value = shortenText(valueObject.value, {
          targetTokenCount: this.maxTokensPerValue,
          model: modelService.getModel(entryLlmOptions.modelName),
        });

        // omit weight to skip summarization
        let summarizedValue = value;
        if (budget) {
          const summarizeLlmOptions = {
            ...this.llmOptions,
            ...valueObject.modelOptions,
          };

          if (valueObject.sensitivity?.whitelist || valueObject.sensitivity?.blacklist) {
            summarizeLlmOptions.sensitive = true;
          }

          // eslint-disable-next-line no-await-in-loop
          summarizedValue = await summarize({
            budget,
            fixes: valueObject.fixes,
            llmOptions: summarizeLlmOptions,
            sensitivity: valueObject.sensitivity,
            type: valueObject.type,
            value,
          });
        }

        this.cache.set(key, summarizedValue);
        batchDone(1);
      }

      this.isCacheValid = true;
      emitter.complete({ outcome: 'success', entries: budgets.length });
    } catch (err) {
      emitter.error(err);
      throw err;
    }
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
    if (!this.data.has(key)) {
      return undefined;
    }

    if (!this.isCacheValid) {
      return this.myFillCache()
        .then(() => this.cache.get(key))
        .catch((error) => {
          return Promise.reject(error);
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
          return Promise.reject(error);
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
          return Promise.reject(error);
        });
    }
    return Promise.resolve(this.entriesStale());
  }

  pavedSummaryResultStale() {
    return Array.from(this.entriesStale()).reduce((acc, [k, v]) => pave(acc, k, v), {});
  }

  pavedSummaryResult() {
    if (!this.isCacheValid) {
      return this.myFillCache()
        .then(() => this.pavedSummaryResultStale())
        .catch((error) => {
          return Promise.reject(error);
        });
    }
    return Promise.resolve(this.pavedSummaryResultStale());
  }
}
