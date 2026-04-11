import { describe, it, expect, vi, beforeEach } from 'vitest';
import embedMultiQuery from './index.js';
import { testPromptShapingOption } from '../../lib/test-utils/index.js';

vi.mock('../../lib/llm/index.js', () => ({
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
  default: vi.fn(),
}));

const { default: mockLlm } = await import('../../lib/llm/index.js');

beforeEach(() => {
  mockLlm.mockReset();
});

describe('embedMultiQuery', () => {
  it('calls LLM with query and count in prompt and returns array', async () => {
    const variants = [
      'How do plants photosynthesize?',
      'Plant energy conversion from sunlight',
      'Photosynthesis mechanism in green plants',
    ];
    mockLlm.mockResolvedValueOnce(variants);

    const result = await embedMultiQuery('how do plants make food');

    expect(mockLlm).toHaveBeenCalledTimes(1);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(3);

    const prompt = mockLlm.mock.calls[0][0];
    expect(prompt).toContain('how do plants make food');
    expect(prompt).toMatch(/\b3\b/); // default count embedded in prompt
  });

  it('passes custom count to prompt', async () => {
    mockLlm.mockResolvedValueOnce([]);

    await embedMultiQuery('query', { count: 5 });

    const prompt = mockLlm.mock.calls[0][0];
    expect(prompt).toMatch(/\b5\b/);
    expect(prompt).not.toMatch(/\b3\b/); // default count NOT present
  });

  testPromptShapingOption('divergence', {
    invoke: (config) => embedMultiQuery('query', config),
    setupMocks: () => mockLlm.mockResolvedValueOnce([]),
    llmMock: mockLlm,
    markers: { low: 'Stay close', high: 'Maximize diversity' },
  });
});
