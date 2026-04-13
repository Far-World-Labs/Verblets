import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { resolveTexts } from '../../lib/instruction/index.js';
import { strictFormat } from '../../prompts/constants.js';
import { nameStep } from '../../lib/context/option.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { DomainEvent, Outcome } from '../../lib/progress/constants.js';
import centralTendencySchema from './central-tendency-result.json' with { type: 'json' };

const name = 'central-tendency-lines';

/**
 * Core cognitive science framework for central tendency evaluation.
 * Shared between the verblet (single-item) and the chain (batch via map).
 */
export const CENTRAL_TENDENCY_CORE = `COGNITIVE PRINCIPLES:
1. Prototype Theory: Categories have graded structure with central and peripheral members
2. Family Resemblance: Members share overlapping features without identical characteristics
3. Feature Analysis: Consider both core (definitional) and characteristic (typical) features
4. Functional Centrality: Assess how well the item serves the category's purpose

ASSESSMENT CRITERIA:
- Feature overlap with seed items
- Possession of core definitional features
- Functional alignment with category purpose
- Typicality relative to category prototype

CENTRALITY SCORING GUIDE (use precise decimals):
• 0.0-0.1: No category membership (unrelated)
• 0.1-0.2: Minimal category connection (metaphorical or distant relation)
• 0.2-0.3: Weak category membership (limited shared features)
• 0.3-0.4: Partial category membership (some shared features)
• 0.4-0.5: Mixed category membership (balanced typical/atypical features)
• 0.5-0.6: Clear category membership with variations
• 0.6-0.7: Moderate category representation (multiple shared features)
• 0.7-0.8: Strong category representation (many expected features)
• 0.8-0.9: Very strong category representation (most expected features)
• 0.9-1.0: Complete category representation (all expected features)`;

const DEFAULT_OUTPUT_REQUIREMENTS = `OUTPUT REQUIREMENTS:
${strictFormat}

Required JSON structure:
{
  "score": <number between 0.0 and 1.0>,
  "reason": "<brief explanation of the centrality assessment>",
  "confidence": <number between 0.0 and 1.0 indicating confidence in the assessment>
}

The "reason" should briefly explain why the item received its centrality score based on feature overlap, typicality, and functional alignment with the seed items.
The "confidence" should reflect how certain you are about the assessment (higher for clear cases, lower for borderline cases).`;

/**
 * Build a prompt for evaluating centrality.
 * @param {string} item - The item to evaluate
 * @param {string[]} seedItems - Array of seed items for comparison
 * @param {Object} [options]
 * @param {string} [options.context] - Context description
 * @param {string[]} [options.coreFeatures] - Known core features of the category
 * @param {string} [options.outputRequirements] - Custom output format instructions
 * @returns {string} Complete prompt
 */
export function buildCentralTendencyPrompt(
  item,
  seedItems,
  { context = '', coreFeatures = [], outputRequirements } = {}
) {
  const parts = [
    `Evaluate how central ${asXML(item, { tag: 'item' })} is among these category members:`,
    asXML(seedItems.join(', '), { tag: 'seed-items' }),
    'Use cognitive science principles of prototype theory and family resemblance.',
    context && asXML(context, { tag: 'context' }),
    coreFeatures.length > 0 && asXML(coreFeatures.join(', '), { tag: 'core-features' }),
    CENTRAL_TENDENCY_CORE,
    outputRequirements || DEFAULT_OUTPUT_REQUIREMENTS,
  ];

  return parts.filter(Boolean).join('\n\n');
}

/**
 * Create response format for structured outputs.
 */
function createResponseFormat(schemaName = 'central_tendency_result', customSchema = undefined) {
  const schema = customSchema || centralTendencySchema;
  return jsonSchema(schemaName, schema);
}

/**
 * Evaluate how central an item is among category members using cognitive science principles.
 *
 * Based on prototype theory and family resemblance, this function assesses graded typicality
 * by analyzing feature overlap, core characteristics, and functional alignment with seed items.
 *
 * @param {string} item - The item to evaluate for centrality
 * @param {string[]} seedItems - Array of known category members for comparison
 * @param {Object} [config={}] - Configuration options
 * @param {string} [config.context=''] - Context description for evaluation
 * @param {string[]} [config.coreFeatures=[]] - Known core/definitional features of the category
 * @param {string|Object} [config.llm={ fast: true, good: true }] - LLM model to use
 * @returns {Promise<{score: number, reason: string, confidence: number}>}
 */
export default async function centralTendency(item, seedItems, config = {}) {
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();
  emitter.emit({ event: DomainEvent.input, value: item });

  try {
    const { text: evaluationItem, context: bundleContext } = resolveTexts(item, []);

    if (!evaluationItem || typeof evaluationItem !== 'string') {
      throw new Error('Item must be a non-empty string');
    }

    if (!Array.isArray(seedItems) || seedItems.length === 0) {
      throw new Error('seedItems must be a non-empty array');
    }

    const context = runConfig.context || '';
    const coreFeatures = runConfig.coreFeatures || [];

    const prompt = buildCentralTendencyPrompt(evaluationItem, seedItems, { context, coreFeatures });
    const contextBlock = bundleContext ? `\n\n${bundleContext}` : '';
    const responseFormat = createResponseFormat('central_tendency_result');

    const response = await callLlm(`${prompt}${contextBlock}`, {
      ...runConfig,
      responseFormat,
    });

    emitter.emit({ event: DomainEvent.output, value: response });
    emitter.complete({ outcome: Outcome.success });
    return response;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

centralTendency.knownTexts = [];
