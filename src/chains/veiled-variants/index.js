import callLlm from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import { asXML } from '../../prompts/index.js';
import { getOptions, withPolicy, scopeOperation } from '../../lib/context/option.js';

const responseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'veiled_variants',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      required: ['items'],
    },
  },
};

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

const veiledVariants = async (inputConfig = {}) => {
  const { prompt } = inputConfig;
  const config = scopeOperation('veiled-variants', { llm: { sensitive: true }, ...inputConfig });
  const { maxAttempts, retryDelay, retryOnAll, strategies, variantCount } = await getOptions(
    config,
    {
      maxAttempts: 3,
      retryDelay: 1000,
      retryOnAll: false,
      coverage: withPolicy(mapCoverage, ['strategies', 'variantCount']),
    }
  );
  const prompts = strategies.map((name) => STRATEGY_FNS[name](prompt, variantCount));

  const results = await Promise.all(
    prompts.map((p) =>
      retry(() => callLlm(p, { ...config, response_format: responseFormat }), {
        label: 'veiled-variants',
        maxAttempts,
        retryDelay,
        retryOnAll,
        onProgress: config.onProgress,
        abortSignal: config.abortSignal,
      })
    )
  );

  return results.flat();
};

export default veiledVariants;
