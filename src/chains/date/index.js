import chatGPT from '../../lib/chatgpt/index.js';
import stripResponse from '../../lib/strip-response/index.js';
import toDate from '../../lib/to-date/index.js';
import bool from '../../verblets/bool/index.js';
import toObject from '../../verblets/to-object/index.js';
import { constants as promptConstants } from '../../prompts/index.js';

const {
  asDate,
  asUndefinedByDefault,
  contentIsQuestion,
  explainAndSeparate,
  explainAndSeparatePrimitive,
  onlyJSONArray,
} = promptConstants;

const expectationPrompt = (question) => `${contentIsQuestion} ${question}

List up to three short yes/no checks that would confirm a date answer is correct. If nothing specific comes to mind, respond with ["The result is a valid date"].

${onlyJSONArray}`;

const buildCheckPrompt = (dateValue, check) => {
  const iso = dateValue.toISOString();
  const human = dateValue.toUTCString();
  return `Date in ISO: ${iso} (UTC: ${human}). Does this satisfy "${check}"?`;
};

export default async function date(text, { maxAttempts = 3 } = {}) {
  const expectations = (await toObject(await chatGPT(expectationPrompt(text)))) || [
    'The result is a valid date',
  ];

  let attemptText = text;
  let response;
  for (let i = 0; i < maxAttempts; i += 1) {
    const datePrompt = `${contentIsQuestion} ${attemptText}\n\n${explainAndSeparate} ${explainAndSeparatePrimitive}\n\n${asDate} ${asUndefinedByDefault}`;
    // eslint-disable-next-line no-await-in-loop
    response = await chatGPT(datePrompt);
    const value = toDate(stripResponse(response));
    if (value === undefined) return undefined;

    let failedCheck;
    for (const check of expectations) {
      // eslint-disable-next-line no-await-in-loop
      const passed = await bool(buildCheckPrompt(value, check));
      if (!passed) {
        failedCheck = check;
        break;
      }
    }

    if (!failedCheck) return value;

    attemptText = `${text} The previous answer (${value.toISOString()}) failed to satisfy: "${failedCheck}". Try again.`;
  }
  return toDate(stripResponse(response));
}
