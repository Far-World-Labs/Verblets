import { vi, expect } from 'vitest';
import toObject from './index.js';
import { runTable, equals } from '../../lib/examples-runner/index.js';

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn().mockImplementation((text) => {
    if (/test/.test(text)) return '{}';
    if (/valid-schema/.test(text)) return '{"key": "value"}';
    if (/invalid-schema/.test(text)) return '{"key": "value", "extra": "unexpected"}';
    return 'undefined';
  }),
}));

const objectSchema = {
  type: 'object',
  properties: { key: { type: 'string' } },
  required: ['key'],
};

const strictSchema = {
  type: 'object',
  properties: { key: { type: 'string' } },
  additionalProperties: false,
  required: ['key'],
};

runTable({
  describe: 'To object verblet',
  examples: [
    {
      name: 'parses text into an object',
      inputs: { text: 'test' },
      check: equals({}),
    },
    {
      name: 'returns parsed object matching schema',
      inputs: { text: 'valid-schema', schema: objectSchema },
      check: equals({ key: 'value' }),
    },
    {
      name: 'attempts repair when result has extra properties',
      inputs: { text: 'invalid-schema', schema: strictSchema },
      check: ({ result }) => expect(result).toHaveProperty('key'),
    },
  ],
  process: ({ text, schema }) => toObject(text, schema),
});
