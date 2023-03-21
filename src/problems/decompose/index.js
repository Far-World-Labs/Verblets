import * as R from 'ramda';

import chatGPT from '../../lib/openai/completions.js';
import {
  generateQuestions as generateQuestionsPrompt,
} from '../../prompts/fragment-functions/index.js'
import {
  onlyJSON,
} from '../../prompts/fragment-texts/index.js'
import {
  toObject,
} from '../../response-parsers/index.js';

// Returns a random subset of a list with length between 1 and the length of the list
// based on an input value between 0 and 1
const getRandomSubset = (list, value) => {
  const numItems = Math.round(value * list.length) + 1;
  const listShuffled = R.sort(() => Math.random() - 0.5, list);
  return listShuffled.slice(0, numItems);
};

const pickInterestingQuestion = (originalQuestion, { existing=[] }) => {
  const existingJoined = existing
        .map(item => ` - ${item}`)
        .join('\n');

  return `Choose one interesting question from the following list of questions. The main goal is to determine "${originalQuestion}".

Choose only from the following:
\`\`\`
${existingJoined}
\`\`\`
`
};

const shouldSkipNull = (result, resultsAll) => {
  return resultsAll.includes(result);
};

const shouldStopNull = (result, resultsAll, resultsNew, attempts=0) => {
  return resultsAll.length > 50 || attempts > 5;
};

const generateQuestions = async function* (message, options={}) {
  const resultsAll = [];
  const resultsAllMap = {};
  const drilldownResults = [];
  let isDone = false;
  let messageSelected = message;

  const {
    searchBreadth=0.5,
    shouldSkip=shouldSkipNull,
    shouldStop=shouldStopNull,
  } = options;

  let attempts = 0;
  while (!isDone) {
    if (resultsAll.length) {
      const choices = resultsAll.filter((item) => {
        return !drilldownResults.includes(item);
      });
      const pickInterestingQuestionPrompt = pickInterestingQuestion(messageSelected, { existing: choices });
      messageSelected = await chatGPT(pickInterestingQuestionPrompt);
      drilldownResults.push(messageSelected);
    }
    const chatGPTConfig = {
      maxTokens: 3000,
      temperature: 1,
    };
    const promptGenerated = generateQuestionsPrompt(messageSelected, { existing: resultsAll });
    const results = await chatGPT(`${promptGenerated}`, chatGPTConfig);
    let resultsParsed
    try {
      resultsParsed = toObject(results);
    } catch (error) {
      if (/Unexpected string in JSON/.test(error.message)) {
        const resultsUpdated = await chatGPT(`Split the following to a JSON array.${onlyJSON} \`\`\`${results}\`\`\``, chatGPTConfig);
        resultsParsed = toObject(resultsUpdated);
      }
    }
    const resultsNew = getRandomSubset(resultsParsed, searchBreadth);
    if (searchBreadth < 0.5) {
      const randomIndex = Math.floor(Math.random() * resultsNew.length)
      messageSelected = resultsNew[randomIndex];
    }
    const resultsNewUnique = resultsNew.filter(item => !(item in resultsAllMap));

    attempts = attempts + 1;

    for (let result of resultsNewUnique) {
      if (await shouldSkip(result, resultsAll)) {
        continue;
      }

      if (await shouldStop(result, resultsAll, resultsNew, attempts)) {
        isDone = true;
        break;
      }
      resultsAllMap[result] = true;
      resultsAll.push(result);
      yield result;
    }
  }
};

export default async (message, options) => {
  const generator = generateQuestions(message, options);

  const results = [];
  for await (let result of generator) {
    results.push(result);
  }

  const resultsSorted = R.sort(R.comparator((a, b) => a.localeCompare(b)), results);

  return resultsSorted;
};
