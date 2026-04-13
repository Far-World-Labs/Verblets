import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import { nameStep } from '../../lib/context/option.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { DomainEvent, Outcome } from '../../lib/progress/constants.js';
import { asXML } from '../../prompts/wrap-variable.js';

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
  const contextBlock = context ? `\n\n${asXML(context, { tag: 'context' })}` : '';

  return `Does the actual value strictly equal the expected value?

${asXML(actual, { tag: 'actual-value' })}

${asXML(expected, { tag: 'expected-value' })}${contextBlock}

Answer true or false.`;
}

function buildConstraintPrompt({ actual, constraint, context }) {
  const contextBlock = context ? `\n\n${asXML(context, { tag: 'context' })}` : '';

  return `Does the actual value satisfy the given constraint?

${asXML(constraint, { tag: 'constraint' })}

${asXML(actual, { tag: 'actual-value' })}${contextBlock}

Answer true or false.`;
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
  emitter.emit({ event: DomainEvent.input, value: actual });

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
      responseFormat: EXPECT_RESPONSE_FORMAT,
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

    emitter.emit({ event: DomainEvent.output, value: passed });
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

expect.knownTexts = [];
