import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import { nameStep } from '../../lib/context/option.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { Outcome } from '../../lib/progress/constants.js';

const name = 'expect';

const expectSchema = {
  type: 'object',
  properties: {
    value: { type: 'boolean' },
  },
  required: ['value'],
  additionalProperties: false,
};

const EXPECT_RESPONSE_FORMAT = jsonSchema('expect_result', expectSchema);

function buildEqualityPrompt({ actual, expected, context }) {
  return `Does the actual value strictly equal the expected value?\n\nActual: ${JSON.stringify(
    actual,
    null,
    2
  )}\nExpected: ${JSON.stringify(expected, null, 2)}\n\n${
    context ? `Context: ${JSON.stringify(context, null, 2)}\n` : ''
  }Answer true or false.`;
}

function buildConstraintPrompt({ actual, constraint, context }) {
  return `Given this constraint: "${constraint}"\n\nActual value: ${JSON.stringify(
    actual,
    null,
    2
  )}\n\n${
    context ? `Additional context: ${JSON.stringify(context, null, 2)}\n` : ''
  }Does the actual value satisfy the constraint? Answer true or false.`;
}

export async function llmAssert({
  actual,
  equals,
  constraint,
  context,
  throws = true,
  message,
  llm = {},
  onProgress,
  operation,
}) {
  const runConfig = nameStep(name, { onProgress, operation });
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();

  let passed;
  try {
    if (equals === undefined && !constraint)
      throw new TypeError('Provide either "equals" or "constraint".');
    const prompt =
      equals !== undefined
        ? buildEqualityPrompt({ actual, expected: equals, context })
        : buildConstraintPrompt({ actual, constraint, context });

    const answer = await callLlm(prompt, {
      ...runConfig,
      llm,
      response_format: EXPECT_RESPONSE_FORMAT,
    });
    passed = answer === true;

    if (!passed && throws) {
      let msg;
      if (typeof message === 'function') {
        msg = message({ actual, equals, constraint });
      } else {
        msg = message;
      }

      if (!msg) {
        msg =
          equals !== undefined
            ? 'LLM assertion failed: Does the actual value strictly equal the expected value?'
            : `LLM assertion failed: ${constraint}`;
      }

      throw new Error(msg);
    }

    emitter.complete({ outcome: Outcome.success });
  } catch (err) {
    emitter.error(err);
    throw err;
  }

  return passed;
}

export default function expect(actual, shared = {}) {
  const run = (payload, opts) => llmAssert({ actual, ...payload, ...shared, ...opts });
  return {
    toEqual(expected, opts) {
      return run({ equals: expected }, opts);
    },
    toSatisfy(constraint, opts) {
      return run({ constraint }, opts);
    },
  };
}
