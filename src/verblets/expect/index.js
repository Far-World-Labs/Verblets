import callLlm from '../../lib/llm/index.js';
import { emitChainResult } from '../../lib/progress-callback/index.js';

const name = 'expect';

function buildEqualityPrompt({ actual, expected, context }) {
  return `Does the actual value strictly equal the expected value?\n\nActual: ${JSON.stringify(
    actual,
    null,
    2
  )}\nExpected: ${JSON.stringify(expected, null, 2)}\n\n${
    context ? `Context: ${JSON.stringify(context, null, 2)}\n` : ''
  }Answer only "True" or "False".`;
}

function buildConstraintPrompt({ actual, constraint, context }) {
  return `Given this constraint: "${constraint}"\n\nActual value: ${JSON.stringify(
    actual,
    null,
    2
  )}\n\n${
    context ? `Additional context: ${JSON.stringify(context, null, 2)}\n` : ''
  }Does the actual value satisfy the constraint? Answer only "True" or "False".`;
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
  const startTime = Date.now();

  if (equals === undefined && !constraint)
    throw new TypeError('Provide either "equals" or "constraint".');

  const prompt =
    equals !== undefined
      ? buildEqualityPrompt({ actual, expected: equals, context })
      : buildConstraintPrompt({ actual, constraint, context });

  const answer = await callLlm(prompt, { llm });
  const text = typeof answer === 'string' ? answer : answer.content;
  const passed = /^true$/i.test(text.trim());

  emitChainResult({ onProgress, operation }, name, { duration: Date.now() - startTime });

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
