import { describe, it, expect } from 'vitest';
import summarize from './summarize.js';

describe('summarize', () => {
  it('wraps text in XML content-to-summarize tags', () => {
    const result = summarize('A long article about AI.');
    expect(result).toContain('<content-to-summarize>');
    expect(result).toContain('A long article about AI.');
    expect(result).toContain('</content-to-summarize>');
  });

  it('uses default instructions when none provided', () => {
    const result = summarize('text');
    expect(result).toContain('concise summary');
    expect(result).toContain('key points');
  });

  it('uses custom instructions when provided', () => {
    const result = summarize('text', 'Focus on technical details only');
    expect(result).toContain('Focus on technical details only');
    expect(result).toContain('<summarization-instructions>');
  });

  it('wraps default instructions in XML tags', () => {
    const result = summarize('text');
    expect(result).toContain('<summarization-instructions>');
    expect(result).toContain('</summarization-instructions>');
  });

  it('includes importance guidelines', () => {
    const result = summarize('text');
    expect(result).toContain('significant information');
    expect(result).toContain('clarity and coherence');
    expect(result).toContain('critical details');
  });

  it('asks to summarize according to instructions', () => {
    const result = summarize('text');
    expect(result).toContain('Summarize the content below');
  });

  it('returns empty string for empty text (asXML behavior)', () => {
    const result = summarize('');
    expect(result).not.toContain('<content-to-summarize>');
  });
});
