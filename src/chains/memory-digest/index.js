import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { nameStep, getOptions, withPolicy } from '../../lib/context/option.js';
import { resolveArgs, resolveTexts } from '../../lib/instruction/index.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { DomainEvent, Outcome } from '../../lib/progress/constants.js';
import { memoryDigestSchema } from './schemas.js';

const name = 'memory-digest';

const DETAIL_GUIDANCE = {
  low: 'Produce a brief, high-level digest. One paragraph maximum.',
  med: 'Produce a balanced digest capturing key points and relationships.',
  high: 'Produce a detailed digest preserving nuance, relationships, and secondary themes.',
};

export const mapSummaryDetail = (value) => {
  if (value === undefined) return 'med';
  if (typeof value === 'object') return value;
  return { low: 'low', med: 'med', high: 'high' }[value] ?? 'med';
};

const buildPrompt = (memories, instructionText, context, detail) => {
  const parts = [
    context,
    `Synthesize the following memories into a coherent digest.

Identify overarching themes and produce a unified narrative that captures the essential information across all entries.
Rate coverage from 0 to 1 indicating what fraction of the input memories are meaningfully represented in the digest.`,
    DETAIL_GUIDANCE[detail],
    instructionText && asXML(instructionText, { tag: 'instructions' }),
    asXML(memories, { tag: 'memories' }),
  ];
  return parts.filter(Boolean).join('\n\n');
};

async function memoryDigest(memories, instructions, config) {
  [instructions, config] = resolveArgs(instructions, config);
  const { text, context } = resolveTexts(instructions, []);
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();
  emitter.emit({ event: DomainEvent.input, value: memories });

  const { summaryDetail } = await getOptions(runConfig, {
    summaryDetail: withPolicy(mapSummaryDetail),
  });

  try {
    const prompt = buildPrompt(memories, text, context, summaryDetail);
    const response = await retry(
      () =>
        callLlm(prompt, {
          ...runConfig,
          responseFormat: jsonSchema('memory_digest', memoryDigestSchema),
          temperature: 0,
        }),
      { label: 'memory-digest', config: runConfig }
    );

    emitter.emit({ event: DomainEvent.output, value: response });
    emitter.complete({ outcome: Outcome.success });
    return response;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

memoryDigest.knownTexts = [];

export default memoryDigest;
