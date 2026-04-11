/**
 * Decompose source texts into projection-shaped fragments.
 *
 * LLM call per batch of sources. For bulk workloads, sources are batched
 * and processed with maxParallel concurrency.
 *
 * Fragment kinds:
 *   literal — direct slice from source text
 *   recast  — source restated in a projection's language
 *   cluster — derived from a group of related sources
 *   meta    — policy, tone, or agenda observation
 *   query   — part of a multi-part search intent
 *
 * @param {object} args
 * @param {import('./types.js').SourceText[]} args.sourceTexts
 * @param {import('./types.js').Schema} args.schema
 * @param {object} [config]
 * @returns {Promise<import('./types.js').FragmentSet[]>}
 */

import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import { nameStep, getOptions } from '../../lib/context/option.js';
import createProgressEmitter, { scopePhase } from '../../lib/progress/index.js';
import { DomainEvent, Outcome, ErrorPosture } from '../../lib/progress/constants.js';
import parallel from '../../lib/parallel-batch/index.js';
import fragmentResultSchema from './schemas/fragment-result.json' with { type: 'json' };

const name = 'sem:fragment';

let nextFragId = 0;
const generateFragId = () => `frag:${Date.now().toString(36)}:${(nextFragId++).toString(36)}`;

function buildPrompt(sourceTexts, schema) {
  const projectionList = schema.projections
    .map((p) => `- **${p.projectionName}**: ${p.description}`)
    .join('\n');

  const sourceList = sourceTexts
    .map((s, i) => `### Source ${i} (${s.sourceId})\n${s.text}`)
    .join('\n\n');

  return [
    'Decompose the following source texts into projection-shaped fragments.',
    '',
    'For each source, produce short fragments for each relevant projection.',
    'Do not summarize globally. Extract or restate only the parts relevant to each projection.',
    'It is OK for one source to yield multiple fragments per projection.',
    'Ignore projections with no meaningful evidence in a source.',
    '',
    'Fragment kinds:',
    '- **literal**: direct slice from the source text',
    "- **recast**: source restated in the projection's language (when the original wording doesn't cleanly fit)",
    '- **meta**: an observation about policy, tone, or agenda',
    '- **cluster**: a commonality derived from multiple sources (use only if sources share a pattern)',
    '- **query**: a search-oriented framing (use only when sourceKind indicates a query)',
    '',
    '## Projections',
    '',
    projectionList,
    '',
    '## Source texts',
    '',
    sourceList,
    '',
    'Return an array of objects, one per source, with sourceIndex (integer) and fragments array.',
  ].join('\n');
}

/**
 * Process a single batch of source texts.
 */
async function fragmentBatch(sourceTexts, schema, runConfig) {
  const prompt = buildPrompt(sourceTexts, schema);

  const rawResult = await retry(
    () =>
      callLlm(prompt, {
        ...runConfig,
        responseFormat: jsonSchema('sem_fragment', fragmentResultSchema),
        temperature: 0,
      }),
    { label: 'sem:fragment', config: runConfig }
  );

  // rawResult is auto-unwrapped from { items: [...] } to the array
  const results = Array.isArray(rawResult) ? rawResult : [rawResult];

  return results.map((entry) => {
    const source = sourceTexts[entry.sourceIndex] ?? sourceTexts[0];
    return {
      fragmentSetId: `fs:${source.sourceId}`,
      fragments: entry.fragments.map((f) => ({
        fragmentId: generateFragId(),
        text: f.text,
        fragmentKind: f.fragmentKind,
        projectionName: f.projectionName,
        sourceIds: [source.sourceId],
      })),
    };
  });
}

export default async function fragment({ sourceTexts, schema }, config = {}) {
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();

  try {
    const {
      maxParallel,
      batchSize,
      errorPosture: _errorPosture,
    } = await getOptions(runConfig, {
      maxParallel: 3,
      batchSize: 5,
      errorPosture: ErrorPosture.resilient,
    });

    // Split sources into batches
    const batches = [];
    for (let i = 0; i < sourceTexts.length; i += batchSize) {
      batches.push(sourceTexts.slice(i, i + batchSize));
    }

    emitter.emit({ event: DomainEvent.phase, phase: 'fragmenting', totalBatches: batches.length });
    const batchDone = emitter.batch(sourceTexts.length);

    const batchResults = await parallel(
      batches,
      async (batch) => {
        const result = await fragmentBatch(batch, schema, {
          ...runConfig,
          onProgress: scopePhase(runConfig.onProgress, 'batch'),
        });
        batchDone(batch.length);
        return result;
      },
      { maxParallel }
    );

    const fragmentSets = batchResults.flat();
    emitter.complete({ outcome: Outcome.success, totalFragmentSets: fragmentSets.length });
    return fragmentSets;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}
