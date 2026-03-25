import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import score from '../score/index.js';
import disambiguateMeaningsSchema from './disambiguate-meanings-result.json';
import { emitStepProgress, scopeProgress, track } from '../../lib/progress-callback/index.js';
import { nameStep } from '../../lib/context/option.js';

const name = 'disambiguate';

const disambiguateResponseFormat = jsonSchema(
  'disambiguate_meanings_result',
  disambiguateMeaningsSchema
);

const meaningsPrompt = (term) => {
  return `List all distinct dictionary meanings or common uses of "${term}".
Return a JSON object with a "meanings" array containing the distinct meanings.`;
};

export const getMeanings = async (term, config = {}) => {
  config = nameStep('disambiguate:meanings', { llm: 'fastGoodCheap', ...config });
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
  const runConfig = nameStep(name, config);
  const span = track(name, runConfig);

  emitStepProgress(runConfig.onProgress, name, 'extracting-meanings', {
    term,
    now: runConfig.now,
    chainStartTime: runConfig.now,
  });

  const meanings = await getMeanings(term, runConfig);

  emitStepProgress(runConfig.onProgress, name, 'scoring-meanings', {
    term,
    meaningCount: meanings.length,
    now: runConfig.now,
    chainStartTime: runConfig.now,
  });

  const scores = await score(
    meanings,
    `how well this meaning of "${term}" matches the context: ${context}`,
    { ...runConfig, onProgress: scopeProgress(runConfig.onProgress, 'score:relevance') }
  );

  let bestIndex = 0;
  let bestScore = scores[0];

  for (let i = 1; i < scores.length; i++) {
    if (scores[i] > bestScore) {
      bestScore = scores[i];
      bestIndex = i;
    }
  }

  span.result();

  return { meaning: meanings[bestIndex], meanings };
}
