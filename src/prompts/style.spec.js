import { describe, it, expect } from 'vitest';
import style from './style.js';

describe('style', () => {
  it('includes the text in a code block', () => {
    const result = style('Hello world');
    expect(result).toContain('```\nHello world\n```');
  });

  it('asks to rewrite content', () => {
    const result = style('text');
    expect(result).toContain('Rewrite the following content');
  });

  it('uses default tone of informal', () => {
    const result = style('text');
    expect(result).toContain('Tone: informal');
  });

  it('uses default vocabulary of software engineering', () => {
    const result = style('text');
    expect(result).toContain('Vocabulary: software engineering');
  });

  it('uses default sentence structure', () => {
    const result = style('text');
    expect(result).toContain('Sentence structure: varied sentence length, active voice');
  });

  it('uses default point of view', () => {
    const result = style('text');
    expect(result).toContain('Point of view: first person plural');
  });

  it('uses custom tone', () => {
    const result = style('text', { tone: ['formal', 'academic'] });
    expect(result).toContain('Tone: formal, academic');
  });

  it('uses custom vocabulary', () => {
    const result = style('text', { vocabulary: ['medical', 'clinical'] });
    expect(result).toContain('Vocabulary: medical, clinical');
  });

  it('uses custom sentence structure', () => {
    const result = style('text', { sentenceStructure: ['short sentences'] });
    expect(result).toContain('Sentence structure: short sentences');
  });

  it('uses custom point of view', () => {
    const result = style('text', { pointOfView: ['third person'] });
    expect(result).toContain('Point of view: third person');
  });

  it('includes word count range', () => {
    const result = style('text', { minWords: 50, maxWords: 100 });
    expect(result).toContain('between 50 and 100');
  });

  it('uses "any number" when maxWords not specified', () => {
    const result = style('text', { minWords: 50 });
    expect(result).toContain('between 50 and any number');
  });

  it('adds reshape modifier when noise > 0.5', () => {
    const result = style('text', { noise: 0.8 });
    expect(result).toContain('Completely reshape the ideas');
    expect(result).toContain("Don't change the meaning");
  });

  it('omits reshape modifier when noise <= 0.5', () => {
    const result = style('text', { noise: 0.5 });
    expect(result).not.toContain('reshape');
  });

  it('omits reshape modifier when noise is 0', () => {
    const result = style('text', { noise: 0 });
    expect(result).not.toContain('reshape');
  });
});
