import fs from 'node:fs/promises';
import * as R from 'ramda';

import search from '../js-repo-search-best-first/index.js';
import chatGPT from '../../lib/chatgpt/index.js';
import retry from '../../lib/retry/index.js';
import stripResponse from '../../lib/strip-response/index.js';
import toObject from '../../verblets/to-object/index.js';

import { asJSON, explainAndSeparate } from '../../prompts/constants.js';

const schemas = {
  nfr: JSON.parse(
    await fs.readFile(
      './src/json-schemas/js-repo-function-nfr-features.json',
      'utf-8'
    )
  ),
  prompt: JSON.parse(
    await fs.readFile(
      './src/json-schemas/js-repo-function-prompt-engineering-features.json',
      'utf-8'
    )
  ),
};

const visitPrompt = (functionText, schema = schemas.nfr) => {
  return `Analyze the following code to provide scores for each of the features described below.

For each feature, assign a score between 0 and 10 based on the criteria outlined in the description. If the code does not exhibit the feature, provide a score of 0.

Ensure that all scores are assigned as integer values, even if the feature is not applicable or not present in the code.

Inlude only the properties defined in the schema, no comment, description, summary, evaluation or any similar properties.

<json-schema defines-output output-shape>
${JSON.stringify(schema, null, 2)}
</json-schema>

<code-to-analyze do-not-output>
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

const visit = async ({ node, state: stateInitial, schemaName = 'nfr' }) => {
  if (!node.functionName) {
    // skipping
    return stateInitial;
  }

  const schema = schemas[schemaName];

  const fileText = await fs.readFile(node.filename, 'utf-8');
  const functionText = fileText.slice(node.start, node.end);

  const state = { ...stateInitial };
  await retry(async () => {
    const results = await chatGPT(visitPrompt(functionText, schema), {
      modelName: 'gpt35Turbo',
    });

    const resultParsed = await toObject(stripResponse(results), schema);

    state[`${node.filename}:::${node.functionName}`] = resultParsed;
    state.nodesFound = (state.nodesFound ?? 0) + 1;
    state.abbreviations = state.abbreviations ?? {};
    state.abbreviations[`${node.filename}:::${node.functionName}`] =
      state.abbreviations[`${node.filename}:::${node.functionName}`] ??
      state.nodesFound;

    const idDisplay = `${node.filename}:::${node.functionName}`
      .slice(-40)
      .padStart(40);

    console.error(
      `${`${state.nodesFound}`.padEnd(3, ' ')} ${idDisplay}: ${organizeResult(
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
