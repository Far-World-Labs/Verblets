import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import score from '../score/index.js';
import disambiguateMeaningsSchema from './disambiguate-meanings-result.json' with { type: 'json' };
import createProgressEmitter, { scopePhase } from '../../lib/progress/index.js';
import { DomainEvent } from '../../lib/progress/constants.js';
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
  config = nameStep('disambiguate:meanings', {
    llm: { fast: true, good: true, cheap: true },
    ...config,
  });
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
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();

  try {
    emitter.emit({ event: DomainEvent.step, stepName: 'extracting-meanings', term });

    const meanings = await getMeanings(term, runConfig);

    emitter.emit({
      event: DomainEvent.step,
      stepName: 'scoring-meanings',
      term,
      meaningCount: meanings.length,
    });

    const scores = await score(
      meanings,
      `how well this meaning of "${term}" matches the context: ${context}`,
      {
        ...runConfig,
        onProgress: scopePhase(runConfig.onProgress, 'score:relevance'),
      }
    );

    let bestIndex = 0;
    let bestScore = scores[0];

    for (let i = 1; i < scores.length; i++) {
      if (scores[i] > bestScore) {
        bestScore = scores[i];
        bestIndex = i;
      }
    }

    emitter.complete({ outcome: 'success' });

    return { meaning: meanings[bestIndex], meanings };
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}
