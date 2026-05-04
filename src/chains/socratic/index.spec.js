import { vi, expect } from 'vitest';
import { socratic } from './index.js';
import { runTable } from '../../lib/examples-runner/index.js';

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

runTable({
  describe: 'socratic chain',
  examples: [
    {
      name: 'runs dialogue for specified depth',
      inputs: { topic: 'topic', depth: 2, wantTurns: 2 },
    },
  ],
  process: async ({ topic, depth }) => {
    const chain = await socratic(topic);
    return chain.run(depth);
  },
  expects: ({ result, inputs }) => {
    expect(result).toHaveLength(inputs.wantTurns);
    for (const turn of result) {
      expect(turn).toHaveProperty('question');
      expect(turn).toHaveProperty('answer');
    }
  },
});
