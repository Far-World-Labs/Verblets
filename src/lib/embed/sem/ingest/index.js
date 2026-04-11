/**
 * Build vector-bearing states from projection-shaped fragment sets.
 *
 * Groups fragments by source + projection, embeds each group via embedBatch,
 * pools multiple fragment vectors per projection into a single vector via meanVector.
 * Also embeds property pole descriptions if the schema lacks _poles.
 *
 * Supports multimodal fragments: when any fragment has an `image` field, all
 * embedding routes through the multimodal model (same vector space for text
 * and images). Otherwise uses the default text embedding model.
 *
 * Returns { states, schema } where schema has _poles populated. The input schema
 * is never mutated.
 *
 * @param {object} args
 * @param {import('./types.js').FragmentSet[]} args.fragmentSets
 * @param {import('./types.js').Schema} args.schema
 * @param {object} [config]
 * @returns {Promise<{ states: import('./types.js').State[], schema: import('./types.js').Schema }>}
 */

import { embedBatch, embedImageBatch } from '../../local/index.js';
import { meanVector, normalize } from '../vector-ops/index.js';

/**
 * Embed pole descriptions for all properties that lack poles.
 * Returns a complete _poles map (merging any existing poles from the schema).
 *
 * @param {import('./types.js').Schema} schema
 * @param {object} [config] - Forwarded to embedBatch for model negotiation
 * @returns {Promise<Record<string, import('./types.js').Poles>>}
 */
async function ensurePoles(schema, config) {
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

  const vectors = await embedBatch(texts, config);
  const poles = { ...existing };
  for (let i = 0; i < mapping.length; i++) {
    const { propertyName, pole } = mapping[i];
    if (!poles[propertyName]) poles[propertyName] = {};
    poles[propertyName][pole] = normalize(vectors[i]);
  }
  return poles;
}

export default async function ingest({ fragmentSets, schema }, config = {}) {
  // Detect if any fragment carries an image — forces multimodal model for all
  const allFragments = fragmentSets.flatMap((fs) => fs.fragments);
  const hasImages = allFragments.some((f) => f.image);

  // Build embedding config: when images present, negotiate multi for same vector space
  const embedConfig = hasImages ? { ...config, embedding: { multi: true } } : config;

  // Collect all unique fragment texts and images for batch embedding
  const allTexts = [];
  const textIndex = new Map(); // text → index in allTexts (dedup)
  const allImages = [];
  const imageIndex = new Map(); // image → index in allImages (dedup)

  // Group: sourceId → projectionName → fragment content keys
  const groups = new Map();

  for (const fs of fragmentSets) {
    for (const frag of fs.fragments) {
      // Track content for embedding (dedup by exact value)
      const isImage = !!frag.image;
      const contentKey = isImage ? `img:${frag.image}` : `txt:${frag.text}`;

      if (isImage && !imageIndex.has(frag.image)) {
        imageIndex.set(frag.image, allImages.length);
        allImages.push(frag.image);
      }
      if (!isImage && !textIndex.has(frag.text)) {
        textIndex.set(frag.text, allTexts.length);
        allTexts.push(frag.text);
      }

      // Group by first sourceId (or fragmentSetId as fallback)
      const stateId = frag.sourceIds?.[0] ?? fs.fragmentSetId;
      if (!groups.has(stateId)) groups.set(stateId, new Map());
      const projMap = groups.get(stateId);
      if (!projMap.has(frag.projectionName)) projMap.set(frag.projectionName, []);
      projMap.get(frag.projectionName).push(contentKey);
    }
  }

  // Embed all content in batches
  const textVectors = allTexts.length > 0 ? await embedBatch(allTexts, embedConfig) : [];
  const imageVectors = allImages.length > 0 ? await embedImageBatch(allImages, embedConfig) : [];

  // Unified lookup: contentKey → vector
  const vectorLookup = (contentKey) => {
    if (contentKey.startsWith('img:')) {
      return imageVectors[imageIndex.get(contentKey.slice(4))];
    }
    return textVectors[textIndex.get(contentKey.slice(4))];
  };

  // Build states
  const states = [];
  for (const [stateId, projMap] of groups) {
    const vectorsByProjectionName = {};
    const allFragVecs = [];

    for (const [projName, contentKeys] of projMap) {
      const vecs = contentKeys.map(vectorLookup);
      const pooled = meanVector(vecs);
      if (pooled) {
        vectorsByProjectionName[projName] = normalize(pooled);
        allFragVecs.push(...vecs);
      }
    }

    const baseVector = allFragVecs.length > 0 ? normalize(meanVector(allFragVecs)) : undefined;

    states.push({ stateId, vectorsByProjectionName, baseVector });
  }

  // Ensure poles are embedded (uses same model config for consistency)
  const poles = await ensurePoles(schema, embedConfig);
  const enrichedSchema = poles !== schema._poles ? { ...schema, _poles: poles } : schema;

  return { states, schema: enrichedSchema };
}
