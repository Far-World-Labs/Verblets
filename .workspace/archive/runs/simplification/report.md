# Code Simplification Report
> Generated 2026-02-19
> 3 files analyzed
> Chains used: map (analysis + scoring), reduce (synthesis)

## Summary

**Simplification Report**

**High-Impact Changes:**

1. **File: src/chains/map/index.js**
   - **Score: 5/10**
   - **Lines: 309**
   - **Opportunities:**
     - **Refactor Long Functions:** Consider breaking down functions that exceed 50 lines into smaller, more manageable pieces to enhance readability and maintainability.
     - **Remove Redundant Code:** Identify and eliminate any duplicate logic or unused variables to streamline the code.
     - **Improve Comments:** Ensure comments are concise and provide meaningful context, avoiding overly verbose or vague descriptions.

2. **File: src/chains/score/index.js**
   - **Score: 5/10**
   - **Lines: 250**
   - **Opportunities:**
     - **Optimize Imports:** Review and remove any unused imports to reduce clutter and potential confusion.
     - **Enhance Error Handling:** Implement more robust error handling mechanisms to ensure graceful degradation and better debugging.
     - **Simplify Logic:** Look for complex conditional statements or loops that can be simplified or replaced with more efficient alternatives.

3. **File: src/chains/glossary/index.js**
   - **Score: 5/10**
   - **Lines: 86**
   - **Opportunities:**
     - **Streamline Schema Usage:** Ensure the glossary extraction JSON schema is used consistently and efficiently across the file.
     - **Clarify Function Purpose:** Add clear, concise comments at the start of each function to describe its purpose and expected input/output.
     - **Consolidate Similar Functions:** If multiple functions perform similar tasks, consider consolidating them to reduce redundancy.

**Overall Cleanliness:**

- Most files are relatively clean, with opportunities primarily focused on improving code structure, readability, and efficiency. No major issues were identified that would require immediate attention.

## Scores

| File | Lines | Score | Key Finding |
|------|-------|-------|-------------|
| src/chains/map/index.js | 309 | 5/10 | clean |
| src/chains/score/index.js | 250 | 5/10 |    FILE: src/chains/score/index.js (250 lines) --- import chatGPT from '../../li |
| src/chains/glossary/index.js | 86 | 5/10 |    FILE: src/chains/glossary/index.js (86 lines) --- import nlp from 'compromise |

## Detailed Analysis

### src/chains/map/index.js (5/10)

No analysis

---

### src/chains/score/index.js (5/10)

<list>
  <item>FILE: src/chains/score/index.js (250 lines)
---
import chatGPT from '../../lib/chatgpt/index.js';
import retry from '../../lib/retry/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { constants as promptConstants } from '../../prompts/index.js';
import { scaleSpec } from '../scale/index.js';
import map from '../map/index.js';
import scoreSingleResultSchema from './score-single-result.json' with { type: 'json' };

const { onlyJSON } = promptConstants;

// ===== Core Functions =====

/**
 * Default spec generator - uses scaleSpec from scale verblet
 */
export const scoreSpec = scaleSpec;

/**
 * Apply a score specification to a single item
 * @param {*} item - Item to score
 * @param {Object} specification - Pre-generated score specification
 * @param {Object} config - Configuration options
 * @param {number} config.maxAttempts - Max retry attempts (default: 3)
 * @returns {Promise<*>} Score value (type depends on specification range)
 */
export async function applyScore(item, specification, config = {}) {
  const { llm, maxAttempts = 3, onProgress, now = new Date(), ...options } = config;

  const prompt = `Apply the score specification to evaluate this item.

${asXML(specification, { tag: 'score-specification' })}

Score this item according to the specification.
Return a JSON object with a "value" property containing the score from the range.

${onlyJSON}

${asXML(item, { tag: 'item' })}`;

  const response = await retry(chatGPT, {
    label: 'score item',
    maxAttempts,
    onProgress,
    now,
    chainStartTime: now,
    chatGPTPrompt: prompt,
    chatGPTConfig: {
      modelOptions: {
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'score_single_result',
            schema: scoreSingleResultSchema,
          },
        },
      },
      llm,
      ...options,
    },
    logger: options.logger,
  });

  // chatGPT auto-unwraps single value property, returns the number directly
  return response;
}

/**
 * Score a single item
 * @param {*} item - Item to score
 * @param {string} instructions - Scoring instructions
 * @param {Object} config - Configuration options
 * @returns {Promise<*>} Score value
 */
