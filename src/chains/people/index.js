import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import parallel from '../../lib/parallel-batch/index.js';
import map from '../map/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { peopleListJsonSchema } from './schemas.js';
import createProgressEmitter, { scopePhase } from '../../lib/progress/index.js';
import { DomainEvent, Outcome, ErrorPosture } from '../../lib/progress/constants.js';
import { nameStep, getOptions } from '../../lib/context/option.js';
import { resolveTexts } from '../../lib/instruction/index.js';
import { expectArray, expectObject } from '../../lib/expect-shape/index.js';

const name = 'people';

const peopleResponseFormat = jsonSchema(peopleListJsonSchema.name, peopleListJsonSchema.schema);

// Batched form wraps each per-description result in a `people` field so the
// outer `items` auto-unwrap doesn't collide with the per-description one.
const peopleBatchSchema = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          people: peopleListJsonSchema.schema.properties.people,
        },
        required: ['people'],
        additionalProperties: false,
      },
    },
  },
  required: ['items'],
  additionalProperties: false,
};

const peopleBatchResponseFormat = jsonSchema('people_batch', peopleBatchSchema);

function validateCount(count, label) {
  if (!Number.isInteger(count) || count <= 0) {
    throw new Error(
      `${label}: count must be a positive integer (got ${
        typeof count === 'number' ? count : typeof count
      })`
    );
  }
}

/**
 * Generate a set of personas matching a description.
 *
 * @param {string|object} description - Description of the kind of people to invent
 * @param {number} [count=3] - How many personas to generate
 * @param {Object} [config={}] - Configuration options
 * @returns {Promise<Array>} Array of persona objects
 */
