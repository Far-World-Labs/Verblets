import { asXML } from '../../prompts/wrap-variable.js';
import shortenText from '../shorten-text/index.js';
import { DomainEvent } from '../progress/constants.js';

const FALLBACK_TOKENS_PER_CHAR = 0.25;

function estimateTokens(text, model) {
  if (model?.toTokens) return model.toTokens(text).length;
  return Math.ceil(text.length * FALLBACK_TOKENS_PER_CHAR);
}

/**
 * Budget-aware context assembler.
 *
 * Collects named context values, XML-wraps each, and joins with double
 * newlines. Budget trimming has two paths:
 *
 *   targetTokens + model → proportional per-entry trimming via shorten-text
 *   targetChars          → proportional per-entry char truncation (no model needed)
 *
 * Entries marked `raw` are included as-is (already formatted).
 * Empty or nullish values are silently skipped.
 *
 * Usage:
 *   const budget = new ContextBudget({ targetTokens: 4000, model, onTrim });
 *   budget.set('knowledge', longText, { weight: 2 });
 *   budget.set('domain', 'SEC filings');
 *   const assembled = budget.build();
 */
export default class ContextBudget {
  constructor({ targetTokens, targetChars, model, onTrim } = {}) {
    this.entries = new Map();
    this.targetTokens = targetTokens;
    this.targetChars = targetChars;
    this.model = model;
    this.onTrim = onTrim;
  }

  /**
   * Add a named context value.
   * @param {string} tag - XML tag name (or label for raw entries)
   * @param {string} value - Context text
   * @param {{ weight?: number, raw?: boolean }} [options]
   * @returns {this}
   */
  set(tag, value, { weight = 1, raw = false } = {}) {
    if (value == null || value === '') return this;
    this.entries.set(tag, { value: String(value), weight, raw });
    return this;
  }

  delete(tag) {
    this.entries.delete(tag);
    return this;
  }

  get size() {
    return this.entries.size;
  }

  /**
   * Assemble all entries into a single context string.
   * Without a budget, entries are XML-wrapped and joined.
   * With a budget + model, entries are proportionally trimmed first.
   * @returns {string}
   */
  build() {
    if (this.entries.size === 0) return '';

    const useTokens = this.targetTokens && this.model?.toTokens;
    const useChars = !useTokens && this.targetChars;

    if (!useTokens && !useChars) {
      return [...this.entries]
        .map(([tag, { value, raw }]) => (raw ? value : asXML(value, { tag })))
        .join('\n\n');
    }

    // Budget-aware path: proportional allocation then per-entry trimming
    const totalSizeWeight = [...this.entries.values()].reduce(
      (sum, { value, weight }) => sum + value.length * weight,
      0
    );

    const parts = [];

    for (const [tag, { value, weight, raw }] of this.entries) {
      const sizeWeight = value.length * weight;
      let finalValue = value;

      if (useTokens) {
        const entryBudget = Math.floor((sizeWeight / totalSizeWeight) * this.targetTokens);
        const currentTokens = estimateTokens(value, this.model);

        if (currentTokens > entryBudget) {
          finalValue = shortenText(value, {
            targetTokenCount: entryBudget,
            model: this.model,
          });

          const trimmedTokens = estimateTokens(finalValue, this.model);
          this.onTrim?.({
            tag,
            strategy: 'middle-trim',
            originalTokens: currentTokens,
            trimmedTokens,
            budgetTokens: entryBudget,
            ratio: Number((trimmedTokens / currentTokens).toFixed(3)),
          });
        }
      } else {
        // Char-based trimming: simple middle truncation
        const entryBudget = Math.floor((sizeWeight / totalSizeWeight) * this.targetChars);

        if (value.length > entryBudget) {
          const half = Math.floor(entryBudget / 2);
          finalValue = `${value.slice(0, half)}...${value.slice(value.length - half)}`;

          this.onTrim?.({
            tag,
            strategy: 'char-trim',
            originalChars: value.length,
            trimmedChars: finalValue.length,
            budgetChars: entryBudget,
            ratio: Number((finalValue.length / value.length).toFixed(3)),
          });
        }
      }

      parts.push(raw ? finalValue : asXML(finalValue, { tag }));
    }

    return parts.join('\n\n');
  }

  /**
   * Create an onTrim callback that routes trim telemetry to a progress emitter.
   * @param {Object} emitter - Progress emitter with `.emit()`
   * @returns {Function} onTrim callback
   */
  static trimToEmitter(emitter) {
    return (info) =>
      emitter.emit({
        event: DomainEvent.step,
        stepName: 'context-trim',
        ...info,
      });
  }
}
