import { describe, expect, it, vi } from 'vitest';

import number from './index.js';

vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn().mockImplementation((text) => {
    if (/Everest/.test(text)) {
      return '29029';
    }
    return 'undefined';
  }),
}));

const examples = [
  {
    name: 'Basic usage',
    inputs: { text: 'What is the height of Everest in feet' },
    want: { result: 29029 },
  },
  {
    name: 'Unanswerable question',
    inputs: { text: 'What is the my age in years' },
    want: { result: undefined },
  },
];

describe('Number verblet', () => {
  examples.forEach((example) => {
    it(example.name, async () => {
      expect(await number(example.inputs.text)).toStrictEqual(example.want.result);
    });
  });
});
