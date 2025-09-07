import * as R from 'ramda';

import chatGPT from '../../lib/chatgpt/index.js';
import retry from '../../lib/retry/index.js';
import { constants as promptConstants, asXML } from '../../prompts/index.js';
import modelService from '../../services/llm-model/index.js';
import { questionsListSchema, selectedQuestionSchema } from './schemas.js';

const { contentIsChoices, asJSON, asWrappedArrayJSON } = promptConstants;

// Returns a random subset of a list with length between 1 and the length of the list
// based on an input value between 0 and 1
const getRandomSubset = (list, value) => {
  const numItems = Math.round(value * list.length) + 1;
  const listShuffled = R.sort(() => Math.random() - 0.5, list);
  return listShuffled.slice(0, numItems);
};

const pickInterestingQuestion = (originalQuestion, { existing = [] }) => {
  const existingJoined = existing.map((item) => ` - ${item}`).join('\n');

  return `Choose one interesting question from the following list of questions. The main goal is to determine "${originalQuestion}".

${contentIsChoices}
\`\`\`
${existingJoined}
\`\`\`

Return a JSON object with a "question" property containing the selected question.

${asJSON}`;
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

${asWrappedArrayJSON} One question per string.

${asJSON}`;
};

const generateQuestions = async function* generateQuestionsGenerator(text, options = {}) {
  const resultsAll = [];
  const resultsAllMap = {};
  const drilldownResults = [];
  let isDone = false;
  let textSelected = text;

  const {
    searchBreadth = 0.5,
    shouldSkip = shouldSkipNull,
    shouldStop = shouldStopNull,
    model = modelService.getBestPublicModel(),
    maxAttempts = 3,
  } = options;

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
      const selectedResult = await retry(chatGPT, {
        label: 'questions-pick-interesting',
        maxRetries: maxAttempts,
        chatGPTPrompt: pickInterestingQuestionPrompt,
        chatGPTConfig: {
          modelOptions: {
            response_format: {
              type: 'json_schema',
              json_schema: {
                name: 'selected_question',
                schema: selectedQuestionSchema,
              },
            },
          },
        },
      });
      textSelected = selectedResult.question;
      drilldownResults.push(textSelected);
    }

    const promptCreated = formatQuestionsPrompt(textSelected, {
      existing: resultsAll,
    });
    const budget = model.budgetTokens(promptCreated);
    const chatGPTConfig = {
      modelOptions: {
        maxTokens: budget.completion,
        temperature: 1,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'questions_list',
            schema: questionsListSchema,
          },
        },
      },
    };

    // eslint-disable-next-line no-await-in-loop
    const results = await retry(chatGPT, {
      label: 'questions-generate',
      maxRetries: maxAttempts,
      chatGPTPrompt: `${promptCreated}`,
      chatGPTConfig,
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

export default async (text, options) => {
  const generator = generateQuestions(text, options);

  const results = [];
  for await (const result of generator) {
    if (!results.includes(result)) {
      results.push(result);
    }
  }

  const resultsSorted = R.sort((a, b) => a.localeCompare(b), results);

  return resultsSorted;
};
