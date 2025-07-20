import { describe, expect, it, vi } from 'vitest';
import fillMissing from './index.js';

vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn().mockResolvedValue({
    template: 'The {animal} jumps over the {object}.',
    variables: {
      animal: { original: '???', candidate: 'fox', confidence: 0.9 },
      object: { original: '???', candidate: 'fence', confidence: 0.8 },
    },
  }),
}));

describe('fillMissing verblet', () => {
  it('returns imputed text structure', async () => {
    const result = await fillMissing('The ??? jumps over the ???.');
    expect(result).toStrictEqual({
      template: 'The {animal} jumps over the {object}.',
      variables: {
        animal: { original: '???', candidate: 'fox', confidence: 0.9 },
        object: { original: '???', candidate: 'fence', confidence: 0.8 },
      },
    });
  });

  it('uses JSON schema validation', async () => {
    const chatGPT = (await import('../../lib/chatgpt/index.js')).default;

    await fillMissing('Missing ??? text');
    const modelOptions = chatGPT.mock.calls[0][1].modelOptions;
    expect(modelOptions).toHaveProperty('response_format');
    expect(modelOptions.response_format.type).toBe('json_schema');
    expect(modelOptions.response_format.json_schema.name).toBe('fill_missing_result');
  });
});
