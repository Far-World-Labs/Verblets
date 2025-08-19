import fs from 'node:fs/promises';

import sort from '../sort/index.js';
import chatGPT from '../../lib/chatgpt/index.js';
import pathAliases from '../../lib/path-aliases/index.js';
import retry from '../../lib/retry/index.js';
import search from '../../lib/search-js-files/index.js';
import codeFeaturesPrompt from '../../prompts/code-features.js';
import makeJSONSchema from '../../prompts/features-json-schema.js';
import modelService from '../../services/llm-model/index.js';

const codeFeatureDefinitions = JSON.parse(
  await fs.readFile(
    new URL('../../lib/search-js-files/code-features-property-definitions.json', import.meta.url),
    'utf-8'
  )
);

const visit = async ({
  node,
  state: stateInitial,
  features: featuresInitial = 'maintainability',
}) => {
  if (!node.functionName) {
    return stateInitial;
  }

  const sortResults = await sort(
    codeFeatureDefinitions.map((d) => d.criteria),
    `best criteria for looking at "${featuresInitial}" within code`,
    {
      chunkSize: 4,
      extremeK: 4,
      llm: modelService.getBestPublicModel(),
    }
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
    const resultParsed = await chatGPT(visitPrompt, {
      modelOptions: {
        modelName: 'fastGood',
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'code_features_analysis',
            schema,
          },
        },
      },
    });

    const id = `${node.filename}:::${node.functionName}`;

    state[id] = resultParsed;
    state.nodesFound = (state.nodesFound ?? 0) + 1;
    state.abbreviations = state.abbreviations ?? {};
    state.abbreviations[id] = state.abbreviations[id] ?? state.nodesFound;

    // Debug output removed - was cluttering test output
    // const idDisplay = (state.pathAliases[id] ?? id).slice(-50).padStart(50);
    // console.error(
    //   `${`${state.nodesFound}`.padEnd(3, ' ')} ${idDisplay}: ${organizeResult(resultParsed).join(
    //     ', '
    //   )}`
    // );
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
