import { vi, expect } from 'vitest';
import name from './index.js';
import { runTable } from '../../lib/examples-runner/index.js';

vi.mock('../../lib/llm/index.js', () => ({
  jsonSchema: (n, schema) => ({ type: 'json_schema', json_schema: { name: n, schema } }),
  default: vi.fn().mockImplementation((text) => {
    if (/weather pattern/i.test(text)) return 'BlueSkies';
    return 'undefined';
  }),
}));

runTable({
  describe: 'name verblet',
  examples: [
    {
      name: 'generates a descriptive name',
      inputs: { text: 'Dataset of weather pattern observations', want: 'BlueSkies' },
    },
    { name: 'returns undefined when unsure', inputs: { text: '???', want: undefined } },
  ],
  process: ({ text }) => name(text),
  expects: ({ result, inputs }) => expect(result).toEqual(inputs.want),
});
