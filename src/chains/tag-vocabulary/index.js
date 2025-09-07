import chatGPT from '../../lib/chatgpt/index.js';
import retry from '../../lib/retry/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { constants as promptConstants } from '../../prompts/index.js';
import tagVocabularyResultSchema from './tag-vocabulary-result.json';

const { onlyJSON } = promptConstants;

// ===== Pure Helper Functions =====

/**
 * Compute tag usage statistics from tagging results
 * @param {Object} vocabulary - Tag vocabulary with tags array
 * @param {Array} taggedItems - Array of tag arrays from map operation
 * @param {Object} options - Options for analysis
 * @param {number} options.topN - Number of most-used tags to return
 * @param {number} options.bottomN - Number of least-used tags to return
 * @param {number} options.problematicSampleSize - Max samples per problematic category
 * @returns {Object} Statistics object with stats, mostUsed, leastUsed, and problematicItems
 */
export function computeTagStatistics(vocabulary, taggedItems, options = {}) {
  const { topN = 3, bottomN = 3, problematicSampleSize = 3 } = options;

  // Calculate tag usage counts
  const tagCounts = {};
  vocabulary.tags.forEach((tag) => {
    tagCounts[tag.id] = 0;
  });

  // Count tag usage from map results
  taggedItems.forEach((tags) => {
    if (tags && Array.isArray(tags)) {
      tags.forEach((tagId) => {
        if (tagCounts[tagId] !== undefined) {
          tagCounts[tagId]++;
        }
      });
    }
  });

  // Sort tags by usage
  const sortedTags = Object.entries(tagCounts)
    .map(([tagId, count]) => ({
      tag: vocabulary.tags.find((t) => t.id === tagId),
      count,
    }))
    .sort((a, b) => b.count - a.count);

  // Get most and least used tags
  const mostUsed = sortedTags.slice(0, topN);
  const leastUsed = sortedTags.slice(-bottomN);

  // Calculate coverage statistics
  const itemsWithTags = taggedItems.filter((tags) => tags && tags.length > 0).length;
  const totalTagAssignments = taggedItems.reduce((sum, tags) => sum + (tags ? tags.length : 0), 0);
  const avgTagsPerItem = taggedItems.length > 0 ? totalTagAssignments / taggedItems.length : 0;

  const stats = {
    totalItems: taggedItems.length,
    itemsWithTags,
    coveragePercent: taggedItems.length > 0 ? (itemsWithTags / taggedItems.length) * 100 : 0,
    avgTagsPerItem,
    totalTags: vocabulary.tags.length,
    unusedTags: sortedTags.filter((t) => t.count === 0).length,
  };

  // Identify problematic items
  const problematicItems = [];
  const untaggedItems = [];
  const overtaggedItems = [];
  const ambiguousItems = [];

  taggedItems.forEach((tags, index) => {
    if (!tags || tags.length === 0) {
      if (untaggedItems.length < problematicSampleSize) {
        untaggedItems.push({
          type: 'untagged',
          itemIndex: index,
          tags: [],
        });
      }
    } else if (tags.length > avgTagsPerItem * 2) {
      if (overtaggedItems.length < problematicSampleSize) {
        overtaggedItems.push({
          type: 'overtagged',
          itemIndex: index,
          tags,
          tagCount: tags.length,
        });
      }
    } else if (tags.length === 1 && avgTagsPerItem > 1.5) {
      // Items with single tag when average is >1.5 might be ambiguous
      if (ambiguousItems.length < problematicSampleSize) {
        ambiguousItems.push({
          type: 'ambiguous',
          itemIndex: index,
          tags,
          tagCount: 1,
        });
      }
    }
  });

  problematicItems.push(...untaggedItems, ...overtaggedItems, ...ambiguousItems);

  return {
    stats,
    mostUsed,
    leastUsed,
    problematicItems,
    sortedTags, // Include full sorted list for additional analysis if needed
  };
}

// ===== Core Functions =====

/**
 * Generate initial tag vocabulary from specification and sample items
 * @param {string} tagSystemSpec - Tag system specification text (may include hierarchy details, constraints, initial vocabulary)
 * @param {Array} sampleItems - Sample items to be tagged
 * @param {Object} config - Configuration options
 * @returns {Promise<Object>} Initial tag vocabulary
 */
