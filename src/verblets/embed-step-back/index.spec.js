import { describe, it, expect, vi, beforeEach } from 'vitest';
import embedStepBack from './index.js';

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(),
}));

const { default: mockLlm } = await import('../../lib/llm/index.js');

beforeEach(() => {
  mockLlm.mockReset();
});

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
    expect(prompt).toContain('3'); // default count
    expect(prompt).toContain('broader');
  });

  it('uses items schema for auto-unwrapping', async () => {
    mockLlm.mockResolvedValueOnce([]);

    await embedStepBack('test query');

    const callConfig = mockLlm.mock.calls[0][1];
    const schema = callConfig.modelOptions.response_format.json_schema.schema;
    expect(schema.properties).toHaveProperty('items');
    expect(schema.properties.items.type).toBe('array');
    expect(schema.properties.items.items.type).toBe('string');
    expect(schema.required).toContain('items');
  });

  it('passes count through to prompt', async () => {
    mockLlm.mockResolvedValueOnce([]);

    await embedStepBack('query', { count: 5 });

    const prompt = mockLlm.mock.calls[0][0];
    expect(prompt).toContain('generate 5 broader');
  });

  it('passes llm config through to modelOptions', async () => {
    mockLlm.mockResolvedValueOnce([]);

    await embedStepBack('query', { llm: { modelName: 'test-model' } });

    const callConfig = mockLlm.mock.calls[0][1];
    expect(callConfig.modelOptions.modelName).toBe('test-model');
  });

  it('passes logger through to LLM call', async () => {
    const logger = { info: vi.fn() };
    mockLlm.mockResolvedValueOnce([]);

    await embedStepBack('query', { logger });

    const callConfig = mockLlm.mock.calls[0][1];
    expect(callConfig.logger).toBe(logger);
  });
});
