import intersection from '../../verblets/intersection/index.js';
import { rangeCombinations } from '../../lib/combinations/index.js';
import chatGPT from '../../lib/chatgpt/index.js';
import wrapVariable from '../../prompts/wrap-variable.js';
import pkg from 'lodash';
const { shuffle } = pkg;
import number from '../../verblets/number/index.js';
import { constants as promptConstants } from '../../prompts/index.js';

const {
  onlyJSONStringArray,
  asNumber,
  strictFormat,
  contentIsQuestion,
  explainAndSeparate,
  explainAndSeparatePrimitive,
} = promptConstants;

/**
 * Prompt for listing elements that belong to all categories
 */
const ELEMENTS_PROMPT = (
  categories
) => `${contentIsQuestion} List specific examples, instances, or elements that belong to all of: ${categories.join(
  ', '
)}.

${strictFormat} ${onlyJSONStringArray}`;

/**
 * Prompt for scoring intersection results
 */
const SCORING_PROMPT = (
  combo,
  description,
  elements
) => `${contentIsQuestion} Rate this intersection result on a scale of 1-10:

Combination: ${combo.join(' + ')}
Description: ${description}
Elements: ${elements.join(', ')}

Criteria: Correctly lists specific examples, instances, or elements that belong to ALL categories simultaneously, with meaningful description.

${explainAndSeparate} ${explainAndSeparatePrimitive}

${asNumber}`;

/**
 * Prompt for generating exhaustive elements using examples
 */
const EXHAUSTIVE_PROMPT = (
  examplePrompts,
  combo
) => `Here are examples of well-enumerated intersections:

${examplePrompts}

${contentIsQuestion} For the combination: ${combo.join(' + ')}

Provide an exhaustive list of specific examples, instances, or elements that belong to ALL of these categories simultaneously. Be as comprehensive as possible, following the pattern of the examples above.

${wrapVariable(combo.join(' | '), { tag: 'combination' })}

${strictFormat} ${onlyJSONStringArray}`;

/**
 * Parse elements from LLM response (now expects JSON array)
 */
const parseElements = (elementsText) => {
  try {
    const parsed = JSON.parse(elementsText.trim());
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    // Fallback to old parsing method if JSON parsing fails
    return elementsText
      .split('\n')
      .map((line) => line.replace(/^[-*•]\s*/, '').trim())
      .filter(Boolean);
  }
};

/**
 * Process a single combination to get elements, description, and score
 */
const processCombo = async (combo, instructions) => {
  const comboKey = combo.join(' + ');

  // Process elements, description, and scoring in parallel
  const [elements, intersectionItems] = await Promise.all([
    chatGPT(ELEMENTS_PROMPT(combo)),
    intersection(combo, { instructions }),
  ]);

  const elementList = parseElements(elements);
  const description = Array.isArray(intersectionItems)
    ? intersectionItems.join(', ')
    : String(intersectionItems);
  const score = await number(SCORING_PROMPT(combo, description, elementList));

  return {
    combo,
    comboKey,
    description,
    elementList,
    score,
  };
};

/**
 * Process remaining combination using top examples as patterns
 */
const processRemainingCombo = async (combo, instructions, examplePrompts) => {
  const comboKey = combo.join(' + ');

  const [exhaustiveElements, intersectionItems] = await Promise.all([
    chatGPT(EXHAUSTIVE_PROMPT(examplePrompts, combo)),
    intersection(combo, { instructions }),
  ]);

  const exhaustiveList = parseElements(exhaustiveElements);
  const description = Array.isArray(intersectionItems)
    ? intersectionItems.join(', ')
    : String(intersectionItems);

  return {
    key: comboKey,
    intersection: {
      combination: combo,
      description,
      elements: exhaustiveList,
    },
  };
};

/**
 * Find intersections for all combinations of items with consistent, exhaustive results
 *
 * @param {Array} items - Array of items to find intersections between
 * @param {Object} options - Configuration options
 * @param {string} options.instructions - Custom instructions for intersection finding
 * @param {number} options.minSize - Minimum combination size (default: 2)
 * @param {number} options.maxSize - Maximum combination size (default: items.length)
 * @param {number} options.batchSize - Number of combinations to process in parallel (default: 5)
 * @param {number} options.goodnessScore - Minimum score threshold for good examples (default: 7)
 * @returns {Object} Results with combinations, elements, and exhaustive intersections
 * @throws {Error} When no combinations score above the goodness threshold
 */
export default async function intersections(items, options = {}) {
  if (!Array.isArray(items) || items.length < 2) {
    return {};
  }

  const {
    instructions,
    minSize = 2,
    maxSize = items.length,
    batchSize = 5,
    goodnessScore = 7,
  } = options;

  // Step 1: Generate and shuffle combinations
  const allCombinations = rangeCombinations(items, minSize, maxSize);
  const combinations = shuffle(allCombinations);

  if (combinations.length === 0) {
    return {};
  }

  // Step 2: Find first 3 high-quality intersections in parallel
  const topExamples = [];

  for (let i = 0; i < combinations.length && topExamples.length < 3; i += batchSize) {
    const batch = combinations.slice(i, i + batchSize);
    const results = await Promise.all(batch.map((combo) => processCombo(combo, instructions)));

    for (const result of results) {
      if (result.score > goodnessScore && topExamples.length < 3) {
        topExamples.push({
          key: result.comboKey,
          intersection: {
            combination: result.combo,
            description: result.description,
            elements: result.elementList,
          },
        });
      }
    }
  }

  // If no good examples found, lower the threshold and try again
  if (topExamples.length === 0) {
    const lowerThreshold = Math.max(1, goodnessScore - 3);
    for (let i = 0; i < Math.min(combinations.length, 10) && topExamples.length < 3; i++) {
      const result = await processCombo(combinations[i], instructions);
      if (result.score > lowerThreshold) {
        topExamples.push({
          key: result.comboKey,
          intersection: {
            combination: result.combo,
            description: result.description,
            elements: result.elementList,
          },
        });
      }
    }
  }

  // If still no examples, return empty object
  if (topExamples.length === 0) {
    return {};
  }

  // Step 3: Use top examples to generate all intersections in parallel
  const examplePrompts = topExamples
    .map(
      ({ key, intersection }) =>
        `${key}: ${intersection.description}\nElements: ${intersection.elements
          .slice(0, 5)
          .join(', ')}`
    )
    .join('\n\n');

  const remainingCombinations = allCombinations.filter((combo) => {
    const comboKey = combo.join(' + ');
    return !topExamples.find((ex) => ex.key === comboKey); // Skip already processed examples
  });

  // Process remaining combinations in parallel
  const remainingResults = await Promise.all(
    remainingCombinations.map((combo) => processRemainingCombo(combo, instructions, examplePrompts))
  );

  // Combine all results
  const finalIntersections = {};

  // Add top examples
  for (const example of topExamples) {
    finalIntersections[example.key] = example.intersection;
  }

  // Add remaining results
  for (const result of remainingResults) {
    finalIntersections[result.key] = result.intersection;
  }

  return finalIntersections;
}
