import { describe, expect, it } from 'vitest';
import modelService from '../../services/llm-model/index.js';

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
      const got = shortenText(example.inputs.text, {
        targetTokenCount: example.inputs.targetTokenCount,
        minCharsToRemove: example.inputs.minCharsToRemove,
      });

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
        expect(modelService.getBestPublicModel().toTokens(got).length).toBeLessThanOrEqual(
          example.want.maxLength
        );
      }
    });
  });
});
