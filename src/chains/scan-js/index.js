import fs from 'node:fs/promises';
import * as R from 'ramda';

import sort from '../sort/index.js';
import chatGPT from '../../lib/chatgpt/index.js';
import pathAliases from '../../lib/path-aliases/index.js';
import retry from '../../lib/retry/index.js';
import search from '../../lib/search-js-files/index.js';
import stripResponse from '../../lib/strip-response/index.js';
import codeFeaturesPrompt from '../../prompts/code-features.js';
import makeJSONSchema from '../../prompts/features-json-schema.js';
import modelService from '../../services/llm-model/index.js';
import toObject from '../../verblets/to-object/index.js';

const codeFeatureDefinitions = JSON.parse(
  await fs.readFile(
    new URL('../../lib/search-js-files/code-features-property-definitions.json', import.meta.url),
    'utf-8'
  )
);

const organizeResult = (result) => {
  return R.sort(
    (a, b) => a.localeCompare(b),
    Object.entries(result).map(([key, value]) => `${key}: ${value}`)
  );
};

const visit = async ({
  node,
  state: stateInitial,
  features: featuresInitial = 'maintainability',
}) => {
  if (!node.functionName) {
    // skipping
    return stateInitial;
  }

  const sortResults = await sort(
    {
      by: `best criteria for looking at "${featuresInitial}" within code`,
      chunkSize: 4,
      extremeK: 4,
    },
    codeFeatureDefinitions.map((d) => d.criteria),
    modelService.getBestAvailableModel()
  );
  const sortCriteria = sortResults.slice(0, 5);
  const features = codeFeatureDefinitions.filter((def) => {
    return sortCriteria.includes(def.criteria);
  });

  if (!features?.length) {
    throw new Error('Visit [error]: Features list not defined');
  }
  const schema = makeJSONSchema(features);

  const fileText = await fs.readFile(node.filename, 'utf-8');
  const functionText = fileText.slice(node.start, node.end);

  const state = { ...stateInitial };

  const visitPrompt = codeFeaturesPrompt({
    text: functionText,
    schema,
  });

  await retry(async () => {
    const results = await chatGPT(visitPrompt, {
      modelOptions: {
        modelName: 'fastGood',
      },
    });

    const resultParsed = await toObject(stripResponse(results), schema);

    const id = `${node.filename}:::${node.functionName}`;

    state[id] = resultParsed;
    state.nodesFound = (state.nodesFound ?? 0) + 1;
    state.abbreviations = state.abbreviations ?? {};
    state.abbreviations[id] = state.abbreviations[id] ?? state.nodesFound;

    const idDisplay = (state.pathAliases[id] ?? id).slice(-50).padStart(50);

    console.error(
      `${`${state.nodesFound}`.padEnd(3, ' ')} ${idDisplay}: ${organizeResult(resultParsed).join(
        ', '
      )}`
    );
  });

  return state;
};

// node: { filename: './src/index.js' },
export default async (moduleOptions) => {
  const state = await search({
    ...moduleOptions,
  });

  const preState = {
    visited: new Set(),
    pathAliases: pathAliases([...state.visited]),
  };

  return search({
    ...moduleOptions,
    state: preState,
    visit: (options) =>
      visit({
        ...options,
        features: moduleOptions.features,
      }),
  });
};
