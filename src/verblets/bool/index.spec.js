import { describe, expect, it, vi } from 'vitest';

import bool from './index.js';

vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn().mockImplementation((text, options) => {
    // When responseFormat is used, auto-unwrapping will return the value directly
    const systemPrompt = options?.modelOptions?.systemPrompt || '';
    if (/purple lightsaber/.test(text) || /purple lightsaber/.test(systemPrompt)) {
      return 'true';
    }
    return 'false';
  }),
}));

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
