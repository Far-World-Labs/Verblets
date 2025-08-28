import chatGPT from '../../lib/chatgpt/index.js';
import { onlyJSON, strictFormat } from '../../prompts/constants.js';
import {
  createLifecycleLogger,
  extractPromptAnalysis,
  extractLLMConfig,
} from '../../lib/lifecycle-logger/index.js';
import centralTendencySchema from './central-tendency-result.json';

/**
 * Core prompt template for central tendency evaluation using cognitive science principles.
 * Suitable for both individual and bulk processing.
 */
export const CENTRAL_TENDENCY_PROMPT = `Use cognitive science principles of prototype theory and family resemblance:

{context}
{coreFeatures}

COGNITIVE PRINCIPLES:
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
• 0.9-1.0: Complete category representation (all expected features)

{outputRequirements}`;

/**
 * Build a prompt for evaluating centrality
 * @param {string} item - The item to evaluate (for single) or placeholder for bulk
 * @param {string[]} seedItems - Array of seed items for comparison
 * @param {Object} config - Configuration options
 * @returns {string} Complete prompt
 */
export function buildCentralTendencyPrompt(
  item,
  seedItems,
  { context = '', coreFeatures = [], outputRequirements = null } = {}
) {
  const contextLine = context ? `Context: ${context}` : '';
  const coreFeaturesLine =
    coreFeatures.length > 0 ? `Core Features: ${coreFeatures.join(', ')}` : '';

  // Default structured output requirements for individual verblet use
  const defaultOutputRequirements = `OUTPUT REQUIREMENTS:
${onlyJSON}
${strictFormat}

Required JSON structure:
{
  "score": <number between 0.0 and 1.0>,
  "reason": "<brief explanation of the centrality assessment>",
  "confidence": <number between 0.0 and 1.0 indicating confidence in the assessment>
}

The "reason" should briefly explain why the item received its centrality score based on feature overlap, typicality, and functional alignment with the seed items.
The "confidence" should reflect how certain you are about the assessment (higher for clear cases, lower for borderline cases).`;

  const outputRequirementsLine = outputRequirements || defaultOutputRequirements;

  const prompt = CENTRAL_TENDENCY_PROMPT.replace('{context}', contextLine)
    .replace('{coreFeatures}', coreFeaturesLine)
    .replace('{outputRequirements}', outputRequirementsLine);

  return `Evaluate how central "${item}" is among these category members: ${seedItems.join(', ')}

${prompt}`;
}

/**
 * Create model options for structured outputs
 * @param {string|Object} llm - LLM model name or configuration object
 * @param {string} schemaName - Name for the JSON schema
 * @param {Object} [customSchema] - Custom schema to use instead of default
 * @returns {Object} Model options for chatGPT
 */
function createModelOptions(
  llm = 'fastGoodCheap',
  schemaName = 'central_tendency_result',
  customSchema = null
) {
  const schema = customSchema || centralTendencySchema;

  const responseFormat = {
    type: 'json_schema',
    json_schema: {
      name: schemaName,
      schema,
    },
  };

  if (typeof llm === 'string') {
    return {
      modelName: llm,
      response_format: responseFormat,
    };
  } else {
    return {
      ...llm,
      response_format: responseFormat,
    };
  }
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
 * @param {string} [config.llm='fastGoodCheap'] - LLM model to use
 * @returns {Promise<{score: number, reason: string, confidence: number}>}
 */
export default async function centralTendency(item, seedItems, config = {}) {
  if (!item || typeof item !== 'string') {
    throw new Error('Item must be a non-empty string');
  }

  if (!Array.isArray(seedItems) || seedItems.length === 0) {
    throw new Error('seedItems must be a non-empty array');
  }

  const { context = '', coreFeatures = [], llm = 'fastGoodCheap', logger } = config;

  // Create lifecycle logger with central-tendency namespace
  const lifecycleLogger = createLifecycleLogger(logger, 'central-tendency');

  // Log start with input
  lifecycleLogger.logStart({ item, seedItems, context, coreFeatures });

  const prompt = buildCentralTendencyPrompt(item, seedItems, { context, coreFeatures });
  const modelOptions = createModelOptions(llm, 'central_tendency_result');

  // Log prompt construction
  lifecycleLogger.logConstruction(prompt, {
    ...extractPromptAnalysis(prompt),
    ...extractLLMConfig(modelOptions),
    itemLength: item.length,
    seedCount: seedItems.length,
    hasCoreFeatures: coreFeatures.length > 0,
  });

  try {
    const response = await chatGPT(prompt, { modelOptions, logger: lifecycleLogger });

    // Log result
    lifecycleLogger.logResult(response, {
      score: response.score,
      confidence: response.confidence,
      hasReason: !!response.reason,
    });

    return response;
  } catch (error) {
    lifecycleLogger.logError(error);
    throw error;
  }
}
