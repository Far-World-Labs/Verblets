import { describe, expect, it, vi } from 'vitest';

import bool from './index.js';

vi.mock('../../lib/openai/completions.js', () => ({
  default: vi.fn().mockImplementation((text) => {
    if (/purple lightsaber/.test(text)) {
      return 'True';
    }
    return 'False';
  }),
}));

const examples = [
  {
    title: 'True values',
    inputs: { text: 'Does Mace Windu have a purple lightsaber' },
    want: { result: true },
  },
  {
    title: 'False values',
    inputs: { text: 'Does Mace Windu have a blue lightsaber' },
    want: { result: false },
  },
];

describe('bool verblet', () => {
  examples.forEach((example) => {
    it(example.name, async () => {
      expect(await bool(example.inputs.text)).toStrictEqual(
        example.want.result
      );
    });
  });
});
