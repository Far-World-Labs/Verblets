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
    expect(result).toContain('plants');

    const prompt = mockLlm.mock.calls[0][0];
    expect(prompt).toContain('how do plants make food');
  });
});
