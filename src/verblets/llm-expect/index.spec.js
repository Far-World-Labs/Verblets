import { describe, expect, it, vi } from 'vitest';

import llmExpect from './index.js';

vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn().mockImplementation((prompt) => {
    if (/greeting/.test(prompt)) {
      return 'True';
    }
    if (/strictly equal/.test(prompt)) {
      if (/"hello"/.test(prompt) && /"bye"/.test(prompt)) {
        return 'False';
      }
      if (prompt.match(/"hello"/g)?.length >= 2) {
        return 'True';
      }
    }
    return 'False';
  }),
}));

const examples = [
  {
    name: 'Equality check',
    inputs: { actual: 'hello', expected: 'hello' },
    want: { result: true },
  },
  {
    name: 'Constraint check',
    inputs: {
      actual: 'hello world',
      constraint: 'Is this a greeting',
    },
    want: { result: true },
  },
  {
    name: 'Mismatch returns false',
    inputs: { actual: 'hello', expected: 'bye' },
    want: { result: false },
  },
];

describe('llm-expect verblet', () => {
  examples.forEach((example) => {
    it(example.name, async () => {
      const result = await llmExpect(
        example.inputs.actual,
        example.inputs.expected,
        example.inputs.constraint
      );
      expect(result).toStrictEqual(example.want.result);
    });
  });
});
