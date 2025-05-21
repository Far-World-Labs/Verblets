/* eslint-disable no-await-in-loop */

import * as R from 'ramda';

import chatGPT from '../../lib/chatgpt/index.js';
import {
  constants as promptConstants,
  generateQuestions as generateQuestionsPrompt,
} from '../../prompts/index.js';
import modelService from '../../services/llm-model/index.js';
import toObject from '../../verblets/to-object/index.js';

const { asSplitIntoJSONArray, contentIsChoices, onlyJSON } = promptConstants;

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
`;
};

const shouldSkipNull = (result, resultsAll) => {
  return resultsAll.includes(result);
};

const shouldStopNull = (result, resultsAll, resultsNew, attempts = 0) => {
  return resultsAll.length > 50 || attempts > 5;
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
      textSelected = await chatGPT(pickInterestingQuestionPrompt);
      drilldownResults.push(textSelected);
    }

    const promptCreated = generateQuestionsPrompt(textSelected, {
      existing: resultsAll,
    });
    const budget = model.budgetTokens(promptCreated);
    const chatGPTConfig = {
      modelOptions: {
        maxTokens: budget.completion,
        temperature: 1,
      },
    };

    const results = await chatGPT(`${promptCreated}`, chatGPTConfig);
    let resultsParsed;
    try {
      resultsParsed = await toObject(results);
    } catch (error) {
      if (/Unexpected string in JSON/.test(error.message)) {
        const resultsUpdated = await chatGPT(
          `${asSplitIntoJSONArray}${onlyJSON} \`\`\`${results}\`\`\``,
          chatGPTConfig
        );
        resultsParsed = await toObject(resultsUpdated);
      }
    }
    const resultsNew = getRandomSubset(resultsParsed, searchBreadth);
    if (searchBreadth < 0.5) {
      const randomIndex = Math.floor(Math.random() * resultsNew.length);
      textSelected = resultsNew[randomIndex];
    }
    const resultsNewUnique = resultsNew.filter((item) => !(item in resultsAllMap));

    attempts += 1;

    for (const result of resultsNewUnique) {
      if (await shouldStop(result, resultsAll, resultsNew, attempts)) {
        isDone = true;
        break;
      }
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
