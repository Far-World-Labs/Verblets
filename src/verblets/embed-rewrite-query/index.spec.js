import { describe, it, expect, vi, beforeEach } from 'vitest';
import embedRewriteQuery from './index.js';

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(),
}));

const { default: mockLlm } = await import('../../lib/llm/index.js');

beforeEach(() => {
  mockLlm.mockReset();
});

describe('embedRewriteQuery', () => {
  it('calls LLM with query embedded in prompt and returns rewritten query', async () => {
    mockLlm.mockResolvedValueOnce(
      'What is the process by which green plants convert sunlight into chemical energy?'
    );

    const result = await embedRewriteQuery('how do plants make food');

    expect(mockLlm).toHaveBeenCalledTimes(1);
    expect(typeof result).toBe('string');
    expect(result).toContain('plants');

    const prompt = mockLlm.mock.calls[0][0];
    expect(prompt).toContain('how do plants make food');
    expect(prompt).toContain('Rewrite');
  });

  it('uses value schema for auto-unwrapping', async () => {
    mockLlm.mockResolvedValueOnce('rewritten');

    await embedRewriteQuery('test query');

    const callConfig = mockLlm.mock.calls[0][1];
    const schema = callConfig.modelOptions.response_format.json_schema.schema;
    expect(schema.properties).toHaveProperty('value');
    expect(schema.properties.value.type).toBe('string');
    expect(schema.required).toContain('value');
  });

  it('passes llm config through to modelOptions', async () => {
    mockLlm.mockResolvedValueOnce('rewritten');

    await embedRewriteQuery('query', { llm: { modelName: 'test-model', temperature: 0.5 } });

    const callConfig = mockLlm.mock.calls[0][1];
    expect(callConfig.modelOptions.modelName).toBe('test-model');
    expect(callConfig.modelOptions.temperature).toBe(0.5);
  });

  it('passes logger through to LLM call', async () => {
    const logger = { info: vi.fn() };
    mockLlm.mockResolvedValueOnce('rewritten');

    await embedRewriteQuery('query', { logger });

    const callConfig = mockLlm.mock.calls[0][1];
    expect(callConfig.logger).toBe(logger);
  });
});
