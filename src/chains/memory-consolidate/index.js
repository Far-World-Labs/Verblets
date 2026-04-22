import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { nameStep, getOptions, withPolicy } from '../../lib/context/option.js';
import { resolveArgs, resolveTexts } from '../../lib/instruction/index.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { DomainEvent, Outcome } from '../../lib/progress/constants.js';
import { memoryConsolidateSchema } from './schemas.js';

const name = 'memory-consolidate';

const STRICTNESS_GUIDANCE = {
  low: 'Aggressively merge memories that share any thematic overlap. Prefer fewer, broader entries.',
  med: 'Merge memories that cover substantially the same topic or decision. Preserve distinct perspectives.',
  high: 'Only merge near-duplicates or memories that are strict subsets of each other. Preserve granularity.',
};

export const mapStrictness = (value) => {
  if (value === undefined) return 'med';
  if (typeof value === 'object') return value;
  return { low: 'low', med: 'med', high: 'high' }[value] ?? 'med';
};

const buildPrompt = (memories, instructionText, context, strictness) => {
  const parts = [
    context,
    `Review the following memories and consolidate overlapping or closely related entries.

For each group of related memories, merge them into a single entry that preserves all essential information.
Memories that are distinct should pass through unchanged (with mergedKeys containing only their own key).
For each consolidated entry, list the keys of all original memories that contributed to it in mergedKeys.
Generate a new key, summary, and merged content for consolidated entries.
Reassess importance and tags for the consolidated result.`,
    STRICTNESS_GUIDANCE[strictness],
    instructionText && asXML(instructionText, { tag: 'instructions' }),
    asXML(memories, { tag: 'memories' }),
  ];
  return parts.filter(Boolean).join('\n\n');
};

async function memoryConsolidate(memories, instructions, config) {
  [instructions, config] = resolveArgs(instructions, config);
  const { text, context } = resolveTexts(instructions, []);
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();
  emitter.emit({ event: DomainEvent.input, value: memories });

  const { strictness } = await getOptions(runConfig, {
    strictness: withPolicy(mapStrictness),
  });

  try {
    const prompt = buildPrompt(memories, text, context, strictness);
    const response = await retry(
      () =>
        callLlm(prompt, {
          ...runConfig,
          responseFormat: jsonSchema('memory_consolidate', memoryConsolidateSchema),
          temperature: 0,
        }),
      { label: 'memory-consolidate', config: runConfig }
    );

    const consolidated = response?.items || response;

    emitter.emit({ event: DomainEvent.output, value: consolidated });
    emitter.complete({
      outcome: Outcome.success,
      inputCount: memories.length,
      outputCount: consolidated.length,
    });
    return consolidated;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

memoryConsolidate.knownTexts = [];

export default memoryConsolidate;
