import { expect } from 'vitest';
import shortenText from './index.js';
import { ModelService } from '../../services/llm-model/index.js';
import { runTable } from '../examples-runner/index.js';

const testMs = new ModelService();

// Each row carries the constraints it cares about (`startsWith`, `endsWith`,
// `maxTokens`, or `expectedResult`). The processor translates them to boolean
// fields; `expects` asserts every present check is true. A row that doesn't
// supply a constraint simply omits it.
runTable({
  describe: 'shortenText',
  examples: [
    {
      name: 'shortens long text within target tokens',
      inputs: {
        text: 'Hello, world! This is a long text for testing the shortenText function.',
        targetTokenCount: 10,
        startsWith: /^Hello, world!/,
        endsWith: /Text function\.$/,
        maxTokens: 40,
      },
    },
    {
      name: 'short text passes through unchanged',
      inputs: {
        text: 'This text is short enough.',
        targetTokenCount: 8,
        expectedResult: 'This text is short enough.',
      },
    },
    {
      name: 'respects minCharsToRemove',
      inputs: {
        text: 'This is another test to check the minimum characters removal feature.',
        targetTokenCount: 6,
        minCharsToRemove: 5,
        startsWith: /^This is/,
        endsWith: /feature\.$/,
        maxTokens: 25,
      },
    },
  ],
  process: ({ text, targetTokenCount, minCharsToRemove }) => {
    const got = shortenText(text, { modelService: testMs, targetTokenCount, minCharsToRemove });
    const tokens = testMs.getBestPublicModel().toTokens(got).length;
    return { got, tokens };
  },
  expects: ({ result, inputs }) => {
    const { got, tokens } = result;
    if (inputs.startsWith) expect(got).toMatch(inputs.startsWith);
    if (inputs.endsWith) expect(got).toMatch(inputs.endsWith);
    if (inputs.maxTokens !== undefined) expect(tokens).toBeLessThanOrEqual(inputs.maxTokens);
    if (inputs.expectedResult !== undefined) expect(got).toBe(inputs.expectedResult);
  },
});
