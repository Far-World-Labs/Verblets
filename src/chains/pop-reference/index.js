import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import parallel from '../../lib/parallel-batch/index.js';
import map from '../map/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import popReferenceSchema from './pop-reference-result.json' with { type: 'json' };
import createProgressEmitter, { scopePhase } from '../../lib/progress/index.js';
import { DomainEvent, Outcome, ErrorPosture } from '../../lib/progress/constants.js';
import { nameStep, getOptions } from '../../lib/context/option.js';
import { resolveArgs, resolveTexts } from '../../lib/instruction/index.js';
import { expectArray, expectObject } from '../../lib/expect-shape/index.js';

const name = 'pop-reference';

const popReferenceResponseFormat = jsonSchema('pop_reference_result', popReferenceSchema);

// Batched form wraps the per-sentence result in a `references` field so the
// outer `items` auto-unwrap doesn't collide with the per-sentence one.
const popReferenceBatchSchema = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          references: popReferenceSchema.properties.references,
        },
        required: ['references'],
        additionalProperties: false,
      },
    },
  },
  required: ['items'],
  additionalProperties: false,
};

const popReferenceBatchResponseFormat = jsonSchema('pop_reference_batch', popReferenceBatchSchema);

function buildIncludeBlock(include) {
  if (!include?.length) return '';
  const sources = include.map((item) => {
    if (typeof item === 'string') return item;
    if (item.reference && item.percent) return `${item.reference} (focus ${item.percent}%)`;
    return item.reference || item;
  });
  return asXML(sources.join('\n'), { tag: 'sources' });
}

function buildSentencePrompt({
  sentence,
  descriptionText,
  context,
  includeBlock,
  referenceContext,
  referencesPerSource,
}) {
  const sentenceXml = asXML(sentence, { tag: 'sentence' });
  const descriptionXml = asXML(descriptionText, { tag: 'description' });
  const contextInstruction = referenceContext
    ? 'Include a brief context description for each reference explaining the scene or idea being referenced.'
    : 'Do not include context descriptions.';
  const contextBlock = context ? `\n\n${context}` : '';
  return `Find pop culture references that metaphorically capture the sentence based on its description.

${descriptionXml}

${sentenceXml}

${
  includeBlock
    ? `Draw references from these sources:\n${includeBlock}\n`
    : 'Select appropriate pop culture references from any well-known source.'
}

Process:
1. Identify the key elements in the sentence that could be metaphorically represented
2. Find ${referencesPerSource} references per source that capture these elements
3. Score each reference based on how well it fits (0-1 scale)
4. Identify which part of the sentence each reference connects to

${contextInstruction}

Requirements:
- Each reference should be a specific moment, scene, or concept (not just the source name)
- References should meaningfully connect to the sentence's meaning
- Provide exact character positions for matched text
- Higher scores mean stronger metaphorical fit${contextBlock}`;
}

/**
 * Find pop culture references that metaphorically match a single sentence.
 *
 * @param {string} sentence - The sentence to metaphorically compare
 * @param {string|object} description - Descriptor guiding tone, intent, or interpretive nuance
 * @param {Object} [config={}] - Configuration options
 * @returns {Promise<Array>} Array of PopCultureReference objects
 */
