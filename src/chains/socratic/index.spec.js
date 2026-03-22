import { describe, expect, it, vi } from 'vitest';
import { socratic } from './index.js';

vi.mock('../../lib/llm/index.js', () => {
  let call = 0;
  return {
    default: vi.fn(() => {
      call += 1;
      return call % 2 === 1 ? `Q${call}` : `A${call}`;
    }),
    jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
  };
});

describe('socratic chain', () => {
  it('runs dialogue for specified depth', async () => {
    const chain = await socratic('topic');
    const result = await chain.run(2);
    expect(result).toHaveLength(2);
    result.forEach((turn) => {
      expect(turn).toHaveProperty('question');
      expect(turn).toHaveProperty('answer');
    });
  });
});
