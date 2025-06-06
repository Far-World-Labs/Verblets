import { describe, expect, it } from 'vitest';

import llmExpect from './index.js';
import { longTestTimeout } from '../../constants/common.js';

const examples = [
  {
    inputs: { actual: 'hello', expected: 'hello' },
    want: { result: true },
  },
  {
    inputs: { actual: 'hello world', constraint: 'Is this a greeting?' },
    want: { result: true },
  },
];

describe('llm-expect verbllet', () => {
  examples.forEach((example) => {
    it(
      example.inputs.constraint || 'equality',
      async () => {
        const result = await llmExpect(
          example.inputs.actual,
          example.inputs.expected,
          example.inputs.constraint
        );
        expect(result).toStrictEqual(example.want.result);
      },
      longTestTimeout
    );
  });
});
