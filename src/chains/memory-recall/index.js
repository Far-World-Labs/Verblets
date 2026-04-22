import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { nameStep, getOptions, withPolicy } from '../../lib/context/option.js';
import { resolveTexts } from '../../lib/instruction/index.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { DomainEvent, Outcome } from '../../lib/progress/constants.js';
import { memoryRecallSchema } from './schemas.js';

const name = 'memory-recall';

const PRECISION_GUIDANCE = {
  low: 'Cast a wide net. Include tangentially related memories. Use a low relevance threshold.',
  med: 'Return memories with clear relevance to the query. Moderate threshold.',
  high: 'Only return memories with strong, direct relevance. High threshold.',
};

export const mapPrecision = (value) => {
  if (value === undefined) return 'med';
  if (typeof value === 'object') return value;
  return { low: 'low', med: 'med', high: 'high' }[value] ?? 'med';
};

const buildPrompt = (memories, queryText, context, precision) => {
  const parts = [
    context,
    `Given the following query, evaluate each memory for relevance.

For each relevant memory, return:
- key: the memory's key identifier
- relevance: a score from 0 to 1 (1 = directly answers the query, 0 = irrelevant)
- reasoning: a brief explanation of why this memory is relevant

Return results sorted by relevance (highest first). Omit memories with negligible relevance.`,
    PRECISION_GUIDANCE[precision],
    asXML(queryText, { tag: 'query' }),
    asXML(memories, { tag: 'memories' }),
  ];
  return parts.filter(Boolean).join('\n\n');
};

async function memoryRecall(memories, query, config = {}) {
  const { text: queryText, context } = resolveTexts(query, []);
  const effectiveQuery = context ? `${queryText}\n\n${context}` : queryText;
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();
  emitter.emit({
    event: DomainEvent.input,
    value: { query: effectiveQuery, memoryCount: memories.length },
  });

  const { precision } = await getOptions(runConfig, {
    precision: withPolicy(mapPrecision),
  });

  try {
    const prompt = buildPrompt(memories, queryText, context, precision);
    const response = await retry(
      () =>
        callLlm(prompt, {
          ...runConfig,
          responseFormat: jsonSchema('memory_recall', memoryRecallSchema),
          temperature: 0,
        }),
      { label: 'memory-recall', config: runConfig }
    );

    const results = response?.items || response;

    emitter.emit({ event: DomainEvent.output, value: results });
    emitter.complete({ outcome: Outcome.success, matchCount: results.length });
    return results;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

memoryRecall.knownTexts = [];

export default memoryRecall;
