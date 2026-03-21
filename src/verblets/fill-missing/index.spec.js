import { describe, expect, it, vi } from 'vitest';
import fillMissing from './index.js';
import { testPromptShapingOption } from '../../lib/test-utils/index.js';

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn().mockResolvedValue({
    template: 'The {animal} jumps over the {object}.',
    variables: {
      animal: { original: '???', candidate: 'fox', confidence: 0.9 },
      object: { original: '???', candidate: 'fence', confidence: 0.8 },
    },
  }),
}));

const mockLlm = (await import('../../lib/llm/index.js')).default;

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

  testPromptShapingOption('creativity', {
    invoke: (config) => fillMissing('Missing ??? text', config),
    setupMocks: () => mockLlm.mockClear(),
    llmMock: mockLlm,
    markers: { low: 'conservative', high: 'speculative' },
  });

  it('uses JSON schema validation', async () => {
    await fillMissing('Missing ??? text');
    const options = mockLlm.mock.calls[0][1];
    expect(options).toHaveProperty('response_format');
    expect(options.response_format.type).toBe('json_schema');
    expect(options.response_format.json_schema.name).toBe('fill_missing_result');
  });
});
