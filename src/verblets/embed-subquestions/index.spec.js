import { describe, it, expect, vi, beforeEach } from 'vitest';
import embedSubquestions from './index.js';

vi.mock('../../lib/llm/index.js', () => ({
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
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(3);

    const prompt = mockLlm.mock.calls[0][0];
    expect(prompt).toContain('Is Tokyo an affordable city for the average resident?');
    expect(prompt).toContain('Break');
    expect(prompt).toContain('sub-questions');
  });

  it('uses items schema for auto-unwrapping', async () => {
    mockLlm.mockResolvedValueOnce([]);

    await embedSubquestions('test query');

    const callConfig = mockLlm.mock.calls[0][1];
    const schema = callConfig.modelOptions.response_format.json_schema.schema;
    expect(schema.properties).toHaveProperty('items');
    expect(schema.properties.items.type).toBe('array');
    expect(schema.properties.items.items.type).toBe('string');
    expect(schema.required).toContain('items');
  });

  it('does not include a count parameter in the prompt', async () => {
    mockLlm.mockResolvedValueOnce([]);

    await embedSubquestions('complex query about many things');

    const prompt = mockLlm.mock.calls[0][0];
    // The prompt should not have a numeric count — LLM decides complexity
    expect(prompt).not.toMatch(/Generate \d+ /);
  });

  it('passes llm config through to modelOptions', async () => {
    mockLlm.mockResolvedValueOnce([]);

    await embedSubquestions('query', { llm: { modelName: 'test-model' } });

    const callConfig = mockLlm.mock.calls[0][1];
    expect(callConfig.modelOptions.modelName).toBe('test-model');
  });

  it('passes logger through to LLM call', async () => {
    const logger = { info: vi.fn() };
    mockLlm.mockResolvedValueOnce([]);

    await embedSubquestions('query', { logger });

    const callConfig = mockLlm.mock.calls[0][1];
    expect(callConfig.logger).toBe(logger);
  });
});
