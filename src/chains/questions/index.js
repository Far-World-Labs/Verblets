import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import { constants as promptConstants, asXML } from '../../prompts/index.js';
import { questionsListSchema, selectedQuestionSchema } from './schemas.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { DomainEvent, Outcome } from '../../lib/progress/constants.js';
import { getOption, nameStep, getOptions, withPolicy } from '../../lib/context/option.js';

const name = 'questions';

// ===== Option Mappers =====

/**
 * Map exploration option to a search breadth value.
 * Controls the breadth vs. depth trade-off in question generation.
 * low: narrow breadth (0.3) — depth-first, drills into random questions, finds niche angles.
 * high: wide breadth (0.8) — breadth-first, keeps most generated questions, maximum diversity.
 * @param {string|number|undefined} value
 * @returns {number} Search breadth between 0 and 1
 */
export const mapExploration = (value) => {
  if (value === undefined) return 0.5;
  if (typeof value === 'number') return value;
  return { low: 0.3, med: 0.5, high: 0.8 }[value] ?? 0.5;
};

const { contentIsChoices } = promptConstants;

// Returns a random subset of a list with length between 1 and the length of the list
// based on an input value between 0 and 1
const getRandomSubset = (list, value) => {
  const numItems = Math.round(value * list.length) + 1;
  const listShuffled = list.toSorted(() => Math.random() - 0.5);
  return listShuffled.slice(0, numItems);
};

const pickInterestingQuestion = (originalQuestion, { existing = [] }) => {
  const existingJoined = existing.map((item) => ` - ${item}`).join('\n');

  return `Choose one interesting question from the following list of questions. The main goal is to determine "${originalQuestion}".

${contentIsChoices}
\`\`\`
${existingJoined}
\`\`\`

Return a JSON object with a "question" property containing the selected question.`;
};

const shouldSkipNull = (result, resultsAll) => {
  return resultsAll.includes(result);
};

const shouldStopNull = (result, resultsAll, resultsNew, attempts = 0) => {
  return resultsAll.length > 50 || attempts > 5;
};

const formatQuestionsPrompt = (text, { existing = [] } = {}) => {
  const existingJoined = existing.map((item) => `"${item}"`).join(', ');

  return `Instead of answering the following question, I would like you to generate additional questions. Consider interesting perspectives. Consider what information is unknown. Overall, just come up with good questions.

${asXML(text, { tag: 'question' })}

${existing.length > 0 ? `Questions to omit: ${asXML(existingJoined, { tag: 'omitted' })}` : ''}

One question per string.`;
};

const generateQuestions = async function* generateQuestionsGenerator(text, config = {}) {
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();
  const { exploration: searchBreadth } = await getOptions(runConfig, {
    exploration: withPolicy(mapExploration),
  });
  const resultsAll = [];
  const resultsAllMap = {};
  const drilldownResults = [];
  let isDone = false;
  let textSelected = text;

  const { shouldSkip = shouldSkipNull, shouldStop = shouldStopNull } = runConfig;
  const temperature = await getOption('temperature', runConfig, 1);

  let attempts = 0;
  try {
    while (!isDone) {
      emitter.emit({
        event: DomainEvent.step,
        stepName: 'generating-round',
        attempt: attempts + 1,
        questionsFound: resultsAll.length,
      });

      if (resultsAll.length) {
        const choices = resultsAll.filter((item) => {
          return !drilldownResults.includes(item);
        });
        const pickInterestingQuestionPrompt = pickInterestingQuestion(textSelected, {
          existing: choices,
        });
        // eslint-disable-next-line no-await-in-loop
        const selectedResult = await retry(
          () =>
            callLlm(pickInterestingQuestionPrompt, {
              ...runConfig,
              response_format: jsonSchema('selected_question', selectedQuestionSchema),
            }),
          {
            label: 'questions-pick-interesting',
            config: runConfig,
            abortSignal: runConfig.abortSignal,
          }
        );
        textSelected = selectedResult.question;
        drilldownResults.push(textSelected);
      }

      const promptCreated = formatQuestionsPrompt(textSelected, {
        existing: resultsAll,
      });
      const llmConfig = {
        ...runConfig,
        temperature,
        response_format: jsonSchema('questions_list', questionsListSchema),
      };

      // eslint-disable-next-line no-await-in-loop
      const results = await retry(() => callLlm(promptCreated, llmConfig), {
        label: 'questions-generate',
        config: runConfig,
        abortSignal: runConfig.abortSignal,
      });
      const resultsNew = getRandomSubset(results, searchBreadth);
      if (searchBreadth < 0.5) {
        const randomIndex = Math.floor(Math.random() * resultsNew.length);
        textSelected = resultsNew[randomIndex];
      }
      const resultsNewUnique = resultsNew.filter((item) => !(item in resultsAllMap));

      attempts += 1;

      for (const result of resultsNewUnique) {
        // eslint-disable-next-line no-await-in-loop
        if (await shouldStop(result, resultsAll, resultsNew, attempts)) {
          isDone = true;
          break;
        }
        // eslint-disable-next-line no-await-in-loop
        if (!(await shouldSkip(result, resultsAll))) {
          resultsAllMap[result] = true;
          resultsAll.push(result);
          yield result;
        }
      }
    }

    emitter.complete({ outcome: Outcome.success, questions: resultsAll.length, attempts });
  } catch (err) {
    emitter.error(err);
    throw err;
  }
};

export default async (text, config = {}) => {
  const generator = generateQuestions(text, config);

  const results = [];
  for await (const result of generator) {
    if (!results.includes(result)) {
      results.push(result);
    }
  }

  const resultsSorted = results.toSorted((a, b) => a.localeCompare(b));

  return resultsSorted;
};
