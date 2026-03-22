import { describe, expect, it, vi } from 'vitest';

import toObject from './index.js';

vi.mock('../../lib/llm/index.js', () => ({
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

describe('To object verblet', () => {
  it('parses text into an object', async () => {
    const result = await toObject('test');
    expect(result).toStrictEqual({});
  });

  it('returns parsed object matching schema', async () => {
    const schema = {
      type: 'object',
      properties: { key: { type: 'string' } },
      required: ['key'],
    };
    const result = await toObject('valid-schema', schema);
    expect(result).toStrictEqual({ key: 'value' });
  });

  it('attempts repair when result has extra properties', async () => {
    const schema = {
      type: 'object',
      properties: { key: { type: 'string' } },
      additionalProperties: false,
      required: ['key'],
    };
    const result = await toObject('invalid-schema', schema);
    expect(result).toHaveProperty('key');
  });
});
