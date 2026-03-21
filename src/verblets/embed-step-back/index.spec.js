import { describe, it, expect, vi, beforeEach } from 'vitest';
import embedStepBack, { mapAbstraction } from './index.js';
import { testStringMapper, testPromptShapingOption } from '../../lib/test-utils/index.js';

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(),
}));

const { default: mockLlm } = await import('../../lib/llm/index.js');

beforeEach(() => {
  mockLlm.mockReset();
});

testStringMapper('mapAbstraction', mapAbstraction);

describe('embedStepBack', () => {
  it('calls LLM with query and count in prompt and returns broader questions', async () => {
    const questions = [
      'What are the fundamental principles of plant biology?',
      'How do organisms convert energy from their environment?',
      'What role does sunlight play in biological processes?',
    ];
    mockLlm.mockResolvedValueOnce(questions);

    const result = await embedStepBack('how do plants make food');

    expect(mockLlm).toHaveBeenCalledTimes(1);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(3);

    const prompt = mockLlm.mock.calls[0][0];
    expect(prompt).toContain('how do plants make food');
    expect(prompt).toMatch(/\b3\b/); // default count embedded in prompt
  });

  it('uses items schema for auto-unwrapping', async () => {
    mockLlm.mockResolvedValueOnce([]);

    await embedStepBack('test query');

    const callConfig = mockLlm.mock.calls[0][1];
    const schema = callConfig.response_format.json_schema.schema;
    expect(schema.properties).toHaveProperty('items');
    expect(schema.properties.items.type).toBe('array');
    expect(schema.properties.items.items.type).toBe('string');
    expect(schema.required).toContain('items');
  });

  it('passes count through to prompt', async () => {
    mockLlm.mockResolvedValueOnce([]);

    await embedStepBack('query', { count: 5 });

    const prompt = mockLlm.mock.calls[0][0];
    expect(prompt).toMatch(/\b5\b/);
    expect(prompt).not.toMatch(/\b3\b/); // default count NOT present
  });

  testPromptShapingOption('abstraction', {
    invoke: (config) => embedStepBack('query', config),
    setupMocks: () => mockLlm.mockResolvedValueOnce([]),
    llmMock: mockLlm,
    markers: { low: 'one level more general', high: 'foundational principles' },
  });
});
