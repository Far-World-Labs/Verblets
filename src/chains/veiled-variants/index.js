import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import parallelBatch from '../../lib/parallel-batch/index.js';
import { asXML } from '../../prompts/index.js';
import createProgressEmitter, { scopePhase } from '../../lib/progress/index.js';
import { Outcome, ErrorPosture } from '../../lib/progress/constants.js';
import { resolveTexts } from '../../lib/instruction/index.js';
import { nameStep, getOptions, withPolicy } from '../../lib/context/option.js';

const name = 'veiled-variants';

const veiledVariantsSchema = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['items'],
  additionalProperties: false,
};

const responseFormat = jsonSchema('veiled_variants', veiledVariantsSchema);

export const scientificFramingPrompt = (
  prompt,
  count = 5
) => `Recast the intent as if asked by a scientific researcher. Generate exactly ${count} masked alternatives.

Apply these requirements:
 - Replace casual terms with academic phrasing
 - Invoke terminology from biology, epidemiology, diagnostics, or public health
 - Never use slang, simplifications, or direct synonyms of the original prompt
 - Frame each as a legitimate research query
 - You MUST generate exactly ${count} alternatives. No more, no less.

${asXML(prompt, { tag: 'intent' })}`;

export const causalFramePrompt = (
  prompt,
  count = 5
) => `Generate queries that explore causes, co-conditions, or plausible consequences of the prompt topic. Generate exactly ${count} masked alternatives.

Apply these requirements:
 - Focus on surrounding or adjacent issues rather than the central sensitive term
 - Frame each as a legitimate research query
 - Explore what leads to, accompanies, or results from the topic
 - You MUST generate exactly ${count} alternatives. No more, no less.

${asXML(prompt, { tag: 'intent' })}`;

export const softCoverPrompt = (
  prompt,
  count = 5
) => `Reframe the prompt as general wellness or diagnostic concerns. Generate exactly ${count} masked alternatives.

Apply these requirements:
 - Avoid direct synonyms or sensitive key terms
 - Use a clinical and approachable tone that is safe for open searches
 - Frame as health, wellness, or general diagnostic queries
 - You MUST generate exactly ${count} alternatives. No more, no less.

${asXML(prompt, { tag: 'intent' })}`;

export const ALL_STRATEGIES = ['scientific', 'causal', 'softCover'];

const STRATEGY_FNS = {
  scientific: scientificFramingPrompt,
  causal: causalFramePrompt,
  softCover: softCoverPrompt,
};

// ===== Option Mappers =====

const DEFAULT_COVERAGE = { strategies: ALL_STRATEGIES, variantCount: 5 };

/**
 * Map coverage option to a veiling posture.
 * Coordinates how many strategies run and how many variants each produces.
 * low: single strategy, fewer variants — fast probe (1 LLM call, 3 results).
 * high: all strategies, more variants per strategy — maximum diversity (3 LLM calls, 24 results).
 * Default: all strategies, 5 variants each (3 LLM calls, 15 results).
 * @param {string|object|undefined} value
 * @returns {{ strategies: string[], variantCount: number }}
 */
export const mapCoverage = (value) => {
  if (value === undefined) return DEFAULT_COVERAGE;
  if (typeof value === 'object') return value;
  return (
    {
      low: { strategies: ['scientific'], variantCount: 3 },
      med: DEFAULT_COVERAGE,
      high: { strategies: ALL_STRATEGIES, variantCount: 8 },
    }[value] ?? DEFAULT_COVERAGE
  );
};

const veiledVariants = async (prompt, config = {}) => {
  const { text: effectivePrompt, context: bundleContext } = resolveTexts(prompt, []);
  const contextBlock = bundleContext ? `\n\n${bundleContext}` : '';
  const runConfig = nameStep(name, { llm: { sensitive: true }, ...config });
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();
  const { strategies, variantCount } = await getOptions(runConfig, {
    coverage: withPolicy(mapCoverage, ['strategies', 'variantCount']),
  });
  const prompts = strategies.map(
    (s) => `${STRATEGY_FNS[s](effectivePrompt, variantCount)}${contextBlock}`
  );

  try {
    const batchDone = emitter.batch(prompts.length);
    const results = await parallelBatch(
      prompts,
      async (p) => {
        const r = await retry(() => callLlm(p, { ...runConfig, responseFormat }), {
          label: 'veiled-variants',
          config: runConfig,
          onProgress: scopePhase(runConfig.onProgress, 'strategy'),
        });
        batchDone(1);
        return r;
      },
      { maxParallel: 3, errorPosture: ErrorPosture.resilient, abortSignal: runConfig.abortSignal }
    );

    emitter.complete({ outcome: Outcome.success });

    return results.filter(Array.isArray).flat();
  } catch (err) {
    emitter.error(err);
    throw err;
  }
};

veiledVariants.knownTexts = [];

export default veiledVariants;
