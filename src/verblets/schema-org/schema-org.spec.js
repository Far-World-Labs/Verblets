import { describe, expect, it, vi } from 'vitest';

import schemaOrg from './index.js';

vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn().mockImplementation((text) => {
    if (/Kyoto \(location\)/.test(text)) {
      // Nothing is done with the result
      // so returning something complicated only introduces complexity
      return '{}';
    }
    return 'undefined';
  }),
}));

const examples = [
  {
    name: 'Basic usage',
    inputs: { text: 'Kyoto (location)' },
    want: { typeOfResult: 'object' },
  },
  {
    name: 'Basic usage',
    inputs: { text: 'Kyoto (location)', type: 'Photo' },
    want: { typeOfResult: 'object' },
  },
];

describe('Schema.org verblet', () => {
  examples.forEach((example) => {
    it(example.name, async () => {
      const result = await schemaOrg(example.inputs.text);

      if (example.want.typeOfResult) {
        expect(typeof result).toStrictEqual(example.want.typeOfResult);
      }
    });
  });
});
