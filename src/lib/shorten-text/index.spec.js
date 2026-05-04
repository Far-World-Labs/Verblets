import { expect } from 'vitest';
import shortenText from './index.js';
import { ModelService } from '../../services/llm-model/index.js';
import { runTable } from '../examples-runner/index.js';

const testMs = new ModelService();

// Each row carries the constraints it cares about under `want`.
runTable({
  describe: 'shortenText',
  examples: [
    {
      name: 'shortens long text within target tokens',
      inputs: {
        text: 'Hello, world! This is a long text for testing the shortenText function.',
        targetTokenCount: 10,
      },
      want: {
        startsWith: /^Hello, world!/,
        endsWith: /Text function\.$/,
        maxTokens: 40,
      },
    },
    {
      name: 'short text passes through unchanged',
      inputs: { text: 'This text is short enough.', targetTokenCount: 8 },
      want: { value: 'This text is short enough.' },
    },
    {
      name: 'respects minCharsToRemove',
      inputs: {
        text: 'This is another test to check the minimum characters removal feature.',
        targetTokenCount: 6,
        minCharsToRemove: 5,
      },
      want: {
        startsWith: /^This is/,
        endsWith: /feature\.$/,
        maxTokens: 25,
      },
    },
  ],
  process: ({ inputs }) => {
    const got = shortenText(inputs.text, {
      modelService: testMs,
      targetTokenCount: inputs.targetTokenCount,
      minCharsToRemove: inputs.minCharsToRemove,
    });
    const tokens = testMs.getBestPublicModel().toTokens(got).length;
    return { got, tokens };
  },
  expects: ({ result, want }) => {
    const { got, tokens } = result;
    if (want.startsWith) expect(got).toMatch(want.startsWith);
    if (want.endsWith) expect(got).toMatch(want.endsWith);
    if (want.maxTokens !== undefined) expect(tokens).toBeLessThanOrEqual(want.maxTokens);
    if ('value' in want) expect(got).toBe(want.value);
  },
});
