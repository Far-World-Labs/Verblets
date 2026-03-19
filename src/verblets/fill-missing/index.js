import callLlm from '../../lib/llm/index.js';
import { constants as promptConstants, asXML } from '../../prompts/index.js';
import fillMissingSchema from './fill-missing-result.json';

const { tryCompleteData, contentIsMain } = promptConstants;

const responseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'fill_missing_result',
    schema: fillMissingSchema,
  },
};

// ===== Option Mappers =====

/**
 * Map creativity option to prompt guidance for fill confidence/risk tolerance.
 * low: conservative — prefer [UNKNOWN] over uncertain guesses. Safe for automated pipelines.
 * high: speculative — best educated guess for every gap. Useful for human review.
 * Default: balanced (current behavior, no extra guidance).
 * @param {string|undefined} value
 * @returns {string|undefined} Prompt guidance string or undefined
 */
export const mapCreativity = (value) => {
  if (value === undefined) return undefined;
  if (typeof value === 'string') {
    return {
      low: 'Be conservative. Only fill values you are highly confident about. Use "[UNKNOWN]" as the candidate for anything uncertain. Set confidence below 0.3 for any fill that is not strongly supported by surrounding context.',
      med: undefined,
      high: 'Be speculative. Make your best educated guess for every missing value using all available context clues. Prefer a plausible candidate over "[UNKNOWN]". Assign confidence scores that honestly reflect your certainty, but always attempt a fill.',
    }[value];
  }
  return undefined;
};

export const buildPrompt = (text, { creativityGuidance } = {}) =>
  `${tryCompleteData} ${contentIsMain} ${asXML(text, { tag: 'input' })}\n\n` +
  `Return JSON with "template" and "variables" where each variable has "original", ` +
  `"candidate", and "confidence".${creativityGuidance ? `\n\n${creativityGuidance}` : ''}`;

export default async function fillMissing(text, config = {}) {
  const { llm, creativity, ...options } = config;
  const creativityGuidance = mapCreativity(creativity);
  const prompt = buildPrompt(text, { creativityGuidance });
  const response = await callLlm(prompt, {
    llm,
    modelOptions: { response_format: responseFormat },
    ...options,
  });
  return response;
}
