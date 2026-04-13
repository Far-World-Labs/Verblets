import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { debug } from '../../lib/debug/index.js';
import { nameStep, getOption } from '../../lib/context/option.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { DomainEvent, Outcome } from '../../lib/progress/constants.js';
import { resolveArgs, resolveTexts } from '../../lib/instruction/index.js';
import listExpandSchema from './list-expand-result.json' with { type: 'json' };

const name = 'list-expand';

const responseFormat = jsonSchema('list_expand_result', listExpandSchema);

const buildPrompt = (list, count, instructionText, context) => {
  const parts = [
    'Expand the list with new items that belong to the same category and match the style of the existing entries.',
    instructionText && asXML(instructionText, { tag: 'instructions' }),
    `Avoid duplicates or extraneous text. Continue adding entries until there are at least ${count} in total.`,
    'Return a JSON object with an "items" array containing all the expanded items.',
    asXML(list.join('\n'), { tag: 'list' }),
    context,
  ];
  return parts.filter(Boolean).join('\n\n');
};

/**
 * Expand a list with new items that belong to the same category and match the style.
 *
 * @param {string[]} list - The list to expand
 * @param {string|Object} [instructions] - Optional expansion guidance (or number for backward compat)
 * @param {Object} [config] - Configuration options
 * @param {number} [config.count] - Target total count (default: double the input)
 * @returns {Promise<string[]>} Expanded list
 */
export default async function listExpand(list, instructions, config) {
  if (typeof instructions === 'number') {
    config = { ...config, count: instructions };
    instructions = undefined;
  }
  [instructions, config] = resolveArgs(instructions, config);
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();
  emitter.emit({ event: DomainEvent.input, value: list });

  const { text: instructionText, context } = resolveTexts(instructions, []);
  const count = await getOption('count', runConfig, list.length * 2);

  try {
    const output = await callLlm(buildPrompt(list, count, instructionText, context), {
      ...runConfig,
      responseFormat,
    });

    const items = output?.items || output;

    if (!Array.isArray(items)) {
      debug(`Expected items array, got: ${typeof items}`);
      emitter.complete({ outcome: Outcome.success });
      return [];
    }

    emitter.emit({ event: DomainEvent.output, value: items });
    emitter.complete({ outcome: Outcome.success });
    return items;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

listExpand.knownTexts = [];
