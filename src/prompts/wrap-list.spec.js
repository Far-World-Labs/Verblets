import { describe, it, expect } from 'vitest';
import wrapList from './wrap-list.js';

describe('wrapList', () => {
  it('formats a list with numbered items and default intro text', () => {
    const result = wrapList(['apples', 'bananas', 'cherries']);
    expect(result).toContain('Consider the following items:');
    expect(result).toContain('1. apples');
    expect(result).toContain('2. bananas');
    expect(result).toContain('3. cherries');
  });

  it('uses custom intro text', () => {
    const result = wrapList(['item'], { introText: 'Review these:' });
    expect(result).toContain('Review these:');
    expect(result).toContain('1. item');
  });

  it('returns empty XML data tag for empty list', () => {
    const result = wrapList([]);
    expect(result).toContain('<data>');
    expect(result).not.toContain('Consider the following items:');
  });

  it('returns empty XML data tag when called with no arguments', () => {
    const result = wrapList();
    expect(result).toContain('<data>');
  });

  it('wraps list content in XML data tags', () => {
    const result = wrapList(['one']);
    expect(result).toContain('<data>');
    expect(result).toContain('</data>');
  });

  it('formats items with dash-space-number prefix', () => {
    const result = wrapList(['first', 'second']);
    expect(result).toContain(' - 1. first');
    expect(result).toContain(' - 2. second');
  });
});
