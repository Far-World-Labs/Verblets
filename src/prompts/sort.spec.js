import { describe, it, expect } from 'vitest';
import sort, { defaultSortDescription, defaultFixes, defaultSortOrder } from './sort.js';

describe('sort', () => {
  it('exports correct defaults', () => {
    expect(defaultSortDescription).toBe('alphabetical order');
    expect(defaultFixes).toBe('Ignore duplicates in the list');
    expect(defaultSortOrder).toBe('descending');
  });

  it('formats a sort prompt with default options', () => {
    const list = ['banana', 'apple', 'cherry'];
    const result = sort({}, list);
    expect(result).toContain('alphabetical order');
    expect(result).toContain('descending');
    expect(result).toContain('Ignore duplicates');
    expect(result).toContain('banana');
    expect(result).toContain('apple');
    expect(result).toContain('cherry');
  });

  it('uses custom sort description', () => {
    const result = sort({ description: 'relevance to AI' }, ['item1']);
    expect(result).toContain('relevance to AI');
    expect(result).toContain('<criteria>');
  });

  it('uses custom sort order', () => {
    const result = sort({ sortOrder: 'ascending' }, ['a', 'b']);
    expect(result).toContain('ascending order');
  });

  it('uses custom fixes', () => {
    const result = sort({ fixes: 'Prioritize recent items' }, ['a']);
    expect(result).toContain('Prioritize recent items');
    expect(result).toContain('<fixes>');
  });

  it('wraps list content in XML main-content tags', () => {
    const result = sort({}, ['x', 'y', 'z']);
    expect(result).toContain('<main-content>');
    expect(result).toContain('</main-content>');
  });

  it('serializes list as JSON', () => {
    const result = sort({}, ['first', 'second']);
    expect(result).toContain('"first"');
    expect(result).toContain('"second"');
  });

  it('includes JSON string array format instruction', () => {
    const result = sort({}, ['a']);
    expect(result).toContain('JSON array');
  });
});
