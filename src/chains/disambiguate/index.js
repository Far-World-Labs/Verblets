import callLlm from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import score from '../score/index.js';
import { constants as promptConstants } from '../../prompts/index.js';
import disambiguateMeaningsSchema from './disambiguate-meanings-result.json';
import { emitStepProgress, scopeProgress } from '../../lib/progress-callback/index.js';

const { onlyJSONStringArray } = promptConstants;

const disambiguateResponseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'disambiguate_meanings_result',
    schema: disambiguateMeaningsSchema,
  },
};

const meaningsPrompt = (term) => {
  return `${onlyJSONStringArray}
List all distinct dictionary meanings or common uses of "${term}".
Return a JSON object with a "meanings" array containing the distinct meanings.
${onlyJSONStringArray}`;
};

export const getMeanings = async (term, config = {}) => {
  const { llm = 'fastGoodCheap', maxAttempts = 3, onProgress, ...options } = config;
  const prompt = meaningsPrompt(term);
  const response = await retry(
    () =>
      callLlm(prompt, {
        llm,
        modelOptions: { response_format: disambiguateResponseFormat },
        ...options,
      }),
    {
      label: 'disambiguate-get-meanings',
      maxAttempts,
      onProgress,
    }
  );

  const resultArray = response?.meanings || response;
  return Array.isArray(resultArray) ? resultArray.filter(Boolean) : [];
};

export default async function disambiguate({ term, context, maxAttempts = 3, ...config } = {}) {
  const { llm, onProgress, now = new Date(), ...options } = config;

  emitStepProgress(onProgress, 'disambiguate', 'extracting-meanings', {
    term,
    now: new Date(),
    chainStartTime: now,
  });

  const meanings = await getMeanings(term, {
    llm,
    maxAttempts,
    onProgress,
    now,
    ...options,
  });

  emitStepProgress(onProgress, 'disambiguate', 'scoring-meanings', {
    term,
    meaningCount: meanings.length,
    now: new Date(),
    chainStartTime: now,
  });

  const scores = await score(
    meanings,
    `how well this meaning of "${term}" matches the context: ${context}`,
    { llm, maxAttempts, onProgress: scopeProgress(onProgress, 'score:relevance'), now, ...options }
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
