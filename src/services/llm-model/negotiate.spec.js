import { describe, expect, it } from 'vitest';
import modelService from './index.js';
import Model from './model.js';

// helper tokenizer
const tokenizer = (t) => t.split(' ');

describe('Model negotiation', () => {
  it('prefers privacy model when requested', () => {
    modelService.models = {
      privacy: new Model({
        name: 'p',
        maxTokens: 10,
        requestTimeout: 1,
        tokenizer,
      }),
      fastGood: new Model({
        name: 'fg',
        maxTokens: 10,
        requestTimeout: 1,
        tokenizer,
      }),
    };
    modelService.bestPublicModelKey = 'fastGood';
    modelService.bestPrivateModelKey = 'privacy';

    const key = modelService.negotiateModel('fastGood', { privacy: true });
    expect(key).toBe('privacy');
  });

  it('falls back to preferred when no flags set', () => {
    modelService.models.fastGood = new Model({
      name: 'fg',
      maxTokens: 10,
      requestTimeout: 1,
      tokenizer,
    });
    const key = modelService.negotiateModel('fastGood', {});
    expect(key).toBe('fastGood');
  });
});
