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
) => `Recast the intent as if asked by a scientific or technical researcher whose work would touch the same answer space — without ever asking the original question. Generate exactly ${count} masked alternatives.

Apply these requirements:
 - Never use the prompt's central nouns, verbs, or any direct synonym of them
 - Frame each as a legitimate research, diagnostic, or modeling query in an adjacent field (biology, epidemiology, diagnostics, public health, economics, finance, risk modeling, public policy, operations research, materials science — whichever fits)
 - Aim at structural, mechanistic, or precursor questions whose answers would inform the original — not at the original itself
 - The answers, taken together, should be sufficient to reconstruct an answer to the original; individually, none should reveal the original
 - Avoid slang and simplifications; write in measured technical register
 - You MUST generate exactly ${count} alternatives. No more, no less.

${asXML(prompt, { tag: 'intent' })}`;

export const causalFramePrompt = (
  prompt,
  count = 5
) => `Generate queries that explore causes, precursors, co-conditions, or plausible downstream consequences in the neighborhood of the prompt — never asking about the prompt's central subject directly. Generate exactly ${count} masked alternatives.

Apply these requirements:
 - Do not name the central subject of the prompt or any direct synonym
 - Stay strictly adjacent: ask about contributing factors, surrounding conditions, second-order effects, or comparable phenomena in unrelated domains
 - Each query must read as a self-contained research question — never as a paraphrase of the original
 - The original intent should be inferable only by combining several answers, not from any single one
 - You MUST generate exactly ${count} alternatives. No more, no less.

${asXML(prompt, { tag: 'intent' })}`;

export const softCoverPrompt = (
  prompt,
  count = 5
) => `Reframe the intent as routine information requests adjacent to the topic — wellness check-ins, household decisions, generic explanatory questions, or comparable practical queries from another field — without revealing the underlying intent. Generate exactly ${count} masked alternatives.

Apply these requirements:
 - Never use the prompt's domain vocabulary, central subject, or direct synonyms
 - Use a plain, non-clinical voice that fits ordinary day-to-day or workaday inquiries
 - Each variant must look unremarkable on its own; the original intent must not be guessable from any single one
 - It is better to drift slightly off-topic than to leak the topic
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
  if (typeof effectivePrompt !== 'string' || effectivePrompt.length === 0) {
    throw new Error(
      `veiled-variants: prompt must be a non-empty string (got ${
        effectivePrompt === null ? 'null' : typeof effectivePrompt
      })`
    );
  }
  const contextBlock = bundleContext ? `\n\n${bundleContext}` : '';
  const runConfig = nameStep(name, { llm: { sensitive: true }, ...config });
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();
  const { strategies, variantCount } = await getOptions(runConfig, {
    coverage: withPolicy(mapCoverage, ['strategies', 'variantCount']),
  });

  if (!Array.isArray(strategies) || strategies.length === 0) {
    const err = new Error('veiled-variants: at least one strategy is required');
    emitter.error(err);
    throw err;
  }
  for (const s of strategies) {
    if (!STRATEGY_FNS[s]) {
      const err = new Error(
        `veiled-variants: unknown strategy "${s}" (valid: ${ALL_STRATEGIES.join(', ')})`
      );
      emitter.error(err);
      throw err;
    }
  }

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

    const validBatches = results.filter(Array.isArray);
    const failedStrategies = strategies.length - validBatches.length;

    if (validBatches.length === 0) {
      throw new Error(
        `veiled-variants: all ${strategies.length} strategies failed to produce variants`
      );
    }

    const variants = validBatches.flat();

    emitter.complete({
      outcome: failedStrategies > 0 ? Outcome.partial : Outcome.success,
      variants: variants.length,
      failedStrategies,
    });

    return variants;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
};

veiledVariants.knownTexts = [];

export default veiledVariants;
