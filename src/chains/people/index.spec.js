import { describe, it, expect, vi, beforeEach } from 'vitest';
import peopleList from './index.js';
import llm from '../../lib/llm/index.js';

beforeEach(() => {
  vi.clearAllMocks();
});

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(async () => ({
    people: [
      { name: 'Alice Smith', bio: 'Experienced baker specializing in sourdough', age: 32 },
      { name: 'Bob Chen', bio: 'Pastry chef with 15 years experience', age: 45 },
      { name: 'Carol Davis', bio: 'Home baker turned entrepreneur', age: 28 },
    ],
  })),
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
}));

vi.mock('../../lib/retry/index.js', () => ({
  default: vi.fn(async (fn) => fn()),
}));

describe('peopleList chain', () => {
  it('returns the people array from LLM response with count in prompt', async () => {
    const list = await peopleList('experienced bakers', 5);

    expect(list).toHaveLength(3); // mock returns 3 regardless
    expect(list[0]).toStrictEqual({
      name: 'Alice Smith',
      bio: 'Experienced baker specializing in sourdough',
      age: 32,
    });

    const prompt = llm.mock.calls[0][0];
    expect(prompt).toContain('5');
    expect(prompt).toContain('experienced bakers');
  });

  it('defaults count to 3 when not specified', async () => {
    await peopleList('teachers');

    const prompt = llm.mock.calls[0][0];
    expect(prompt).toContain('3 people');
  });
});
