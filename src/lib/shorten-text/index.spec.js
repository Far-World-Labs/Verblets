import shortenText from './index.js';
import { ModelService } from '../../services/llm-model/index.js';
import { runTable } from '../examples-runner/index.js';

const testMs = new ModelService();

// Pattern for "compound assertion per row, different per row": pass the
// constraints in `inputs` (regex / max-token / equality), let the processor
// translate each constraint into a boolean field, and assert the booleans
// via `partial`. Keeps row-specific knowledge in the row, not the processor.
const examples = [
  {
    name: 'shortens long text within target tokens',
    inputs: {
      text: 'Hello, world! This is a long text for testing the shortenText function.',
      targetTokenCount: 10,
      startsWith: /^Hello, world!/,
      endsWith: /Text function\.$/,
      maxTokens: 40,
    },
    want: { partial: { matchesStart: true, matchesEnd: true, withinTokenLimit: true } },
  },
  {
    name: 'short text passes through unchanged',
    inputs: {
      text: 'This text is short enough.',
      targetTokenCount: 8,
      expectedResult: 'This text is short enough.',
    },
    want: { partial: { matchesExpected: true } },
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
    want: { partial: { matchesStart: true, matchesEnd: true, withinTokenLimit: true } },
  },
];

const process = ({
  text,
  targetTokenCount,
  minCharsToRemove,
  startsWith,
  endsWith,
  maxTokens,
  expectedResult,
}) => {
  const got = shortenText(text, { modelService: testMs, targetTokenCount, minCharsToRemove });
  const tokens = testMs.getBestPublicModel().toTokens(got).length;
  return {
    matchesStart: !startsWith || startsWith.test(got),
    matchesEnd: !endsWith || endsWith.test(got),
    withinTokenLimit: !maxTokens || tokens <= maxTokens,
    matchesExpected: expectedResult === undefined || got === expectedResult,
  };
};

runTable({ describe: 'shortenText', examples, process });
