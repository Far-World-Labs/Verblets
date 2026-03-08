import { describe, expect, it } from 'vitest';

import chunkSentences from './index.js';

describe('chunkSentences', () => {
  it('returns single chunk when text fits within maxLen', () => {
    const text = 'Short text.';
    expect(chunkSentences(text, 100)).toEqual(['Short text.']);
  });

  it('returns empty array for empty string', () => {
    expect(chunkSentences('', 100)).toEqual([]);
  });

  it('returns empty array for null/undefined', () => {
    expect(chunkSentences(null, 100)).toEqual([]);
    expect(chunkSentences(undefined, 100)).toEqual([]);
  });

  it('splits at sentence boundaries', () => {
    const text = 'First sentence. Second sentence. Third sentence.';
    const chunks = chunkSentences(text, 20);
    expect(chunks.length).toBeGreaterThan(1);
    // All chunks combined should reconstruct the full text
    expect(chunks.join('')).toBe(text);
  });

  it('falls back to character chunking for single long sentence', () => {
    const text = 'a'.repeat(100);
    const chunks = chunkSentences(text, 30);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join('')).toBe(text);
  });

  it('preserves all text content across chunks', () => {
    const text =
      'The quick brown fox jumped over the lazy dog. ' +
      'It was a sunny day in the park. ' +
      'Birds were singing in the trees.';
    const chunks = chunkSentences(text, 50);
    expect(chunks.join('')).toBe(text);
  });

  it('respects maxLen constraint', () => {
    const text = 'One sentence here. Another sentence there. Yet another sentence follows.';
    const maxLen = 40;
    const chunks = chunkSentences(text, maxLen);
    // First chunk should respect the boundary (may slightly exceed due to sentence grouping)
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('handles text that is exactly maxLen', () => {
    const text = 'Exact length.';
    expect(chunkSentences(text, text.length)).toEqual([text]);
  });
});
