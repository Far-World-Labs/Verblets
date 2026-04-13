import { asXML } from '../../prompts/wrap-variable.js';

/**
 * Context assembler.
 *
 * Collects named context values, XML-wraps each, and joins with double
 * newlines. Entries marked `raw` are included as-is (already formatted).
 * Empty or nullish values are silently skipped.
 *
 * Usage:
 *   const budget = new ContextBudget();
 *   budget.set('knowledge', longText);
 *   budget.set('domain', 'SEC filings');
 *   const assembled = budget.build();
 */
export default class ContextBudget {
  constructor() {
    this.entries = new Map();
  }

  /**
   * Add a named context value.
   * @param {string} tag - XML tag name (or label for raw entries)
   * @param {string} value - Context text
   * @param {{ raw?: boolean }} [options]
   * @returns {this}
   */
  set(tag, value, { raw = false } = {}) {
    if (value == null || value === '') return this;
    this.entries.set(tag, { value: String(value), raw });
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
   * Entries are XML-wrapped (unless raw) and joined with double newlines.
   * @returns {string}
   */
  build() {
    if (this.entries.size === 0) return '';

    return [...this.entries]
      .map(([tag, { value, raw }]) => (raw ? value : asXML(value, { tag })))
      .join('\n\n');
  }
}
