import { describe, it, expect } from 'vitest';
import generateQuestions from './generate-questions.js';

describe('generateQuestions', () => {
  it('includes the input text as the question', () => {
    const result = generateQuestions('What is quantum computing?');
    expect(result).toContain('What is quantum computing?');
  });

  it('asks to generate questions instead of answering', () => {
    const result = generateQuestions('any question');
    expect(result).toContain('generate additional questions');
    expect(result).not.toContain('answer the following');
  });

  it('includes existing questions to omit', () => {
    const result = generateQuestions('topic', {
      existing: ['What is it?', 'How does it work?'],
    });
    expect(result).toContain('"What is it?"');
    expect(result).toContain('"How does it work?"');
    expect(result).toContain('<omitted>');
  });

  it('omits the omitted tag when existing list is empty', () => {
    const result = generateQuestions('topic', { existing: [] });
    expect(result).not.toContain('<omitted>');
    expect(result).toContain('Do not use any of the following items:');
  });

  it('works with default options', () => {
    const result = generateQuestions('topic');
    expect(result).toContain('JSON array');
    expect(result).toContain('One question per string');
  });

  it('includes expert perspective guidance', () => {
    const result = generateQuestions('topic');
    expect(result).toContain('expert');
  });

  it('asks for interesting perspectives and unknown information', () => {
    const result = generateQuestions('topic');
    expect(result).toContain('interesting perspectives');
    expect(result).toContain('unknown');
  });
});
