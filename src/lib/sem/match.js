/**
 * Projection-aware matching between two sets of states.
 *
 * Computes weighted cosine similarity across shared projections. Optionally
 * embeds queryTexts from the intent and blends them into the comparison.
 * Suppressed projections are excluded.
 *
 * @param {object} args
 * @param {import('./types.js').State[]} args.leftStates
 * @param {import('./types.js').State[]} args.rightStates
 * @param {import('./types.js').Intent} args.intent
 * @param {object} [config]
 * @returns {Promise<import('./types.js').MatchResult[]>}
 */

import { cosineSimilarity } from '../pure/index.js';
import { embedBatch } from '../embed-local/index.js';
import { meanVector, normalize } from './vector-ops.js';

export default async function match({ leftStates, rightStates, intent }, _config = {}) {
  const { weightsByProjectionName = {}, suppressProjectionNames = [], queryTexts = [] } = intent;
  const suppressSet = new Set(suppressProjectionNames);

  // Embed query texts if provided, producing a query-side state contribution
  let queryVectors; // Record<projectionName, Float32Array> or undefined
  if (queryTexts.length > 0) {
    const vectors = await embedBatch(queryTexts);
    const pooled = normalize(meanVector(vectors));
    // Query vector applies to all weighted projections equally
    queryVectors = pooled;
  }

  // Collect all projection names that have weight and aren't suppressed
  const activeProjections = Object.entries(weightsByProjectionName)
    .filter(([name]) => !suppressSet.has(name))
    .filter(([, w]) => w !== 0);

  const results = [];

  for (const left of leftStates) {
    for (const right of rightStates) {
      let weightedSum = 0;
      let totalWeight = 0;

      for (const [projName, weight] of activeProjections) {
        const leftVec = left.vectorsByProjectionName[projName];
        const rightVec = right.vectorsByProjectionName[projName];

        if (leftVec && rightVec) {
          let sim = cosineSimilarity(leftVec, rightVec);

          // Blend query vector into the score if present
          if (queryVectors) {
            const queryLeftSim = cosineSimilarity(queryVectors, leftVec);
            const queryRightSim = cosineSimilarity(queryVectors, rightVec);
            // Boost: average of direct similarity and query relevance of both sides
            sim = sim * 0.6 + (queryLeftSim + queryRightSim) * 0.2;
          }

          weightedSum += sim * weight;
          totalWeight += weight;
        }
      }

      const score = totalWeight > 0 ? weightedSum / totalWeight : 0;
      results.push({ leftStateId: left.stateId, rightStateId: right.stateId, score });
    }
  }

  return results;
}
