import { describe, it, expect } from 'vitest';
import normalizeText from './index.js';

describe('normalizeText', () => {
  it('applies NFC normalization', () => {
    // e + combining acute accent → single character é
    const decomposed = 'caf\u0065\u0301';
    const result = normalizeText(decomposed);
    expect(result).toBe('caf\u00e9');
    expect(result.length).toBe(4);
  });

  it('converts \\r\\n and \\r to \\n', () => {
    expect(normalizeText('a\r\nb\rc')).toBe('a\nb\nc');
  });

  it('collapses non-newline whitespace to single space', () => {
    expect(normalizeText('hello   world\t\there')).toBe('hello world here');
  });

  it('preserves paragraph structure (single newlines)', () => {
    const input = 'paragraph one\n\nparagraph two\nline three';
    const result = normalizeText(input);
    expect(result).toBe('paragraph one\n\nparagraph two\nline three');
  });

  it('applies stripPatterns to remove matching content', () => {
    const result = normalizeText('Hello [footnote1] world [footnote2]!', {
      stripPatterns: [/\[footnote\d+\]/g],
    });
    expect(result).toBe('Hello world !');
  });

  it('applies multiple stripPatterns in order', () => {
    const result = normalizeText('foo <!-- comment --> bar <br/> baz', {
      stripPatterns: [/<!--.*?-->/g, /<br\s*\/?>/g],
    });
    expect(result).toBe('foo bar baz');
  });

  it('trims leading and trailing whitespace', () => {
    expect(normalizeText('  \n  hello  \n  ')).toBe('hello');
  });

  it('returns empty string for empty input', () => {
    expect(normalizeText('')).toBe('');
  });

  it('returns empty string for whitespace-only input', () => {
    expect(normalizeText('   \t\n\r\n  ')).toBe('');
  });
});
