import { describe, expect, it, vi } from 'vitest';

import search from './index.js';

vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn().mockImplementation((text) => {
    if (/prompt text to match/.test(text)) {
      return 'True';
    }
    return 'undefined';
  }),
}));

const examples = [
  {
    name: 'Basic usage',
    inputs: { filename: './src/lib/chatgpt/index.js' },
    want: { result: true },
  },
];

describe('Scan JS repo with best-first search', () => {
  examples.forEach((example) => {
    it(example.name, async () => {
      const result = await search({
        node: { filename: example.inputs.filename },
      });

      if (example.want.typeOfResult) {
        expect(typeof result).toStrictEqual(example.want.typeOfResult);
      }
    });
  });
});
