import { describe, it, expect, vi, beforeEach } from 'vitest';
import embedMultiQuery, { mapDivergence } from './index.js';
import { testStringMapper, testPromptShapingOption } from '../../lib/test-utils/index.js';

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(),
}));

const { default: mockLlm } = await import('../../lib/llm/index.js');

beforeEach(() => {
  mockLlm.mockReset();
});

testStringMapper('mapDivergence', mapDivergence);

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

  it('uses items schema for auto-unwrapping', async () => {
    mockLlm.mockResolvedValueOnce([]);

    await embedMultiQuery('test query');

    const callConfig = mockLlm.mock.calls[0][1];
    const schema = callConfig.response_format.json_schema.schema;
    expect(schema.properties).toHaveProperty('items');
    expect(schema.properties.items.type).toBe('array');
    expect(schema.properties.items.items.type).toBe('string');
    expect(schema.required).toContain('items');
  });

  it('uses default count of 3', async () => {
    mockLlm.mockResolvedValueOnce([]);

    await embedMultiQuery('query');

    const prompt = mockLlm.mock.calls[0][0];
    expect(prompt).toMatch(/\b3\b/);
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
