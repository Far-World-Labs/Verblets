import { describe, it, expect, vi, beforeEach } from 'vitest';
import embedSubquestions from './index.js';
import { testPromptShapingOption } from '../../lib/test-utils/index.js';

vi.mock('../../lib/llm/index.js', () => ({
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
  default: vi.fn(),
}));

const { default: mockLlm } = await import('../../lib/llm/index.js');

beforeEach(() => {
  mockLlm.mockReset();
});

describe('embedSubquestions', () => {
  it('calls LLM with query in prompt and returns sub-questions', async () => {
    const subQuestions = [
      'What is the current population of Tokyo?',
      'What is the average income in Tokyo?',
      "How does Tokyo's cost of living compare to other major cities?",
    ];
    mockLlm.mockResolvedValueOnce(subQuestions);

    const result = await embedSubquestions('Is Tokyo an affordable city for the average resident?');

    expect(mockLlm).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(3);

    const prompt = mockLlm.mock.calls[0][0];
    expect(prompt).toContain('Is Tokyo an affordable city for the average resident?');
  });

  it('does not include a count parameter in the prompt', async () => {
    mockLlm.mockResolvedValueOnce([]);

    await embedSubquestions('complex query about many things');

    const prompt = mockLlm.mock.calls[0][0];
    // The prompt should not have a numeric count — LLM decides complexity
    expect(prompt).not.toMatch(/Generate \d+ /);
  });

  testPromptShapingOption('granularity', {
    invoke: (config) => embedSubquestions('complex query', config),
    setupMocks: () => mockLlm.mockResolvedValueOnce([]),
    llmMock: mockLlm,
    markers: { low: '2-3 broad', high: 'fine-grained' },
  });
});
