import { describe, expect, it } from 'vitest';
import toTokens from '../to-tokens/index.js';

import shortenText from './index.js';

const examples = [
  {
    name: 'Basic usage',
    inputs: {
      text: 'Hello, world! This is a long text for testing the shortenText function.',
      targetTokenCount: 10,
    },
    want: {
      start: /^Hello, world!/,
      end: /Text function\.$/,
      maxLength: 40,
    },
  },
  {
    name: 'No trimming needed',
    inputs: {
      text: 'This text is short enough.',
      targetTokenCount: 8,
    },
    want: {
      result: 'This text is short enough.',
    },
  },
  {
    name: 'Minimum characters removal',
    inputs: {
      text: 'This is another test to check the minimum characters removal feature.',
      targetTokenCount: 6,
      minCharsToRemove: 5,
    },
    want: {
      start: /^This is/,
      end: /feature\.$/,
      maxLength: 25,
    },
  },
];

describe('Shorten text', () => {
  examples.forEach((example) => {
    it(example.name, () => {
      const got = shortenText(
        example.inputs.text,
        example.inputs.targetTokenCount,
        example.inputs.minCharsToRemove
      );

      if (example.want.result) {
        expect(got).toEqual(example.want.result);
      }
      if (example.want.start) {
        expect(example.want.start.test(got)).toBe(true);
      }
      if (example.want.start) {
        expect(example.want.end.test(got)).toBe(true);
      }
      if (example.want.maxLength) {
        expect(toTokens(got).length).toBeLessThanOrEqual(
          example.want.maxLength
        );
      }
    });
  });
});