export async function scoreItem(item, instructions, config = {}) {
  const { now = new Date(), ...restConfig } = config;
  const spec = await scoreSpec(instructions, { now, ...restConfig });
  return await applyScore(item, spec, { now, ...restConfig });
}

/**
 * Score a list of items
 * @param {Array} list - Array of items
 * @param {string} instructions - Scoring instructions
 * @param {Object} config - Configuration options
 * @returns {Promise<Array>} Array of scores
 */
export async function mapScore(list, instructions, config = {}) {
  const { onProgress, now = new Date(), ...restConfig } = config;

  // Emit phase for specification generation
  if (onProgress) {
    onProgress({
      step: 'score',
      event: 'phase',
      phase: 'generating-specification',
    });
  }

  const spec = await scoreSpec(instructions, { now, ...restConfig });

  // Emit phase for scoring
  if (onProgress) {
    onProgress({
      step: 'score',
      event: 'phase',
      phase: 'scoring-items',
      specification: spec,
    });
  }

  const mapInstr = mapInstructions({ specification: spec });
  const scores = await map(list, mapInstr, { ...restConfig, onProgress, now });
  return scores.map((s) => Number(s));
}

// ===== Instruction Builders =====

/**
 * Build scoring instructions with common prefix and specification
 * @param {Object} specification - The score specification
 * @param {string} additionalInstructions - Additional instructions for specific operation
 * @returns {string} Complete instruction string
 */
function buildScoringInstructions(specification, additionalInstructions = '') {
  const base = `Apply this score specification to evaluate each item:

${asXML(specification, { tag: 'score-specification' })}`;

  return additionalInstructions ? `${base}\n\n${additionalInstructions}` : base;
}

/**
 * Create map instructions for scoring
 * @param {Object} params - Parameters object
 * @param {Object} params.specification - Pre-generated score specification
 * @returns {string} Instructions string
 */
export function mapInstructions({ specification }) {
  return buildScoringInstructions(
    specification,
    'Return ONLY the score value from the range for each item, nothing else.'
  );
}

/**
 * Create filter instructions for scoring
 * @param {Object} params - Parameters object
 * @param {Object} params.specification - Pre-generated score specification
 * @param {string} params.processing - Which items to keep (e.g., "scores above 7", "only perfect scores")
 * @returns {string} Instructions string
 */
export function filterInstructions({ specification, processing }) {
  const filterContext = `<filter-condition>\n${processing}\n</filter-condition>`;

  return `${buildScoringInstructions(specification)}\n\n${filterContext}`;
}

/**
 * Create reduce instructions for scoring
 * @param {Object} params - Parameters object
 * @param {Object} params.specification - Pre-generated score specification
 * @param {string} params.processing - How to reduce the scores (e.g., "sum all scores", "find highest score with its item")
 * @returns {string} Instructions string
 */
export function reduceInstructions({ specification, processing }) {
  const reduceContext = `<reduce-operation>\n${processing}\n
Process each item by:
1. Applying the score specification to get a numeric score
2. Using that score in the reduction operation
3. Accumulating results across all items
4. Returning the final reduced value
</reduce-operation>`;

  return `${buildScoringInstructions(specification)}\n\n${reduceContext}`;
}

/**
 * Create find instructions for scoring
 * @param {Object} params - Parameters object
 * @param {Object} params.specification - Pre-generated score specification
 * @param {string} params.processing - Which item to select (e.g., "highest scoring", "first above threshold 8")
 * @returns {string} Instructions string
 */
export function findInstructions({ specification, processing }) {
  const findContext = `<selection-criteria>\n${processing}\n</selection-criteria>`;

  return `${buildScoringInstructions(specification)}\n\n${findContext}`;
}

/**
 * Create group instructions for scoring
 * @param {Object} params - Parameters object
 * @param {Object} params.specification - Pre-generated score specification
 * @param {string} params.processing - How to group by scores (e.g., "low (0-3), medium (4-7), high (8-10)")
 * @returns {string} Instructions string
 */
export function groupInstructions({ specification, processing }) {
  const groupContext = `<grouping-strategy>\n${processing}\n</grouping-strategy>`;

  return `${buildScoringInstructions(specification)}\n\n${groupContext}`;
}

// ===== Calibration Utilities =====

/**
 * Build calibration reference from scored items
 * Selects representative items from low, middle, and high score ranges
 * @param {Array<{item: *, score: number}>} scoredItems - Items with their scores
 * @param {number} count - Number of examples per range (default 3)
 * @returns {Array<{item: *, score: number}>} Calibration reference examples
 */
