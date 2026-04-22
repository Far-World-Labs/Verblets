import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { nameStep, getOptions, withPolicy } from '../../lib/context/option.js';
import { resolveTexts } from '../../lib/instruction/index.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { DomainEvent, Outcome } from '../../lib/progress/constants.js';
import { memoryForgetSchema } from './schemas.js';

const name = 'memory-forget';

const THOROUGHNESS_GUIDANCE = {
  low: 'Only forget memories that exactly match the criteria. Preserve anything ambiguous.',
  med: 'Forget memories that clearly match the criteria. Preserve memories with partial relevance.',
  high: 'Forget memories that match the criteria and any closely derived or dependent memories.',
};

export const mapThoroughness = (value) => {
  if (value === undefined) return 'med';
  if (typeof value === 'object') return value;
  return { low: 'low', med: 'med', high: 'high' }[value] ?? 'med';
};

const buildPrompt = (memories, criteriaText, context, thoroughness) => {
  const parts = [
    context,
    `Given the following criteria, identify which memories should be forgotten (removed).

For each memory that matches the forget criteria, provide:
- key: the memory's key identifier
- reason: why this memory should be forgotten

List all retained memory keys in the retained array.
Every input memory key must appear in exactly one of forgotten or retained.`,
    THOROUGHNESS_GUIDANCE[thoroughness],
    asXML(criteriaText, { tag: 'criteria' }),
    asXML(memories, { tag: 'memories' }),
  ];
  return parts.filter(Boolean).join('\n\n');
};

async function memoryForget(memories, criteria, config = {}) {
  const { text: criteriaText, context } = resolveTexts(criteria, []);
  const effectiveCriteria = context ? `${criteriaText}\n\n${context}` : criteriaText;
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();
  emitter.emit({
    event: DomainEvent.input,
    value: { criteria: effectiveCriteria, memoryCount: memories.length },
  });

  const { thoroughness } = await getOptions(runConfig, {
    thoroughness: withPolicy(mapThoroughness),
  });

  try {
    const prompt = buildPrompt(memories, criteriaText, context, thoroughness);
    const response = await retry(
      () =>
        callLlm(prompt, {
          ...runConfig,
          responseFormat: jsonSchema('memory_forget', memoryForgetSchema),
          temperature: 0,
        }),
      { label: 'memory-forget', config: runConfig }
    );

    emitter.emit({ event: DomainEvent.output, value: response });
    emitter.complete({
      outcome: Outcome.success,
      forgottenCount: response.forgotten.length,
      retainedCount: response.retained.length,
    });
    return response;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

memoryForget.knownTexts = [];

export default memoryForget;
