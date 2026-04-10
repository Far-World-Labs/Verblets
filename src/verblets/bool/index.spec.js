import { describe, vi } from 'vitest';
import { getTestHelpers } from '../../chains/test-analysis/test-wrappers.js';
import bool from './index.js';

vi.mock('../../lib/llm/index.js', () => ({
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
  default: vi.fn().mockImplementation((text, options) => {
    // When responseFormat is used, auto-unwrapping will return the value directly
    const systemPrompt = options?.systemPrompt || '';
    if (/purple lightsaber/.test(text) || /purple lightsaber/.test(systemPrompt)) {
      return 'true';
    }
    return 'false';
  }),
}));

const { it, expect } = getTestHelpers('bool verblet');

const examples = [
  {
    name: 'True values',
    inputs: { text: 'Does Mace Windu have a purple lightsaber' },
    want: { result: true },
  },
  {
    name: 'False values',
    inputs: { text: 'Does Mace Windu have a blue lightsaber' },
    want: { result: false },
  },
];

describe('bool verblet', () => {
  examples.forEach((example) => {
    it(example.name, async () => {
      expect(await bool(example.inputs.text)).toStrictEqual(example.want.result);
    });
  });
});
