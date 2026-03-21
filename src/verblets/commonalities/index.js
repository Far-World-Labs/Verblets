import callLlm from '../../lib/llm/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { constants as promptConstants } from '../../prompts/index.js';
import commonalitiesSchema from './commonalities-result.json';

const { contentIsQuestion, tryCompleteData } = promptConstants;

const responseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'commonalities_result',
    schema: commonalitiesSchema,
  },
};

// ===== Option Mappers =====

/**
 * Map depth option to prompt guidance for commonality analysis depth.
 * low: surface-level — literal, observable shared features.
 * high: deep/abstract — structural patterns, functional relationships, philosophical connections.
 * Default: balanced mix (current behavior, no extra guidance).
 * @param {string|undefined} value
 * @returns {string|undefined} Prompt guidance string or undefined
 */
export const mapDepth = (value) => {
  if (value === undefined) return undefined;
  if (typeof value === 'string') {
    return {
      low: 'Focus on literal, directly observable shared features. Report concrete, surface-level commonalities such as shared physical properties, obvious category membership, or explicit shared attributes. Do not infer abstract or metaphorical connections.',
      med: undefined,
      high: 'Look beyond surface features to find deep structural patterns, functional relationships, and abstract connections. Identify shared underlying mechanisms, analogous roles, philosophical parallels, and non-obvious conceptual links. Prefer insightful, non-trivial commonalities over obvious ones.',
    }[value];
  }
  return undefined;
};

export const buildPrompt = (items, { instructions, depthGuidance } = {}) => {
  const itemsList = items.join(' | ');
  const itemsBlock = asXML(itemsList, { tag: 'items' });
  const intro =
    instructions ||
    'Identify the common elements, shared features, or overlapping aspects that connect all the given items.';

  return `${contentIsQuestion} ${intro}

${itemsBlock}

Provide a clear, focused list of items that represent the intersection or commonality between all the given categories.${depthGuidance ? `\n\n${depthGuidance}` : ''}

${tryCompleteData}`;
};

export default async function commonalities(items, config = {}) {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  // Finding commonalities requires at least 2 items
  if (items.length < 2) {
    return [];
  }

  const depthGuidance = mapDepth(config.depth);
  const output = await callLlm(buildPrompt(items, { ...config, depthGuidance }), {
    ...config,
    response_format: responseFormat,
  });

  const resultArray = output?.items || output;
  return Array.isArray(resultArray) ? resultArray.filter(Boolean) : [];
}
