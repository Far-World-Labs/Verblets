import fs from 'node:fs/promises';

import sort from '../sort/index.js';
import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import pathAliases from '../../lib/path-aliases/index.js';
import retry from '../../lib/retry/index.js';
import search from '../../lib/search-js-files/index.js';
import codeFeaturesPrompt from '../../prompts/code-features.js';
import makeJSONSchema from '../../prompts/features-json-schema.js';
import createProgressEmitter, { scopePhase } from '../../lib/progress/index.js';
import { DomainEvent, Outcome } from '../../lib/progress/constants.js';
import { nameStep } from '../../lib/context/option.js';

const name = 'scan-js';

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
  config,
}) => {
  if (!node.functionName) {
    return stateInitial;
  }

  const sortResults = await sort(
    codeFeatureDefinitions.map((d) => d.criteria),
    `best criteria for looking at "${featuresInitial}" within code`,
    {
      ...config,
      batchSize: 4,
      extremeK: 4,
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
        ...config,
        responseFormat: jsonSchema('code_features_analysis', schema),
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
  const runConfig = nameStep(name, moduleOptions);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();

  try {
    emitter.emit({
      event: DomainEvent.phase,
      phase: 'discovery',
    });

    const state = await search({
      ...runConfig,
      onProgress: scopePhase(runConfig.onProgress, 'scan-js:discovery'),
    });

    const preState = {
      visited: new Set(),
      pathAliases: pathAliases([...state.visited]),
    };

    emitter.emit({
      event: DomainEvent.phase,
      phase: 'analysis',
    });

    const result = await search({
      ...runConfig,
      onProgress: scopePhase(runConfig.onProgress, 'scan-js:analysis'),
      state: preState,
      visit: (options) =>
        visit({
          ...options,
          features: runConfig.features,
          config: runConfig,
        }),
    });

    emitter.complete({ outcome: Outcome.success, nodesFound: result.nodesFound ?? 0 });

    return result;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
};
