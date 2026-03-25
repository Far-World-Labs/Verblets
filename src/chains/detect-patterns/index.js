import reduce from '../reduce/index.js';
import { patternCandidatesJsonSchema } from './schemas.js';
import { jsonSchema } from '../../lib/llm/index.js';
import { nameStep, getOptions, withPolicy } from '../../lib/context/option.js';
import createProgressEmitter from '../../lib/progress/index.js';

const name = 'detect-patterns';

// ===== Option Mappers =====

const DEFAULT_THOROUGHNESS = { capacity: 50, topN: 5 };

/**
 * Map thoroughness option to a pattern detection posture.
 * Coordinates accumulator capacity and output limit.
 * low: small accumulator, fewer results — fast scan for dominant patterns.
 * high: large accumulator, more results — deep analysis catching rare patterns.
 * Default: capacity 50, topN 5.
 * @param {string|object|undefined} value
 * @returns {{ capacity: number, topN: number }}
 */
export const mapThoroughness = (value) => {
  if (value === undefined) return DEFAULT_THOROUGHNESS;
  if (typeof value === 'object') return value;
  return (
    {
      low: { capacity: 20, topN: 3 },
      med: DEFAULT_THOROUGHNESS,
      high: { capacity: 100, topN: 10 },
    }[value] ?? DEFAULT_THOROUGHNESS
  );
};

// Response format for pattern detection - uses items wrapper for array
const PATTERN_RESPONSE_FORMAT = jsonSchema(
  patternCandidatesJsonSchema.name,
  patternCandidatesJsonSchema.schema
);

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
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  const { maxStringLength, maxArrayLength, topN, capacity } = await getOptions(runConfig, {
    thoroughness: withPolicy(mapThoroughness, ['topN', 'capacity']),
    maxStringLength: 50,
    maxArrayLength: 10,
  });

  const filteredObjects = objects.map((obj) => filterObject(obj, maxStringLength, maxArrayLength));
  const stringifiedObjects = filteredObjects.map((obj) => JSON.stringify(obj, null, 0));

  const patternInstructions = `
    Maintain an array of pattern candidates and individual instances. Maximum ${capacity} total items.

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

    CAPACITY MANAGEMENT (when at ${capacity} items):
    - Try merging new object with best match first
    - If no merge possible, evict lowest count instance
    - Prioritize keeping patterns over instances

    Sort array by count descending (patterns first, then instances).

    Return all candidates. If the input list is empty, return an empty array.
  `;

  const candidateArray = await reduce(stringifiedObjects, patternInstructions, {
    ...runConfig,
    initial: [],
    responseFormat: PATTERN_RESPONSE_FORMAT,
  });

  // Since PATTERN_RESPONSE_FORMAT is a simple collection schema,
  // and reduce should handle it properly
  if (!Array.isArray(candidateArray)) {
    emitter.result();
    return [];
  }

  const patterns = candidateArray
    .filter((item) => item.type === 'pattern' && item.count >= 2)
    .sort((a, b) => b.count - a.count)
    .map((item) => item.template)
    .slice(0, topN);

  emitter.result();

  return patterns;
}
