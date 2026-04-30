/**
 * Refine a schema based on a study set of states that expose gaps.
 *
 * Single LLM call — sends the current schema and study set context,
 * asks for suggested additions or revisions to projections and properties.
 * Returns a complete replacement schema (not a diff).
 *
 * @param {object} args
 * @param {import('./types.js').Schema} args.schema - Current schema
 * @param {import('./types.js').StudySet} args.studySet - Selected states + notes
 * @param {object} [config]
 * @returns {Promise<import('./types.js').Schema>}
 */

import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import { nameStep } from '../../lib/context/option.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { Outcome } from '../../lib/progress/constants.js';
import refineResultSchema from './refine-result.json' with { type: 'json' };

const name = 'embed-object:refine';

function buildPrompt(schema, studySet) {
  const projectionList = schema.projections
    .map((p) => `- **${p.projectionName}**: ${p.description}`)
    .join('\n');

  const propertyList = schema.properties
    .map((p) => {
      const range = p.valueRange;
      const rangeDesc =
        range.type === 'continuous'
          ? `${range.lowLabel ?? range.low ?? 0} → ${range.highLabel ?? range.high ?? 1}`
          : (range.categories ?? []).join(', ');
      const weights = Object.entries(p.projectionWeights)
        .map(([k, v]) => `${k}:${v}`)
        .join(', ');
      return `- **${p.propertyName}** (${rangeDesc}) [weights: ${weights}]`;
    })
    .join('\n');

  return [
    'Refine the following semantic schema based on a study set of selected instances.',
    '',
    'The study set identifies cases that expose gaps or unexplained patterns in the current schema.',
    'Your task:',
    '1. Identify what these instances have in common that is NOT captured by current projections or properties',
    '2. Identify distinctions that matter within the selection',
    '3. Suggest new or revised projections and properties as needed',
    '4. Return a complete schema (not a diff) — keep all existing projections/properties that are still useful, add new ones, revise descriptions or weights where warranted',
    '',
    '## Current schema',
    '',
    '### Projections',
    projectionList,
    '',
    '### Properties',
    propertyList,
    '',
    '## Study set',
    '',
    `**Selected state IDs**: ${studySet.selectedStateIds.join(', ')}`,
    '',
    `**Observer notes**: ${studySet.noteText}`,
  ].join('\n');
}

function validateInputs(schema, studySet) {
  if (!schema || !Array.isArray(schema.projections) || !Array.isArray(schema.properties)) {
    throw new Error('embed-object:refine: schema requires projections and properties arrays');
  }
  if (!studySet || !Array.isArray(studySet.selectedStateIds)) {
    throw new Error('embed-object:refine: studySet requires a selectedStateIds array');
  }
}

function validateRefineResult(result) {
  if (!result || typeof result !== 'object') {
    throw new Error(`embed-object:refine: expected object from LLM (got ${typeof result})`);
  }
  if (!Array.isArray(result.projections) || !Array.isArray(result.properties)) {
    throw new Error(
      'embed-object:refine: LLM response must include projections and properties arrays'
    );
  }
}

export default async function refine({ schema, studySet }, config = {}) {
  validateInputs(schema, studySet);
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();

  try {
    const prompt = buildPrompt(schema, studySet);

    const result = await retry(
      () =>
        callLlm(prompt, {
          ...runConfig,
          responseFormat: jsonSchema('sem_refine', refineResultSchema),
          temperature: 0,
        }),
      { label: 'embed-object:refine', config: runConfig }
    );

    validateRefineResult(result);

    emitter.complete({ outcome: Outcome.success });

    return {
      projections: result.projections,
      properties: result.properties,
    };
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}
