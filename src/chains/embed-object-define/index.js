/**
 * Define projections and properties for a domain from example texts.
 *
 * Pure LLM call — no vectors, no embeddings. Returns a text-only schema
 * that can be versioned and revised.
 *
 * @param {object} args
 * @param {string[]} args.exampleTexts - Representative texts from the domain
 * @param {string[]} [args.projectionNames] - Optional seed projection names
 * @param {string[]} [args.propertyNames] - Optional seed property names
 * @param {object} [config]
 * @returns {Promise<import('./types.js').Schema>}
 */

import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import { nameStep } from '../../lib/context/option.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { Outcome } from '../../lib/progress/constants.js';
import defineResultSchema from './define-result.json' with { type: 'json' };
import compareResultSchema from './compare-result.json' with { type: 'json' };

const name = 'embed-object:define';
const compareName = 'embed-object:compare-schemas';

function buildPrompt({ exampleTexts, projectionNames, propertyNames }) {
  const lines = [
    'Define a semantic schema for the following domain texts.',
    '',
    'A schema has two parts:',
    '1. **Projections** — named semantic lanes that text can be decomposed into. Each projection should capture a distinct concern or dimension of meaning. Give each a short camelCase name and a brief description of what it covers.',
    '2. **Properties** — scalar readout targets that can be recovered by reading across projections. Each property should have:',
    '   - A camelCase propertyName',
    '   - A valueRange with type "continuous" (low/high numbers and lowLabel/highLabel descriptions) or "categorical" (array of category names)',
    '   - projectionWeights: which projections contribute to this property and how much (0 to 1)',
    '',
    'Keep the set small and operational — 3-8 projections, 2-6 properties.',
    '',
    '## Example texts',
    '',
    ...exampleTexts.map((t, i) => `### Text ${i + 1}\n${t}\n`),
  ];

  if (projectionNames?.length > 0) {
    lines.push(
      `## Suggested projection names (use or adapt these)\n${projectionNames.join(', ')}\n`
    );
  }
  if (propertyNames?.length > 0) {
    lines.push(`## Suggested property names (use or adapt these)\n${propertyNames.join(', ')}\n`);
  }

  return lines.join('\n');
}

function formatSchema(label, schema) {
  const lines = [`## ${label}`, '', '### Projections'];

  for (const p of schema.projections ?? []) {
    lines.push(`- **${p.projectionName}**: ${p.description}`);
  }

  lines.push('', '### Properties');

  for (const p of schema.properties ?? []) {
    const vr = p.valueRange;
    const rangeDesc =
      vr.type === 'continuous'
        ? `continuous [${vr.low}–${vr.high}], low="${vr.lowLabel}", high="${vr.highLabel}"`
        : `categorical [${(vr.categories ?? []).join(', ')}]`;
    const weights = Object.entries(p.projectionWeights ?? {})
      .map(([k, v]) => `${k}:${v}`)
      .join(', ');
    lines.push(`- **${p.propertyName}**: ${rangeDesc}, weights={${weights}}`);
  }

  return lines.join('\n');
}

function buildComparePrompt(schemaA, schemaB) {
  return [
    'Compare these two semantic schemas and identify semantic overlaps and divergences.',
    '',
    formatSchema('Schema A', schemaA),
    '',
    formatSchema('Schema B', schemaB),
    '',
    '## Instructions',
    '',
    'For each pair of projections or properties across the two schemas, determine if they are semantically overlapping or unique to one schema.',
    '',
    'Semantic similarity levels:',
    '- **high**: Covering essentially the same concept, possibly with different names',
    '- **moderate**: Significant conceptual overlap but meaningful differences in scope',
    '- **low**: Some tangential connection but fundamentally different focus',
    '',
    'For overlapping properties, describe how their value ranges diverge (same range, different scales, continuous vs categorical, etc.).',
    '',
    'A projection or property is "unique" to a schema only if nothing in the other schema is semantically similar at a moderate or high level.',
    '',
    'Provide a brief summary of the overall comparison.',
  ].join('\n');
}

export default async function define(
  { exampleTexts, projectionNames, propertyNames },
  config = {}
) {
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();

  try {
    const prompt = buildPrompt({ exampleTexts, projectionNames, propertyNames });

    const result = await retry(
      () =>
        callLlm(prompt, {
          ...runConfig,
          responseFormat: jsonSchema('sem_define', defineResultSchema),
          temperature: 0,
        }),
      { label: 'embed-object:define', config: runConfig }
    );

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

/**
 * Compare two semantic schema definitions to identify overlaps and divergences.
 *
 * @example
 * const report = await compareSchemas(schemaA, schemaB, config);
 * // report.projections.overlapping — projection pairs shared across schemas
 * // report.projections.uniqueToA / uniqueToB — projections exclusive to one schema
 * // report.properties.overlapping — property pairs shared, with valueRangeDivergence
 * // report.properties.uniqueToA / uniqueToB — properties exclusive to one schema
 * // report.summary — brief overall assessment
 */
export async function compareSchemas(schemaA, schemaB, config = {}) {
  const runConfig = nameStep(compareName, config);
  const emitter = createProgressEmitter(compareName, runConfig.onProgress, runConfig);
  emitter.start();

  try {
    const prompt = buildComparePrompt(schemaA, schemaB);

    const result = await retry(
      () =>
        callLlm(prompt, {
          ...runConfig,
          responseFormat: jsonSchema('sem_compare', compareResultSchema),
          temperature: 0,
        }),
      { label: compareName, config: runConfig }
    );

    emitter.complete({ outcome: Outcome.success });

    return {
      projections: result.projections,
      properties: result.properties,
      summary: result.summary,
    };
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}
