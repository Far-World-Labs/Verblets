/**
 * Apply reversible projection-level edits to vector states.
 *
 * Works by named projections — scales each projection vector by (1 + edit).
 * Positive edits strengthen, negative edits suppress. -1 zeroes out.
 * Untouched projections pass through unchanged. Input states are never mutated.
 *
 * @param {object} args
 * @param {import('./types.js').State[]} args.states
 * @param {Record<string, number>} args.editsByProjectionName - Scale factors per projection (e.g. { compliance: +0.25, tribeAffinity: -0.8 })
 * @returns {import('./types.js').State[]}
 */
import { scaleVector } from './vector-ops.js';

export default function shapeState({ states, editsByProjectionName }) {
  return states.map((state) => {
    const edited = {};
    for (const [projName, vec] of Object.entries(state.vectorsByProjectionName)) {
      const edit = editsByProjectionName[projName];
      edited[projName] = edit !== undefined ? scaleVector(vec, 1 + edit) : new Float32Array(vec);
    }
    return {
      stateId: state.stateId,
      vectorsByProjectionName: edited,
      baseVector: state.baseVector ? new Float32Array(state.baseVector) : undefined,
    };
  });
}
