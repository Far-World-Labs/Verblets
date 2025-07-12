import { describe, it, expect, vi } from 'vitest';
import peopleList from './index.js';

vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn(async () =>
    JSON.stringify({
      people: [
        { name: 'Alice Smith', bio: 'Experienced baker specializing in sourdough', age: 32 },
      ],
    })
  ),
}));

vi.mock('../../lib/retry/index.js', () => ({
  default: vi.fn(async (fn) => await fn()),
}));

describe('peopleList chain', () => {
  it('returns parsed list with correct structure', async () => {
    const list = await peopleList('experienced bakers', 1);
    expect(Array.isArray(list)).toBe(true);
    expect(list).toHaveLength(1);
    expect(list[0]).toHaveProperty('name');
    expect(typeof list[0].name).toBe('string');
  });

  it('handles custom count parameter', async () => {
    const list = await peopleList('software engineers', 3);
    expect(Array.isArray(list)).toBe(true);
  });

  it('handles custom configuration options', async () => {
    const config = {
      llm: { model: 'gpt-4' },
      maxTokens: 500,
    };
    const list = await peopleList('AI researchers', 2, config);
    expect(Array.isArray(list)).toBe(true);
  });

  it('defaults to 3 people when count not specified', async () => {
    const list = await peopleList('teachers');
    expect(Array.isArray(list)).toBe(true);
  });
});
