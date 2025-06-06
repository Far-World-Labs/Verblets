import chatGPT from '../../lib/chatgpt/index.js';
import stripResponse from '../../lib/strip-response/index.js';
import toBool from '../../lib/to-bool/index.js';
import { constants as promptConstants, wrapVariable } from '../../prompts/index.js';

const {
  asBool,
  asUndefinedByDefault,
  contentIsQuestion,
  explainAndSeparate,
  explainAndSeparatePrimitive,
} = promptConstants;

export default async (actual, expectedOrConstraint, maybeConstraint, options = {}) => {
  let expected;
  let constraint = '';

  if (typeof maybeConstraint === 'undefined') {
    expected = expectedOrConstraint;
  } else {
    expected = expectedOrConstraint;
    constraint = maybeConstraint;
  }

  if (!constraint) {
    constraint = 'Does the actual value strictly equal the expected value?';
  }

  const parts = [
    contentIsQuestion,
    wrapVariable(JSON.stringify(actual), { tag: 'actual' }),
    expected !== undefined ? wrapVariable(JSON.stringify(expected), { tag: 'expected' }) : '',
    wrapVariable(constraint, { tag: 'constraint' }),
    '',
    `${explainAndSeparate} ${explainAndSeparatePrimitive}`,
    `${asBool} ${asUndefinedByDefault}`,
  ];

  const prompt = parts.filter(Boolean).join('\n');
  const response = await chatGPT(prompt, { ...options });
  return toBool(stripResponse(response));
};
