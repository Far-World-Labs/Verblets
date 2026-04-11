import { describe, expect, it, vi } from 'vitest';

import name from './index.js';

vi.mock('../../lib/llm/index.js', () => ({
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
  default: vi.fn().mockImplementation((text) => {
    if (/weather pattern/i.test(text)) {
      return 'BlueSkies';
    }
    return 'undefined';
  }),
}));

const examples = [
  {
    name: 'Generates descriptive name',
    inputs: { text: 'Dataset of weather pattern observations' },
    want: { result: 'BlueSkies' },
  },
  {
    name: 'Returns undefined when unsure',
    inputs: { text: '???' },
    want: { result: undefined },
  },
];

describe('name verblet', () => {
  examples.forEach((example) => {
    it(example.name, async () => {
      expect(await name(example.inputs.text)).toStrictEqual(example.want.result);
    });
  });
});
