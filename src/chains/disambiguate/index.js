import callLlm from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import score from '../score/index.js';
import disambiguateMeaningsSchema from './disambiguate-meanings-result.json';
import { emitStepProgress, scopeProgress } from '../../lib/progress-callback/index.js';
import { scopeOperation } from '../../lib/context/option.js';

const disambiguateResponseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'disambiguate_meanings_result',
    schema: disambiguateMeaningsSchema,
  },
};

const meaningsPrompt = (term) => {
  return `List all distinct dictionary meanings or common uses of "${term}".
Return a JSON object with a "meanings" array containing the distinct meanings.`;
};

export const getMeanings = async (term, config = {}) => {
  config = scopeOperation('disambiguate:meanings', { llm: 'fastGoodCheap', ...config });
  const prompt = meaningsPrompt(term);
  const response = await retry(
    () =>
      callLlm(prompt, {
        ...config,
        response_format: disambiguateResponseFormat,
      }),
    {
      label: 'disambiguate-get-meanings',
      config,
    }
  );

  const resultArray = response?.meanings || response;
  return Array.isArray(resultArray) ? resultArray.filter(Boolean) : [];
};

export default async function disambiguate({ term, context, ...config } = {}) {
  config = scopeOperation('disambiguate', config);
  const { now } = config;

  emitStepProgress(config.onProgress, 'disambiguate', 'extracting-meanings', {
    term,
    now: new Date(),
    chainStartTime: now,
  });

  const meanings = await getMeanings(term, config);

  emitStepProgress(config.onProgress, 'disambiguate', 'scoring-meanings', {
    term,
    meaningCount: meanings.length,
    now: new Date(),
    chainStartTime: now,
  });

  const scores = await score(
    meanings,
    `how well this meaning of "${term}" matches the context: ${context}`,
    { ...config, onProgress: scopeProgress(config.onProgress, 'score:relevance') }
  );

  let bestIndex = 0;
  let bestScore = scores[0];

  for (let i = 1; i < scores.length; i++) {
    if (scores[i] > bestScore) {
      bestScore = scores[i];
      bestIndex = i;
    }
  }

  return { meaning: meanings[bestIndex], meanings };
}
