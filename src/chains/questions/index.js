import callLlm from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import { constants as promptConstants, asXML } from '../../prompts/index.js';
import { questionsListSchema, selectedQuestionSchema } from './schemas.js';
import { getOption, getOptions, withPolicy, scopeOperation } from '../../lib/context/option.js';

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

Question: ${text}

${existing.length > 0 ? `Questions to omit: ${asXML(existingJoined, { tag: 'omitted' })}` : ''}

One question per string.`;
};

const generateQuestions = async function* generateQuestionsGenerator(text, config = {}) {
  config = scopeOperation('questions', config);
  const resultsAll = [];
  const resultsAllMap = {};
  const drilldownResults = [];
  let isDone = false;
  let textSelected = text;

  const { shouldSkip = shouldSkipNull, shouldStop = shouldStopNull } = config;
  const {
    exploration: searchBreadth,
    maxAttempts,
    retryDelay,
    retryOnAll,
  } = await getOptions(config, {
    exploration: withPolicy(mapExploration),
    maxAttempts: 3,
    retryDelay: 1000,
    retryOnAll: false,
  });

  let attempts = 0;
  while (!isDone) {
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
            ...config,
            response_format: {
              type: 'json_schema',
              json_schema: {
                name: 'selected_question',
                schema: selectedQuestionSchema,
              },
            },
          }),
        {
          label: 'questions-pick-interesting',
          maxAttempts,
          retryDelay,
          retryOnAll,
          onProgress: config.onProgress,
          abortSignal: config.abortSignal,
        }
      );
      textSelected = selectedResult.question;
      drilldownResults.push(textSelected);
    }

    const promptCreated = formatQuestionsPrompt(textSelected, {
      existing: resultsAll,
    });
    const temperature = await getOption('temperature', config, 1);
    const llmConfig = {
      ...config,
      temperature,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'questions_list',
          schema: questionsListSchema,
        },
      },
    };

    // eslint-disable-next-line no-await-in-loop
    const results = await retry(() => callLlm(promptCreated, llmConfig), {
      label: 'questions-generate',
      maxAttempts,
      retryDelay,
      retryOnAll,
      onProgress: config.onProgress,
      abortSignal: config.abortSignal,
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
};

export default async (text, config) => {
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