export default async function popReferenceItem(sentence, description, config) {
  if (typeof sentence !== 'string' || sentence.length === 0) {
    throw new Error(
      `pop-reference: sentence must be a non-empty string (got ${
        sentence === null ? 'null' : typeof sentence
      })`
    );
  }
  [description, config] = resolveArgs(description, config);
  const { text: descriptionText, context } = resolveTexts(description, []);
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();

  try {
    const { referenceContext, referencesPerSource } = await getOptions(runConfig, {
      referenceContext: false,
      referencesPerSource: 2,
    });
    const includeBlock = buildIncludeBlock(runConfig.include);

    const prompt = buildSentencePrompt({
      sentence,
      descriptionText,
      context,
      includeBlock,
      referenceContext,
      referencesPerSource,
    });

    const response = await retry(
      () =>
        callLlm(prompt, {
          ...runConfig,
          responseFormat: popReferenceResponseFormat,
        }),
      {
        label: 'pop-reference',
        config: runConfig,
      }
    );

    expectObject(response, { chain: 'pop-reference', expected: 'object from LLM' });
    const references = expectArray(response.references, {
      chain: 'pop-reference',
      expected: 'references array from LLM',
    });

    emitter.complete({ outcome: Outcome.success, references: references.length });

    return references;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

popReferenceItem.knownTexts = [];

/**
 * Find pop culture references for each sentence with managed concurrency —
 * one LLM call per sentence. Sister to `mapPopReference`, which packs many
 * sentences into one prompt. Use the parallel form when sentences vary
 * widely or batched responses smear references across them.
 *
 * Per-sentence failures leave the slot as `undefined`; chain reports
 * outcome=partial.
 *
 * @param {string[]} sentences - Sentences to process
 * @param {string|object} description - Shared descriptor (tone, intent, sources)
 * @param {Object} [config={}] - `maxParallel`, `errorPosture`
 * @returns {Promise<Array<Array<object>|undefined>>} Per-sentence reference arrays
 */
export async function mapPopReferenceParallel(sentences, description, config) {
  if (!Array.isArray(sentences)) {
    throw new Error(
      `mapPopReferenceParallel: sentences must be an array (got ${
        sentences === null ? 'null' : typeof sentences
      })`
    );
  }
  [description, config] = resolveArgs(description, config);

  const runConfig = nameStep('pop-reference:parallel', config);
  const emitter = createProgressEmitter('pop-reference:parallel', runConfig.onProgress, runConfig);
  emitter.start();
  emitter.emit({ event: DomainEvent.input, value: sentences });

  try {
    const { maxParallel, errorPosture } = await getOptions(runConfig, {
      maxParallel: 3,
      errorPosture: ErrorPosture.resilient,
    });

    const batchDone = emitter.batch(sentences.length);
    const results = new Array(sentences.length).fill(undefined);
    const indexed = sentences.map((sentence, index) => ({ sentence, index }));

    await parallel(
      indexed,
      async ({ sentence, index }) => {
        try {
          results[index] = await popReferenceItem(sentence, description, {
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
        label: 'pop-reference items',
      }
    );

    const failedItems = results.filter((r) => r === undefined).length;
    if (failedItems === results.length && results.length > 0) {
      throw new Error(`pop-reference: all ${results.length} sentences failed to process`);
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

mapPopReferenceParallel.knownTexts = [];

/**
 * Find pop culture references for each sentence by packing sentences into
 * batched LLM prompts (one call per batch). Sister to `mapPopReferenceParallel`,
 * which dispatches one LLM call per sentence — use the batched form to
 * amortize per-call overhead when sentences are short and the LLM can produce
 * one consistent reference vector per prompt.
 *
 * @param {string[]} sentences - Sentences to process
 * @param {string|object} description - Shared descriptor (tone, intent, sources)
 * @param {Object} [config={}] - `batchSize`, `maxParallel`, `errorPosture`
 * @returns {Promise<Array<Array<object>|undefined>>} Per-sentence reference arrays
 */
export async function mapPopReference(sentences, description, config) {
  if (!Array.isArray(sentences)) {
    throw new Error(
      `mapPopReference: sentences must be an array (got ${
        sentences === null ? 'null' : typeof sentences
      })`
    );
  }
  [description, config] = resolveArgs(description, config);
  const { text: descriptionText, context } = resolveTexts(description, []);

  const runConfig = nameStep('pop-reference:map', config);
  const emitter = createProgressEmitter('pop-reference:map', runConfig.onProgress, runConfig);
  emitter.start();
  emitter.emit({ event: DomainEvent.input, value: sentences });

  try {
    const { referenceContext, referencesPerSource } = await getOptions(runConfig, {
      referenceContext: false,
      referencesPerSource: 2,
    });
    const includeBlock = buildIncludeBlock(runConfig.include);
    const contextInstruction = referenceContext
      ? 'Include a brief context description for each reference explaining the scene or idea being referenced.'
      : 'Do not include context descriptions.';
    const contextBlock = context ? `\n\n${context}` : '';

    const mapInstructions = `Find pop culture references that metaphorically capture each input sentence based on the shared description.

${asXML(descriptionText, { tag: 'description' })}

${
  includeBlock
    ? `Draw references from these sources:\n${includeBlock}\n`
    : 'Select appropriate pop culture references from any well-known source.'
}

For every input sentence, return an object with a "references" array. Each reference object has:
- reference: a specific moment, scene, or concept (not just the source name)
- source: the source material name
- score: 0-1 strength of metaphorical fit
- match: { text, start, end } — substring of the sentence the reference connects to (with character offsets)
- context: optional brief context (only when referenceContext is enabled)

Aim for ${referencesPerSource} references per source per sentence. Return one references object per input sentence, in the same order. Use an empty references array when no good references exist.

${contextInstruction}${contextBlock}`;

    const results = await map(sentences, mapInstructions, {
      ...runConfig,
      responseFormat: popReferenceBatchResponseFormat,
      onProgress: scopePhase(runConfig.onProgress, 'pop-reference:map'),
    });

    if (!Array.isArray(results)) {
      throw new Error(`pop-reference: expected array of results from map (got ${typeof results})`);
    }

    // Each per-sentence entry is { references: [...] }; unwrap to bare arrays
    // so callers see the same shape as popReferenceItem returns per-call.
    const unwrapped = results.map((entry) => {
      if (entry === undefined) return undefined;
      expectObject(entry, { chain: 'pop-reference', expected: 'per-sentence result object' });
      return expectArray(entry.references, {
        chain: 'pop-reference',
        expected: '"references" array on per-sentence result',
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

mapPopReference.knownTexts = [];
