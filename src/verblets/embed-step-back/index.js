import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import { stepBack as stepBackPrompt } from '../../prompts/embed-query-transforms.js';
import { embedStepBackSchema } from './schema.js';
import { nameStep, getOptions, withPolicy } from '../../lib/context/option.js';
import { resolveTexts } from '../../lib/instruction/index.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { Outcome } from '../../lib/progress/constants.js';

const name = 'embed-step-back';

// ===== Option Mappers =====

/**
 * Map abstraction option to prompt guidance for step-back distance.
 * low: close generalizations — one level up, nearby concepts.
 * high: foundational principles — jump to first principles, cross-domain theories.
 * Default: moderate step-back (current behavior, no extra guidance).
 * @param {string|undefined} value
 * @returns {string|undefined} Prompt guidance string or undefined
 */
export const mapAbstraction = (value) => {
  if (value === undefined) return undefined;
  if (typeof value === 'string') {
    return {
      low: 'Stay close to the original query. Generate questions that are only one level more general — broader phrasing of the same topic, not a jump to underlying theory. Keep the same domain and vocabulary.',
      med: undefined,
      high: 'Step back to foundational principles and theories. Generate questions about the underlying mechanisms, first principles, or cross-domain analogies that explain why the specific topic works the way it does. Prefer theoretical depth over topical proximity.',
    }[value];
  }
  return value;
};

/**
 * Generate broader, more fundamental questions from a specific query.
 *
 * Steps back from specifics to underlying concepts and principles,
 * useful for retrieving background context.
 *
 * @param {string} query
 * @param {object} [config] - { llm, logger, count, abstraction }
 * @param {number} [config.count=3] - Number of step-back questions
 * @param {string} [config.abstraction] - 'low' (close) or 'high' (foundational)
 * @returns {Promise<string[]>}
 */
export default async function embedStepBack(query, config = {}) {
  const { text: inputQuery, context } = resolveTexts(query, []);
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();
  try {
    const { abstraction: abstractionGuidance, count } = await getOptions(runConfig, {
      abstraction: withPolicy(mapAbstraction),
      count: 3,
    });

    const basePrompt = stepBackPrompt(inputQuery, count, { abstractionGuidance });
    const prompt = context ? `${basePrompt}\n\n${context}` : basePrompt;
    const result = await callLlm(prompt, {
      ...runConfig,
      responseFormat: jsonSchema('step_back', embedStepBackSchema),
    });
    emitter.complete({ outcome: Outcome.success });
    return result;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

embedStepBack.knownTexts = [];