export function buildCalibrationReference(scoredItems, count = 3) {
  const valid = scoredItems.filter((s) => Number.isFinite(s.score));
  if (!valid.length) return [];

  valid.sort((a, b) => a.score - b.score);

  const lows = valid.slice(0, count);
  const highs = valid.slice(-count);
  const midStart = Math.max(0, Math.floor(valid.length / 2) - Math.floor(count / 2));
  const mids = valid.slice(midStart, midStart + count);

  return [...lows, ...mids, ...highs];
}

/**
 * Format calibration examples as XML block
 * @param {Array<{item: *, score: number}>} calibration - Calibration examples
 * @returns {string} Formatted calibration block
 */
export function formatCalibrationBlock(calibration) {
  if (!calibration || !calibration.length) return '';

  return `\nCalibration examples:\n${asXML(
    calibration.map((c) => `${c.score} - ${c.item}`).join('\n'),
    { tag: 'calibration' }
  )}`;
}

// Default export: Score a list of items
export default mapScore;
</item>
</list>

---

### src/chains/glossary/index.js (5/10)

<list>
  <item>FILE: src/chains/glossary/index.js (86 lines)
---
import nlp from 'compromise';
import sort from '../sort/index.js';
import map from '../map/index.js';
import { glossaryExtractionJsonSchema } from './schemas.js';

// Response format for map: each chunk produces an array of terms
const GLOSSARY_RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: glossaryExtractionJsonSchema,
};

/**
 * Extract uncommon or technical terms from text that would benefit from definition.
 *
 * @param {string} text - source text
 * @param {object} [options]
 * @param {number} [options.maxTerms=10] - maximum terms to return
 * @param {number} [options.batchSize=3] - number of sentences per batch
 * @param {number} [options.overlap=1] - number of overlapping sentences between batches
 * @param {number} [options.chunkSize=1] - number of text chunks to process in parallel
 * @param {string} [options.sortBy='importance for understanding the content'] - sorting criteria
 * @returns {Promise<string[]>} list of important terms, sorted by relevance
 */
export default async function glossary(text, options = {}) {
  const {
    maxTerms = 10,
    batchSize = 3,
    overlap = 1,
    chunkSize = 1,
    sortBy = 'importance for understanding the content',
    ...restOptions
  } = options;
  if (!text || !text.trim()) return [];

  // Parse sentences using compromise
  const doc = nlp(text);
  const sentences = doc.sentences().out('array');

  if (sentences.length === 0) return [];

  // Create batches of sentences with overlap
  const textChunks = createTextChunks(sentences, batchSize, overlap);

  const instructions = `For each text chunk, extract specialized terms that would benefit from definition in a glossary.

Focus on terms that:
- Are technical, academic, or domain-specific
- Would be unfamiliar to a general audience
- Carry precise meaning in their field
- Are essential for understanding the content

Return a "terms" object containing an array of the extracted terms.`;

  const mapped = await map(textChunks, instructions, {
    chunkSize,
    responseFormat: GLOSSARY_RESPONSE_FORMAT,
    ...restOptions,
  });

  const terms = extractTerms(mapped);
  if (terms.length === 0) return [];

  // Sort by importance for understanding the content
  const sorted = await sort(terms, sortBy);

  return sorted.slice(0, maxTerms);
}

/**
 * Create text chunks with overlap from sentences.
 *
 * @param {string[]} sentences - Array of sentences
 * @param {number} batchSize - Number of sentences per batch
 * @param {number} overlap - Number of overlapping sentences between batches
 * @returns {string[]} Array of text chunks
 */
function createTextChunks(sentences, batchSize, overlap) {
  const textChunks = [];
  for (let i = 0; i < sentences.length; i += batchSize - overlap) {
    const batch = sentences.slice(i, i + batchSize);
    if (batch.length > 0) {
      textChunks.push(batch.join(' '));
    }
  }
  return textChunks;
}

/**
 * Extract terms from mapped results.
 *
 * @param {Array} mapped - Array of mapped results
 * @returns {string[]} Array of unique terms
 */
function extractTerms(mapped) {
  const termSet = new Set();
  mapped.forEach((result) => {
    if (result && result.terms && Array.isArray(result.terms)) {
      result.terms.forEach((term) => {
        if (term && typeof term === 'string') {
          termSet.add(term);
        }
      });
    }
  });
  return Array.from(termSet);
}
</item>
</list>