export default async function peopleSet(description, count = 3, config = {}) {
  validateCount(count, 'peopleSet');
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();

  try {
    const { text: descriptionText, context } = resolveTexts(description, []);
    const contextBlock = context ? `\n\n${context}` : '';
    const prompt = `Create a list of ${count} people based on the following description:

${asXML(descriptionText, { tag: 'description' })}${contextBlock}`;

    const response = await retry(
      () =>
        callLlm(prompt, {
          ...runConfig,
          responseFormat: peopleResponseFormat,
        }),
      {
        label: `peopleSet generation for ${count} people`,
        config: runConfig,
      }
    );

    expectObject(response, { chain: 'people', expected: 'object from LLM' });
    expectArray(response.people, { chain: 'people', expected: 'people array from LLM' });

    emitter.complete({ outcome: Outcome.success });

    return response.people;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

peopleSet.knownTexts = [];

/**
 * Generate a persona set per description with managed concurrency — one LLM
 * call per description. Sister to `mapPeopleSet`, which packs many
 * descriptions into one prompt. Use the parallel form when descriptions
 * vary widely or batched responses smear personas across them.
 *
 * Per-description failures leave the slot as `undefined`; chain reports
 * outcome=partial.
 *
 * @param {Array<string|object>} descriptions - Descriptions to generate from
 * @param {Object} [config={}] - `count`, `maxParallel`, `errorPosture`
 * @returns {Promise<Array<Array<object>|undefined>>} Per-description persona sets
 */
export async function mapPeopleSetParallel(descriptions, config = {}) {
  if (!Array.isArray(descriptions)) {
    throw new Error(
      `mapPeopleSetParallel: descriptions must be an array (got ${
        descriptions === null ? 'null' : typeof descriptions
      })`
    );
  }
  const runConfig = nameStep('people:parallel', config);
  const emitter = createProgressEmitter('people:parallel', runConfig.onProgress, runConfig);
  emitter.start();
  emitter.emit({ event: DomainEvent.input, value: descriptions });

  try {
    const { count, maxParallel, errorPosture } = await getOptions(runConfig, {
      count: 3,
      maxParallel: 3,
      errorPosture: ErrorPosture.resilient,
    });
    validateCount(count, 'mapPeopleSetParallel');

    const batchDone = emitter.batch(descriptions.length);
    const results = new Array(descriptions.length).fill(undefined);
    const indexed = descriptions.map((value, index) => ({ value, index }));

    await parallel(
      indexed,
      async ({ value, index }) => {
        try {
          results[index] = await peopleSet(value, count, {
            ...runConfig,
            onProgress: scopePhase(runConfig.onProgress, 'item'),
          });
        } catch (error) {
          emitter.error(error, { itemIndex: index });
          if (errorPosture === ErrorPosture.strict) throw error;
        } finally {
          batchDone(1);
        }
      },
      {
        maxParallel,
        errorPosture,
        abortSignal: runConfig.abortSignal,
        label: 'people items',
      }
    );

    const failedItems = results.filter((r) => r === undefined).length;
    if (failedItems === results.length && results.length > 0) {
      throw new Error(`people: all ${results.length} descriptions failed to process`);
    }

    const outcome = failedItems > 0 ? Outcome.partial : Outcome.success;
    emitter.emit({ event: DomainEvent.output, value: results });
    emitter.complete({
      totalItems: results.length,
      successCount: results.length - failedItems,
      failedItems,
      outcome,
    });
    return results;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

mapPeopleSetParallel.knownTexts = [];

/**
 * Generate a persona set per description by packing descriptions into batched
 * LLM prompts (one call per batch). Sister to `mapPeopleSetParallel`, which
 * dispatches one LLM call per description — use the batched form to amortize
 * per-call overhead when descriptions are short and homogeneous enough that
 * the LLM can produce one consistent persona vector per prompt.
 *
 * @param {Array<string|object>} descriptions - Descriptions to generate from
 * @param {Object} [config={}] - `count`, `batchSize`, `maxParallel`, `errorPosture`
 * @returns {Promise<Array<Array<object>|undefined>>} Per-description persona sets
 */
export async function mapPeopleSet(descriptions, config = {}) {
  if (!Array.isArray(descriptions)) {
    throw new Error(
      `mapPeopleSet: descriptions must be an array (got ${
        descriptions === null ? 'null' : typeof descriptions
      })`
    );
  }
  const runConfig = nameStep('people:map', config);
  const emitter = createProgressEmitter('people:map', runConfig.onProgress, runConfig);
  emitter.start();
  emitter.emit({ event: DomainEvent.input, value: descriptions });

  try {
    const { count } = await getOptions(runConfig, {
      count: 3,
    });
    validateCount(count, 'mapPeopleSet');

    const mapInstructions = `For each input description, generate a roster of ${count} people who match it.

Return one object per input description, in the same order, with a "people" array. Each person has at minimum a "name" field; include background, location, role, specialty when the description supplies enough signal. Use an empty people array only when no plausible roster fits the description.`;

    // descriptions may be strings or instruction-like objects; serialize to strings
    // so the map chain's listBatch input is uniform.
    const serialized = descriptions.map((d) => {
      if (typeof d === 'string') return d;
      const { text, context } = resolveTexts(d, []);
      return context ? `${text}\n\n${context}` : text;
    });

    const results = await map(serialized, mapInstructions, {
      ...runConfig,
      responseFormat: peopleBatchResponseFormat,
      onProgress: scopePhase(runConfig.onProgress, 'people:map'),
    });

    if (!Array.isArray(results)) {
      throw new Error(`people: expected array of results from map (got ${typeof results})`);
    }

    const unwrapped = results.map((entry) => {
      if (entry === undefined) return undefined;
      expectObject(entry, { chain: 'people', expected: 'per-description result object' });
      return expectArray(entry.people, {
        chain: 'people',
        expected: '"people" array on per-description result',
      });
    });

    const failedItems = unwrapped.filter((r) => r === undefined).length;
    const outcome = failedItems > 0 ? Outcome.partial : Outcome.success;
    emitter.emit({ event: DomainEvent.output, value: unwrapped });
    emitter.complete({
      totalItems: unwrapped.length,
      successCount: unwrapped.length - failedItems,
      failedItems,
      outcome,
    });
    return unwrapped;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

mapPeopleSet.knownTexts = [];
