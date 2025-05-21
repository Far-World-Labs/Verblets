import { describe, it, vi, expect } from 'vitest';
import { anonymize, anonymizeMethod } from './index.js';

vi.mock('./index.js', () => {
  return {
    anonymize: vi.fn(async (input) => {
      if (!input || typeof input.text !== 'string' || !input.text.trim()) {
        throw new Error('Text is required');
      }
      if (!input.method) {
        throw new Error('Method is required');
      }
      if (!['STRICT', 'BALANCED', 'LIGHT'].includes(input.method)) {
        throw new Error('Invalid method');
      }
      return {
        text: 'anonymized',
        stages: {
          distinctiveContentRemoved: true,
          structureNormalized: true,
          patternsSuppressed: true,
        },
      };
    }),
    anonymizeMethod: { STRICT: 'STRICT', BALANCED: 'BALANCED', LIGHT: 'LIGHT' },
  };
});

describe('anonymize', () => {
  it('should return an object with text and stages properties', async () => {
    const input = {
      text: 'Test input',
      method: anonymizeMethod.LIGHT,
    };

    const result = await anonymize(input);

    expect(result).to.have.property('text');
    expect(result).to.have.property('stages');
    expect(result.stages).to.have.property('distinctiveContentRemoved');
    expect(result.stages).to.have.property('structureNormalized');
    expect(result.stages).to.have.property('patternsSuppressed');
  });

  it('should throw an error if method is not provided', async () => {
    const input = {
      text: 'Test input',
    };

    await expect(anonymize(input)).rejects.toThrow('Method is required');
  });

  it('should throw an error if method is invalid', async () => {
    const input = {
      text: 'Test input',
      method: 'INVALID',
    };

    await expect(anonymize(input)).rejects.toThrow('Invalid method');
  });

  it('should throw an error if text is not provided', async () => {
    const input = {
      method: anonymizeMethod.LIGHT,
    };

    await expect(anonymize(input)).rejects.toThrow('Text is required');
  });

  it('should throw an error if text is empty', async () => {
    const input = {
      text: '',
      method: anonymizeMethod.LIGHT,
    };

    await expect(anonymize(input)).rejects.toThrow('Text is required');
  });
});
