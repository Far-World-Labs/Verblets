import reduce from '../reduce/index.js';
import { patternCandidatesJsonSchema } from './schemas.js';

// Response format for pattern detection - uses items wrapper for array
const PATTERN_RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: patternCandidatesJsonSchema,
};

function filterObject(obj, maxStringLength = 50, maxArrayLength = 10) {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    if (obj.length > maxArrayLength) {
      return `Array(${obj.length})`;
    }
    return obj.map((item) => filterObject(item, maxStringLength, maxArrayLength));
  }

  const filtered = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string' && value.length > maxStringLength) {
      filtered[key] = `String(${value.length})`;
    } else if (typeof value === 'object') {
      filtered[key] = filterObject(value, maxStringLength, maxArrayLength);
    } else {
      filtered[key] = value;
    }
  }

  return filtered;
}

export default async function detectPatterns(objects, config = {}) {
  const { topN = 5, maxStringLength = 50, maxArrayLength = 10, llm, ...options } = config;

  const filteredObjects = objects.map((obj) => filterObject(obj, maxStringLength, maxArrayLength));
  const stringifiedObjects = filteredObjects.map((obj) => JSON.stringify(obj, null, 0));

  const patternInstructions = `
    Maintain an array of pattern candidates and individual instances. Maximum 50 total items.
    
    Each item format: {"type": "pattern"|"instance", "template": {...}, "count": N}
    - "pattern": merged from 2+ objects, count >= 2
    - "instance": single object not yet merged, count = 1
    
    GREEDY ACCUMULATION STRATEGY:
    - For each new object, try to merge with most similar existing item
    - If merge possible: update template constraints, increment count, change type to "pattern" if count >= 2
    - If no merge: add as new "instance" if space allows
    
    VALUE CONSTRAINT EVOLUTION:
    - Instances: use literal values from the single object
    - Patterns: promote to constraints when merging objects with different values:
      * { range: [min, max] } for varying numbers
      * { values: [val1, val2, ...] } for varying discrete values
    - Keep literal values when all merged objects have identical value
    
    CAPACITY MANAGEMENT (when at 50 items):
    - Try merging new object with best match first
    - If no merge possible, evict lowest count instance
    - Prioritize keeping patterns over instances
    
    Sort array by count descending (patterns first, then instances).
    
    Return all candidates. If the input list is empty, return an empty array.
  `;

  const candidateArray = await reduce(stringifiedObjects, patternInstructions, {
    initial: [],
    responseFormat: PATTERN_RESPONSE_FORMAT,
    llm,
    ...options,
  });

  // Since PATTERN_RESPONSE_FORMAT is a simple collection schema,
  // and reduce should handle it properly
  if (!Array.isArray(candidateArray)) {
    return [];
  }

  const patterns = candidateArray
    .filter((item) => item.type === 'pattern' && item.count >= 2)
    .sort((a, b) => b.count - a.count)
    .map((item) => item.template)
    .slice(0, topN);

  return patterns;
}