async function generateInitialVocabulary(tagSystemSpec, sampleItems, config = {}) {
  const { llm, maxAttempts = 3, ...options } = config;

  const prompt = `Generate a comprehensive tag vocabulary for categorizing items.

${asXML(tagSystemSpec, { tag: 'tag-system-specification' })}

${asXML(JSON.stringify(sampleItems.slice(0, 10)), { tag: 'sample-items' })}

Based on the specification:
1. Extract any constraints mentioned (hierarchy, depth, count targets)
2. Identify the core facet or dimension for tagging
3. Note any initial vocabulary to build upon
4. Create a complete set of tags with appropriate granularity
5. Include clear labels and descriptions for each tag
6. Organize hierarchically if specified

The vocabulary should be complete enough to categorize diverse items along the identified dimension.

${onlyJSON}`;

  const response = await retry(chatGPT, {
    label: 'tag-vocabulary-initial',
    maxRetries: maxAttempts,
    chatGPTPrompt: prompt,
    chatGPTConfig: {
      modelOptions: {
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'tag_vocabulary_result',
            schema: tagVocabularyResultSchema,
          },
        },
      },
      llm,
      ...options,
    },
    logger: options.logger,
  });

  return response;
}

/**
 * Analyze tag usage and refine vocabulary
 * @param {Object} vocabulary - Initial tag vocabulary
 * @param {Array} taggedItems - Items with their assigned tag arrays from map operation
 * @param {string} tagSystemSpec - Original tag system specification
 * @param {Object} config - Configuration options
 * @returns {Promise<Object>} Refined tag vocabulary
 */
async function refineVocabulary(vocabulary, taggedItems, tagSystemSpec, config = {}) {
  const { llm, topN = 3, bottomN = 3, maxAttempts = 3, ...options } = config;

  // Compute statistics using pure function
  const analysis = computeTagStatistics(vocabulary, taggedItems, { topN, bottomN });

  const prompt = `Refine this tag vocabulary based on usage analysis.

${asXML(tagSystemSpec, { tag: 'original-specification' })}

${asXML(JSON.stringify(vocabulary), { tag: 'current-vocabulary' })}

${asXML(JSON.stringify(analysis.stats), { tag: 'usage-statistics' })}

${asXML(JSON.stringify(analysis.mostUsed), { tag: 'most-used-tags' })}

${asXML(JSON.stringify(analysis.leastUsed), { tag: 'least-used-tags' })}

${asXML(JSON.stringify(analysis.problematicItems), { tag: 'problematic-items' })}

Based on this analysis:
1. Remove or merge underused/redundant tags
2. Split overused tags if they're too broad
3. Add missing tags for untagged items
4. Clarify ambiguous tag descriptions
5. Maintain the core facet/dimension focus
6. Respect any constraints from the original specification

Return an improved vocabulary that provides better coverage and clearer distinctions.

${onlyJSON}`;

  const response = await retry(chatGPT, {
    label: 'tag-vocabulary-refine',
    maxRetries: maxAttempts,
    chatGPTPrompt: prompt,
    chatGPTConfig: {
      modelOptions: {
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'tag_vocabulary_result',
            schema: tagVocabularyResultSchema,
          },
        },
      },
      llm,
      ...options,
    },
    logger: options.logger,
  });

  return response;
}

/**
 * Generate a tag vocabulary through iterative refinement
 * @param {string} tagSystemSpec - Tag system specification text
 * @param {Array} items - Items to be tagged
 * @param {Object} config - Configuration options including tagger function
 * @returns {Promise<Object>} Final refined tag vocabulary
 */
export default async function tagVocabulary(tagSystemSpec, items, config = {}) {
  const { tagger, sampleSize = 50, maxAttempts = 3, ...options } = config;

  if (!tagger) {
    throw new Error('A tagger function must be provided in config');
  }

  // Sample items for vocabulary generation
  const sampleItems = items.slice(0, Math.min(sampleSize, items.length));

  // Generate initial vocabulary
  const initialVocab = await generateInitialVocabulary(tagSystemSpec, sampleItems, {
    maxAttempts,
    ...options,
  });

  // Apply tags to all items using the provided tagger
  // The tagger should be a configured tags chain function
  const taggedItems = await tagger(items, initialVocab);

  // Refine vocabulary based on usage
  const finalVocab = await refineVocabulary(initialVocab, taggedItems, tagSystemSpec, {
    maxAttempts,
    ...options,
  });

  return finalVocab;
}

// Export individual functions for testing and composition
export { generateInitialVocabulary, refineVocabulary };
