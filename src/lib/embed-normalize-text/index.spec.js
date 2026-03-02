import { describe, it, expect } from 'vitest';
import embedNormalizeText from './index.js';

describe('embedNormalizeText', () => {
  it('applies NFC normalization', () => {
    // e + combining acute accent → single character é
    const decomposed = 'caf\u0065\u0301';
    const result = embedNormalizeText(decomposed);
    expect(result).toBe('caf\u00e9');
    expect(result.length).toBe(4);
  });

  it('converts \\r\\n and \\r to \\n', () => {
    expect(embedNormalizeText('a\r\nb\rc')).toBe('a\nb\nc');
  });

  it('collapses non-newline whitespace to single space', () => {
    expect(embedNormalizeText('hello   world\t\there')).toBe('hello world here');
  });

  it('preserves paragraph structure (single newlines)', () => {
    const input = 'paragraph one\n\nparagraph two\nline three';
    const result = embedNormalizeText(input);
    expect(result).toBe('paragraph one\n\nparagraph two\nline three');
  });

  it('applies stripPatterns to remove matching content', () => {
    const result = embedNormalizeText('Hello [footnote1] world [footnote2]!', {
      stripPatterns: [/\[footnote\d+\]/g],
    });
    expect(result).toBe('Hello world !');
  });

  it('applies multiple stripPatterns in order', () => {
    const result = embedNormalizeText('foo <!-- comment --> bar <br/> baz', {
      stripPatterns: [/<!--.*?-->/g, /<br\s*\/?>/g],
    });
    expect(result).toBe('foo bar baz');
  });

  it('trims leading and trailing whitespace', () => {
    expect(embedNormalizeText('  \n  hello  \n  ')).toBe('hello');
  });

  it('returns empty string for empty input', () => {
    expect(embedNormalizeText('')).toBe('');
  });

  it('returns empty string for whitespace-only input', () => {
    expect(embedNormalizeText('   \t\n\r\n  ')).toBe('');
  });
});
