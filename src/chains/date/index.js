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

List up to three short yes/no checks that would confirm a date answer is correct. For holiday dates (like Christmas, New Year's, etc.), ensure the date is in UTC/GMT timezone and matches the standard calendar date (e.g. Christmas is always December 25th). If nothing specific comes to mind, respond with ["The result is a valid date"].

${onlyJSONArray}`;

const buildCheckPrompt = (dateValue, check) => {
  const iso = dateValue.toISOString();
  const human = dateValue.toUTCString();
  const utcDate = new Date(
    Date.UTC(dateValue.getUTCFullYear(), dateValue.getUTCMonth(), dateValue.getUTCDate())
  );
  return `Date in ISO: ${iso} (UTC: ${human}, UTC date: ${utcDate.toISOString()}). Does this satisfy "${check}"?`;
};

export default async function date(text, { maxAttempts = 3 } = {}) {
  const llmExpectations = (await toObject(await chatGPT(expectationPrompt(text)))) || [
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

    // Convert to UTC date for consistent checks
    const utcValue = new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
    );

    let failedCheck;
    for (const check of llmExpectations) {
      // eslint-disable-next-line no-await-in-loop
      const passed = await bool(buildCheckPrompt(utcValue, check));
      if (!passed) {
        failedCheck = check;
        break;
      }
    }

    if (!failedCheck) return utcValue;

    attemptText = `${text} The previous answer (${utcValue.toISOString()}) failed to satisfy: "${failedCheck}". Try again.`;
  }
  const finalValue = toDate(stripResponse(response));
  return finalValue
    ? new Date(
        Date.UTC(finalValue.getUTCFullYear(), finalValue.getUTCMonth(), finalValue.getUTCDate())
      )
    : undefined;
}
