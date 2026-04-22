import { describe, it, expect } from 'vitest';
import generateList from './generate-list.js';

describe('generateList', () => {
  it('includes the description in criteria tags', () => {
    const result = generateList('programming languages for web development');
    expect(result).toContain('programming languages for web development');
    expect(result).toContain('<criteria>');
  });

  it('includes existing items to omit in XML tags', () => {
    const result = generateList('fruits', { existing: ['apple', 'banana'] });
    expect(result).toContain('apple');
    expect(result).toContain('banana');
    expect(result).toContain('<omitted>');
  });

  it('uses default target count of 10', () => {
    const result = generateList('items');
    expect(result).toContain('10');
  });

  it('uses custom target count', () => {
    const result = generateList('items', { targetNewItemsCount: 25 });
    expect(result).toContain('25');
  });

  it('includes fixes in XML tags when provided', () => {
    const result = generateList('items', { fixes: 'Only include modern items' });
    expect(result).toContain('Only include modern items');
    expect(result).toContain('<fixes>');
  });

  it('includes attachments as reference material', () => {
    const result = generateList('items', {
      attachments: { context: 'Some background information' },
    });
    expect(result).toContain('<reference-material name="context">');
    expect(result).toContain('Some background information');
  });

  it('includes list quality criteria', () => {
    const result = generateList('items');
    expect(result).toContain('Meet the description criteria');
    expect(result).toContain('Not already in the list');
    expect(result).toContain('Not a duplicate');
  });

  it('includes JSON string array format instruction', () => {
    const result = generateList('items');
    expect(result).toContain('JSON array');
    expect(result).toContain('only contain text');
  });

  it('handles empty existing list', () => {
    const result = generateList('items', { existing: [] });
    expect(result).toContain('<omitted>');
    expect(result).toContain('[]');
  });
});
