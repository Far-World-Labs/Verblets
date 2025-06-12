import { describe, it, expect } from 'vitest';
import parseLLMList from './index.js';

describe('parseLLMList', () => {
  it('parses JSON array format', () => {
    const input = '["term1", "term2", "term3"]';
    const result = parseLLMList(input);
    expect(result).toEqual(['term1', 'term2', 'term3']);
  });

  it('parses CSV format', () => {
    const input = 'term1, term2, term3';
    const result = parseLLMList(input);
    expect(result).toEqual(['term1', 'term2', 'term3']);
  });

  it('handles empty array response', () => {
    const input = '[]';
    const result = parseLLMList(input);
    expect(result).toEqual([]);
  });

  it('handles responses with notes', () => {
    const input = '<note>No terms found</note>';
    const result = parseLLMList(input);
    expect(result).toEqual([]);
  });

  it('filters out excluded values', () => {
    const input = 'term1, none, term2, null, term3';
    const result = parseLLMList(input);
    expect(result).toEqual(['term1', 'term2', 'term3']);
  });

  it('trims whitespace from items', () => {
    const input = '  term1  ,  term2  ,  term3  ';
    const result = parseLLMList(input);
    expect(result).toEqual(['term1', 'term2', 'term3']);
  });

  it('filters out empty strings', () => {
    const input = 'term1, , term2, , term3';
    const result = parseLLMList(input);
    expect(result).toEqual(['term1', 'term2', 'term3']);
  });

  it('handles custom exclude values', () => {
    const input = 'term1, n/a, term2, unknown, term3';
    const result = parseLLMList(input, { excludeValues: ['n/a', 'unknown'] });
    expect(result).toEqual(['term1', 'term2', 'term3']);
  });

  it('handles invalid input gracefully', () => {
    expect(parseLLMList(null)).toEqual([]);
    expect(parseLLMList(undefined)).toEqual([]);
    expect(parseLLMList('')).toEqual([]);
    expect(parseLLMList(123)).toEqual([]);
  });
});
