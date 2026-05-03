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
      check: ({ result }) => {
        expect(result.meaning).toBe('financial institution');
        expect(result.meanings).toStrictEqual(['financial institution', 'edge of a river']);
      },
    },
  ],
  process: ({ word, context }) => disambiguate(word, context),
});
