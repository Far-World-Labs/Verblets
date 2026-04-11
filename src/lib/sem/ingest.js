/**
 * Build vector-bearing states from projection-shaped fragment sets.
 *
 * Groups fragments by source + projection, embeds each group via embedBatch,
 * pools multiple fragment vectors per projection into a single vector via meanVector.
 * Also embeds property pole descriptions if the schema lacks _poles.
 *
 * Returns { states, schema } where schema has _poles populated. The input schema
 * is never mutated.
 *
 * @param {object} args
 * @param {import('./types.js').FragmentSet[]} args.fragmentSets
 * @param {import('./types.js').Schema} args.schema
 * @returns {Promise<{ states: import('./types.js').State[], schema: import('./types.js').Schema }>}
 */

import { embedBatch } from '../embed-local/index.js';
import { meanVector, normalize } from './vector-ops.js';

/**
 * Embed pole descriptions for all properties that lack poles.
 * Returns a complete _poles map (merging any existing poles from the schema).
 *
 * @param {import('./types.js').Schema} schema
 * @returns {Promise<Record<string, import('./types.js').Poles>>}
 */
async function ensurePoles(schema) {
  const existing = schema._poles ?? {};
  const missing = schema.properties.filter((p) => !existing[p.propertyName]);
  if (missing.length === 0) return existing;

  // Collect all pole descriptions to embed in one batch
  const texts = [];
  const mapping = []; // [{ propertyName, pole: 'low' | 'high' }]
  for (const prop of missing) {
    const { valueRange } = prop;
    const lowText = valueRange.lowLabel ?? `low ${prop.propertyName}`;
    const highText = valueRange.highLabel ?? `high ${prop.propertyName}`;
    texts.push(lowText, highText);
    mapping.push(
      { propertyName: prop.propertyName, pole: 'low' },
      { propertyName: prop.propertyName, pole: 'high' }
    );
  }

  const vectors = await embedBatch(texts);
  const poles = { ...existing };
  for (let i = 0; i < mapping.length; i++) {
    const { propertyName, pole } = mapping[i];
    if (!poles[propertyName]) poles[propertyName] = {};
    poles[propertyName][pole] = normalize(vectors[i]);
  }
  return poles;
}

export default async function ingest({ fragmentSets, schema }) {
  // Collect all unique fragment texts for batch embedding
  const allTexts = [];
  const textIndex = new Map(); // text → index in allTexts (dedup)

  // Group: sourceId → projectionName → fragment texts
  const groups = new Map();

  for (const fs of fragmentSets) {
    for (const frag of fs.fragments) {
      // Track text for embedding (dedup by exact string)
      if (!textIndex.has(frag.text)) {
        textIndex.set(frag.text, allTexts.length);
        allTexts.push(frag.text);
      }

      // Group by first sourceId (or fragmentSetId as fallback)
      const stateId = frag.sourceIds?.[0] ?? fs.fragmentSetId;
      if (!groups.has(stateId)) groups.set(stateId, new Map());
      const projMap = groups.get(stateId);
      if (!projMap.has(frag.projectionName)) projMap.set(frag.projectionName, []);
      projMap.get(frag.projectionName).push(frag.text);
    }
  }

  // Embed all texts in one batch
  const allVectors = allTexts.length > 0 ? await embedBatch(allTexts) : [];

  // Build states
  const states = [];
  for (const [stateId, projMap] of groups) {
    const vectorsByProjectionName = {};
    const allFragVecs = [];

    for (const [projName, texts] of projMap) {
      const vecs = texts.map((t) => allVectors[textIndex.get(t)]);
      const pooled = meanVector(vecs);
      if (pooled) {
        vectorsByProjectionName[projName] = normalize(pooled);
        allFragVecs.push(...vecs);
      }
    }

    const baseVector = allFragVecs.length > 0 ? normalize(meanVector(allFragVecs)) : undefined;

    states.push({ stateId, vectorsByProjectionName, baseVector });
  }

  // Ensure poles are embedded
  const poles = await ensurePoles(schema);
  const enrichedSchema = poles !== schema._poles ? { ...schema, _poles: poles } : schema;

  return { states, schema: enrichedSchema };
}
