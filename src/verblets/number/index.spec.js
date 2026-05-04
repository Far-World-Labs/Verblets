import { vi, expect } from 'vitest';
import number from './index.js';
import { runTable } from '../../lib/examples-runner/index.js';

vi.mock('../../lib/llm/index.js', () => ({
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
  default: vi.fn().mockImplementation((text) => {
    if (/Everest/.test(text)) return 29029;
    return 'undefined';
  }),
}));

runTable({
  describe: 'number verblet',
  examples: [
    {
      name: 'returns the answered number',
      inputs: { text: 'What is the height of Everest in feet', want: 29029 },
    },
    {
      name: 'unanswerable question → undefined',
      inputs: { text: 'What is the my age in years', want: undefined },
    },
  ],
  process: ({ text }) => number(text),
  expects: ({ result, inputs }) => expect(result).toEqual(inputs.want),
});
