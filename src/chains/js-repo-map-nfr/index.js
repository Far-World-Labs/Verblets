import fs from 'node:fs/promises';
import * as R from 'ramda';

import chatGPT from '../../lib/chatgpt/index.js';
import retry from '../../lib/retry/index.js';
import search from '../js-repo-search-best-first/index.js';
import stripResponse from '../../lib/strip-response/index.js';
import toObject from '../../verblets/to-object/index.js';

import { asJSON, explainAndSeparate } from '../../prompts/constants.js';

const visitPrompt = (functionText) => {
  return `Analyze the following code to collect results for each of the provided features. Follow the per-feature description to know how to perform. If the code does not fit the criteria, respond with '.' in the value only.

<json-schema defines-output>
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "readability": {
      "type": "integer",
      "minimum": 0,
      "maximum": 10,
      "description": "How easy is it to understand the purpose and flow of the function? [0-10] where 0 is very difficult to understand and 10 is extremely clear"
    },
    "modularity": {
      "type": "integer",
      "minimum": 0,
      "maximum": 10,
      "description": "How well is the function separated into smaller, focused functions? [0-10] where 0 is a monolithic function and 10 is highly modular"
    },
    "namingConventions": {
      "type": "integer",
      "minimum": 0,
      "maximum": 10,
      "description": "How well do the names of variables, functions, and classes convey their purpose and intent? [0-10] where 0 is poor naming and 10 is excellent naming"
    },
    "errorHandling": {
      "type": "integer",
      "minimum": 0,
      "maximum": 10,
      "description": "How well does the function handle errors and edge cases? [0-10] where 0 is no error handling and 10 is robust error handling"
    },
    "performance": {
      "type": "integer",
      "minimum": 0,
      "maximum": 10,
      "description": "How efficient is the function in terms of time and space complexity? [0-10] where 0 is very inefficient and 10 is highly optimized"
    },
    "tags": {
      "type": "array",
      "items": {
        "type": "string",
        "pattern": "^[ -~]+$"
      },
      "description": "An array of 3-10 tag strings that describe purpose, intent, architectural features, or business rules"
    }
  },
  "required": ["readability", "modularity", "namingConventions", "errorHandling", "performance", "tags"]
}
</json-schema>

<code-to-analyze>
${functionText}
</code-to-analyze>

${asJSON}

${explainAndSeparate}
`;
};

const organizeResult = (result) => {
  return R.sort(
    (a, b) => a.localeCompare(b),
    Object.entries(result).map(([key, value]) => `${key}: ${value}`)
  );
};

const visit = async ({ node, state: stateInitial }) => {
  if (!node.functionName) {
    // skipping
    return stateInitial;
  }

  const fileText = await fs.readFile(node.filename, 'utf-8');
  const functionText = fileText.slice(node.start, node.end);

  const state = { ...stateInitial };
  await retry(async () => {
    const results = await chatGPT(visitPrompt(functionText), {
      modelName: 'gpt35Turbo',
    });

    const resultParsed = await toObject(stripResponse(results));

    state[`${node.filename}:::${node.functionName}`] = resultParsed;
    state.nodesFound = (state.nodesFound ?? 0) + 1;
    state.abbreviations = state.abbreviations ?? {};
    state.abbreviations[`${node.filename}:::${node.functionName}`] =
      state.abbreviations[`${node.filename}:::${node.functionName}`] ??
      state.nodesFound;

    console.error(
      `${`${state.nodesFound}`.padEnd(5, ' ')}: ${organizeResult(
        resultParsed
      ).join(', ')}`
    );
  });

  return state;
};

// node: { filename: './src/index.js' },
export default (args) => {
  return search({
    ...args,
    visit,
  });
};
