import { describe, it, expect } from 'vitest';
import ContextBudget from './index.js';

describe('ContextBudget', () => {
  it('XML-wraps and joins entries', () => {
    const budget = new ContextBudget();
    budget.set('domain', 'SEC filings');
    budget.set('audience', 'Board members');

    const result = budget.build();
    expect(result).toContain('<domain>');
    expect(result).toContain('SEC filings');
    expect(result).toContain('</domain>');
    expect(result).toContain('<audience>');
    expect(result).toContain('Board members');
    expect(result).toContain('</audience>');
    // Entries separated by double newline
    expect(result).toMatch(/<\/domain>\n\n<audience>/);
  });

  it('returns empty string with no entries', () => {
    const budget = new ContextBudget();
    expect(budget.build()).toBe('');
  });

  it('skips nullish and empty values', () => {
    const budget = new ContextBudget();
    budget.set('a', null);
    budget.set('b', undefined);
    budget.set('c', '');
    budget.set('d', 'kept');

    const result = budget.build();
    expect(result).toContain('<d>');
    expect(result).toContain('kept');
    expect(result).not.toContain('<a>');
    expect(result).not.toContain('<b>');
    expect(result).not.toContain('<c>');
  });

  it('passes raw entries through without wrapping', () => {
    const budget = new ContextBudget();
    budget.set('pre-wrapped', '<custom>already formatted</custom>', { raw: true });
    budget.set('normal', 'plain text');

    const result = budget.build();
    expect(result).toContain('<custom>already formatted</custom>');
    expect(result).toContain('<normal>');
    expect(result).toContain('plain text');
  });

  it('set returns this for chaining', () => {
    const budget = new ContextBudget();
    const returned = budget.set('a', 'x').set('b', 'y');
    expect(returned).toBe(budget);
    expect(budget.size).toBe(2);
  });

  it('delete removes an entry', () => {
    const budget = new ContextBudget();
    budget.set('a', 'x');
    budget.set('b', 'y');
    budget.delete('a');

    expect(budget.size).toBe(1);
    const result = budget.build();
    expect(result).toContain('<b>');
    expect(result).not.toContain('<a>');
  });

  it('overwriting a key replaces the entry', () => {
    const budget = new ContextBudget();
    budget.set('a', 'first');
    budget.set('a', 'second');

    expect(budget.size).toBe(1);
    const result = budget.build();
    expect(result).toContain('second');
    expect(result).not.toContain('first');
  });
});
