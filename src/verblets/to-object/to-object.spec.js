import { describe, expect, it, vi } from 'vitest';

import toObject from './index.js';

// NODE_ENV is being set incorrectly under test and I'm not sure why
process.env.NODE_ENV = 'test';

vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn().mockImplementation((text) => {
    if (/test/.test(text)) {
      return '{}';
    }
    if (/valid-schema/.test(text)) {
      return '{"key": "value"}';
    }
    if (/invalid-schema/.test(text)) {
      return '{"key": "value", "extra": "unexpected"}';
    }
    return 'undefined';
  }),
}));

const examples = [
  {
    name: 'Basic usage',
    inputs: { text: 'test' },
    want: { typeOfResult: 'object' },
  },
  {
    name: 'Valid schema',
    inputs: {
      text: 'valid-schema',
      schema: {
        type: 'object',
        properties: { key: { type: 'string' } },
        required: ['key'],
      },
    },
    want: { typeOfResult: 'object' },
  },
  {
    name: 'Invalid schema',
    inputs: {
      text: 'invalid-schema',
      schema: {
        type: 'object',
        properties: { key: { type: 'string' } },
        additionalProperties: false,
        required: ['key'],
      },
    },
    wantError: true,
  },
];

describe('To object verblet', () => {
  examples.forEach((example) => {
    it(example.name, async () => {
      try {
        const result = await toObject(
          example.inputs.text,
          example.inputs.schema
        );

        if (example.want.typeOfResult) {
          expect(typeof result).toStrictEqual(example.want.typeOfResult);
        }
      } catch (error) {
        if (example.wantError) {
          expect(error).toBeInstanceOf(Error);
        } else {
          throw error;
        }
      }
    });
  });
});
