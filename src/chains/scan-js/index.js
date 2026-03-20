import fs from 'node:fs/promises';

import sort from '../sort/index.js';
import callLlm from '../../lib/llm/index.js';
import pathAliases from '../../lib/path-aliases/index.js';
import retry from '../../lib/retry/index.js';
import search from '../../lib/search-js-files/index.js';
import codeFeaturesPrompt from '../../prompts/code-features.js';
import makeJSONSchema from '../../prompts/features-json-schema.js';
import { getOption, scopeOperation } from '../../lib/context/option.js';

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
  llm,
  config,
}) => {
  if (!node.functionName) {
    return stateInitial;
  }

  const sortResults = await sort(
    codeFeatureDefinitions.map((d) => d.criteria),
    `best criteria for looking at "${featuresInitial}" within code`,
    {
      batchSize: 4,
      extremeK: 4,
      llm,
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

  await retry(
    async () => {
      const resultParsed = await callLlm(visitPrompt, {
        llm,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'code_features_analysis',
            schema,
          },
        },
      });

      const id = `${node.filename}:::${node.functionName}`;

      state[id] = resultParsed;
      state.nodesFound = (state.nodesFound ?? 0) + 1;
      state.abbreviations = state.abbreviations ?? {};
      state.abbreviations[id] = state.abbreviations[id] ?? state.nodesFound;
    },
    { label: 'scan-js', config }
  );

  return state;
};

// node: { filename: './src/index.js' },
export default async (moduleOptions) => {
  const config = scopeOperation('scan-js', moduleOptions);
  const llm = await getOption('llm', config, undefined);
  const state = await search({
    ...config,
  });

  const preState = {
    visited: new Set(),
    pathAliases: pathAliases([...state.visited]),
  };

  return search({
    ...config,
    state: preState,
    visit: (options) =>
      visit({
        ...options,
        features: config.features,
        llm,
        config,
      }),
  });
};
