import { describe, expect, it, vi } from 'vitest';

import { dismantle } from './index.js';

vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn().mockImplementation((text, _options) => {
    // When responseFormat is used, auto-unwrapping will return the value directly
    if (/subcomponents/.test(text)) {
      return ['component1', 'component2'];
    }
    if (/variants/.test(text)) {
      return [];
    }
    return [];
  }),
}));

const examples = [
  {
    name: 'Basic usage',
    inputs: { text: 'test' },
    want: { result: {} },
  },
];

describe('Dismantle chain', () => {
  examples.forEach((example) => {
    it(example.name, async () => {
      const result = await dismantle(example.inputs.text);

      if (example.want.typeOfResult) {
        expect(JSON.stringify(result.tree)).toStrictEqual(JSON.stringify(example.want.result));
      }
    });
  });
});
