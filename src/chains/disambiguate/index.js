import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import retry from '../../lib/retry/index.js';
import score from '../score/index.js';
import disambiguateMeaningsSchema from './disambiguate-meanings-result.json' with { type: 'json' };
import createProgressEmitter, { scopePhase } from '../../lib/progress/index.js';
import { DomainEvent, Outcome } from '../../lib/progress/constants.js';
import { nameStep } from '../../lib/context/option.js';
import { resolveArgs, resolveTexts } from '../../lib/instruction/index.js';

const name = 'disambiguate';

const disambiguateResponseFormat = jsonSchema(
  'disambiguate_meanings_result',
  disambiguateMeaningsSchema
);

const meaningsPrompt = (term) => {
  return `List all distinct dictionary meanings or common uses of ${asXML(term, { tag: 'term' })}.
Return a JSON object with a "meanings" array containing the distinct meanings.`;
};

export const getMeanings = async (term, config = {}) => {
  const runConfig = nameStep('disambiguate:meanings', {
    llm: { fast: true, good: true, cheap: true },
    ...config,
  });
  const prompt = meaningsPrompt(term);
  const response = await retry(
    () =>
      callLlm(prompt, {
        ...runConfig,
        responseFormat: disambiguateResponseFormat,
      }),
    {
      label: 'disambiguate-get-meanings',
      config: runConfig,
    }
  );

  const resultArray = response?.meanings || response;
  return Array.isArray(resultArray) ? resultArray.filter(Boolean) : [];
};

export default async function disambiguate(term, instructions, config) {
  [instructions, config] = resolveArgs(instructions, config);
  const { text: contextText, context: xmlContext } = resolveTexts(instructions, []);
  const effectiveContext = xmlContext ? `${contextText}\n\n${xmlContext}` : contextText;
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();

  try {
    emitter.emit({ event: DomainEvent.step, stepName: 'extracting-meanings', term });

    const meanings = await getMeanings(term, {
      ...runConfig,
      onProgress: scopePhase(runConfig.onProgress, 'meanings'),
    });

    emitter.emit({
      event: DomainEvent.step,
      stepName: 'scoring-meanings',
      term,
      meanings,
      meaningCount: meanings.length,
    });

    const scores = await score(
      meanings,
      `how well this meaning of ${asXML(term, { tag: 'term' })} matches the context: ${asXML(effectiveContext, { tag: 'context' })}`,
      {
        ...runConfig,
        onProgress: scopePhase(runConfig.onProgress, 'score:relevance'),
      }
    );

    const valid = scores
      .map((score, index) => ({ score, index }))
      .filter(({ score }) => typeof score === 'number');

    if (valid.length === 0) {
      throw new Error(`disambiguate: no meanings could be scored for term "${term}"`);
    }

    const bestIndex = valid.reduce((best, x) => (x.score > best.score ? x : best)).index;

    emitter.complete({ outcome: Outcome.success });

    return { meaning: meanings[bestIndex], meanings };
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

disambiguate.knownTexts = [];
