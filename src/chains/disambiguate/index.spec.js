import { vi, expect } from 'vitest';
import disambiguate from './index.js';
import { runTable } from '../../lib/examples-runner/index.js';

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn(async (prompt) => {
    if (/List all distinct dictionary meanings/.test(prompt)) {
      return { meanings: ['financial institution', 'edge of a river'] };
    }
    return { meanings: [] };
  }),
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
}));

vi.mock('../score/index.js', () => ({
  default: vi.fn(async (list) => list.map((_, i) => (i === 0 ? 9 : 1))),
}));

runTable({
  describe: 'disambiguate chain',
  examples: [
    {
      name: 'selects meaning based on context',
      inputs: { word: 'bank', context: 'withdraw money' },
      want: {
        meaning: 'financial institution',
        meanings: ['financial institution', 'edge of a river'],
      },
    },
  ],
  process: ({ inputs }) => disambiguate(inputs.word, inputs.context),
  expects: ({ result, want }) => {
    expect(result.meaning).toBe(want.meaning);
    expect(result.meanings).toEqual(want.meanings);
  },
});
