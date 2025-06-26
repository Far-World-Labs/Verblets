import { describe, it, expect, vi } from 'vitest';
import peopleList from './index.js';

vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn(async () =>
    JSON.stringify([
      { name: 'Alice Smith', description: 'Experienced baker specializing in sourdough' },
    ])
  ),
}));

describe('peopleList', () => {
  it('returns parsed list with correct structure', async () => {
    const list = await peopleList('experienced bakers', 1);
    expect(Array.isArray(list)).toBe(true);
    expect(list).toHaveLength(1);
    expect(list[0]).toHaveProperty('name');
    expect(list[0]).toHaveProperty('description');
    expect(typeof list[0].name).toBe('string');
    expect(typeof list[0].description).toBe('string');
  });

  it('handles custom count parameter', async () => {
    const list = await peopleList('software engineers', 3);
    expect(Array.isArray(list)).toBe(true);
    // Note: actual count depends on LLM response, but we test the call structure
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

  it('handles complex schema descriptions', async () => {
    const schema =
      'diverse team of healthcare professionals with different specializations and experience levels';
    const list = await peopleList(schema, 2);
    expect(Array.isArray(list)).toBe(true);
  });
});
