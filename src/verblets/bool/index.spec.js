import { vi, expect } from 'vitest';
import { getTestHelpers } from '../../chains/test-analysis/test-wrappers.js';
import { runTable } from '../../lib/examples-runner/index.js';
import bool from './index.js';

vi.mock('../../lib/llm/index.js', () => ({
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
  default: vi.fn().mockImplementation((text, options) => {
    const systemPrompt = options?.systemPrompt || '';
    if (/purple lightsaber/.test(text) || /purple lightsaber/.test(systemPrompt)) return 'true';
    return 'false';
  }),
}));

const { it } = getTestHelpers('bool verblet');

runTable({
  describe: 'bool verblet',
  examples: [
    {
      name: 'true value',
      inputs: { text: 'Does Mace Windu have a purple lightsaber', want: true },
    },
    {
      name: 'false value',
      inputs: { text: 'Does Mace Windu have a blue lightsaber', want: false },
    },
  ],
  process: ({ text }) => bool(text),
  expects: ({ result, inputs }) => expect(result).toEqual(inputs.want),
  it,
});
