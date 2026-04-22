import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { nameStep, getOptions, withPolicy } from '../../lib/context/option.js';
import { resolveArgs, resolveTexts } from '../../lib/instruction/index.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { DomainEvent, Outcome } from '../../lib/progress/constants.js';
import { memorySaveSchema } from './schemas.js';

const name = 'memory-save';

const DEPTH_GUIDANCE = {
  minimal: 'Extract only the single most essential fact. Limit to 2 tags.',
  standard: 'Capture key information and actionable details.',
  thorough: 'Identify implicit information, connections, and subtle context. Use up to 5 tags.',
};

export const mapDepth = (value) => {
  if (value === undefined) return 'standard';
  if (typeof value === 'object') return value;
  return { low: 'minimal', med: 'standard', high: 'thorough' }[value] ?? 'standard';
};

const buildPrompt = (content, instructionText, context, depth) => {
  const parts = [
    context,
    `Analyze the following content and structure it as a memory entry for later retrieval.

Generate:
- key: a short, descriptive, kebab-case identifier
- summary: a concise summary capturing the essential information
- tags: categorization tags for retrieval
- importance: a score from 0 to 1 (1 = critical, 0 = trivial)`,
    DEPTH_GUIDANCE[depth],
    instructionText && asXML(instructionText, { tag: 'instructions' }),
    asXML(content, { tag: 'content' }),
  ];
  return parts.filter(Boolean).join('\n\n');
};

async function memorySave(content, instructions, config) {
  [instructions, config] = resolveArgs(instructions, config);
  const { text, context } = resolveTexts(instructions, []);
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();
  emitter.emit({ event: DomainEvent.input, value: content });

  const { depth } = await getOptions(runConfig, {
    depth: withPolicy(mapDepth),
  });

  try {
    const prompt = buildPrompt(content, text, context, depth);
    const response = await retry(
      () =>
        callLlm(prompt, {
          ...runConfig,
          responseFormat: jsonSchema('memory_save', memorySaveSchema),
          temperature: 0,
        }),
      { label: 'memory-save', config: runConfig }
    );

    const memory = {
      ...response,
      content,
      timestamp: new Date().toISOString(),
    };

    emitter.emit({ event: DomainEvent.output, value: memory });
    emitter.complete({ outcome: Outcome.success });
    return memory;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

memorySave.knownTexts = [];

export default memorySave;
