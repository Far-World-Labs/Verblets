/**
 * Read scalar property values from vector states.
 *
 * read() returns simple scalars. readDetails() returns { value, confidence } per property.
 * Both compute all requested properties together in a single pass — properties are not
 * decomposable by name because confidence is relative across the property set.
 *
 * Mechanism: for each property, score each contributing projection vector against
 * the property's pole vectors (linear probe), weight by readPlan and schema defaults,
 * normalize to the property's valueRange.
 */

import { dotAxisScore, magnitude } from './vector-ops.js';

/**
 * Rescale a raw axis score (roughly [-2, 2] for normalized vectors) to a value range.
 *
 * @param {number} rawScore
 * @param {import('./types.js').ValueRange} valueRange
 * @returns {number}
 */
function rescale(rawScore, valueRange) {
  const low = valueRange.low ?? 0;
  const high = valueRange.high ?? 1;
  // Raw score range: dotAxisScore returns [-2, 2] for unit vectors.
  // Map [-2, 2] → [low, high], clamping to range.
  const normalized = (rawScore + 2) / 4; // [0, 1]
  const clamped = Math.max(0, Math.min(1, normalized));
  return low + clamped * (high - low);
}

/**
 * Compute property values for a single state across all requested properties.
 *
 * @param {import('./types.js').State} state
 * @param {import('./types.js').Property[]} properties
 * @param {Record<string, number>} readWeights
 * @param {Record<string, import('./types.js').Poles>} poles
 * @returns {{ values: Record<string, number>, details: Record<string, { value: number, confidence: number }> }}
 */
function readState(state, properties, readWeights, poles) {
  const values = {};
  const details = {};

  // Compute mean projection magnitude across all projections for confidence baseline
  const projVecs = Object.values(state.vectorsByProjectionName);
  const meanMag =
    projVecs.length > 0 ? projVecs.reduce((sum, v) => sum + magnitude(v), 0) / projVecs.length : 0;

  for (const prop of properties) {
    const propPoles = poles[prop.propertyName];
    if (!propPoles) {
      values[prop.propertyName] = undefined;
      details[prop.propertyName] = { value: undefined, confidence: 0 };
      continue;
    }

    let weightedSum = 0;
    let totalWeight = 0;
    let projectionCount = 0;

    for (const [projName, schemaWeight] of Object.entries(prop.projectionWeights)) {
      const vec = state.vectorsByProjectionName[projName];
      if (!vec) continue;

      const readWeight = readWeights[projName] ?? 1.0;
      const effectiveWeight = schemaWeight * readWeight;

      const rawScore = dotAxisScore(vec, propPoles.low, propPoles.high);
      weightedSum += rawScore * effectiveWeight;
      totalWeight += effectiveWeight;
      projectionCount += 1;
    }

    if (totalWeight === 0) {
      values[prop.propertyName] = undefined;
      details[prop.propertyName] = { value: undefined, confidence: 0 };
      continue;
    }

    const avgScore = weightedSum / totalWeight;
    const value = rescale(avgScore, prop.valueRange);

    // Confidence: combination of projection coverage and signal strength.
    // Higher when more projections contribute and vectors have meaningful magnitude.
    const coverage = projectionCount / Math.max(1, Object.keys(prop.projectionWeights).length);
    const signalStrength = Math.min(1, meanMag / 0.5); // saturates at reasonable magnitude
    const confidence = coverage * signalStrength;

    values[prop.propertyName] = value;
    details[prop.propertyName] = { value, confidence };
  }

  return { values, details };
}

/**
 * Read simple scalar values from states.
 *
 * @param {object} args
 * @param {import('./types.js').State[]} args.states
 * @param {import('./types.js').ReadPlan} args.readPlan
 * @param {import('./types.js').Schema} args.schema - Must have _poles populated (from ingest)
 * @returns {import('./types.js').ReadValue[]}
 */
export function read({ states, readPlan, schema }) {
  const propertyMap = new Map(schema.properties.map((p) => [p.propertyName, p]));
  const properties = readPlan.propertyNames.map((name) => propertyMap.get(name)).filter(Boolean);
  const poles = schema._poles ?? {};

  return states.map((state) => {
    const { values } = readState(state, properties, readPlan.weightsByProjectionName, poles);
    return { stateId: state.stateId, valuesByPropertyName: values };
  });
}

/**
 * Read values with confidence scores from states.
 *
 * @param {object} args
 * @param {import('./types.js').State[]} args.states
 * @param {import('./types.js').ReadPlan} args.readPlan
 * @param {import('./types.js').Schema} args.schema - Must have _poles populated (from ingest)
 * @returns {import('./types.js').ReadDetail[]}
 */
export function readDetails({ states, readPlan, schema }) {
  const propertyMap = new Map(schema.properties.map((p) => [p.propertyName, p]));
  const properties = readPlan.propertyNames.map((name) => propertyMap.get(name)).filter(Boolean);
  const poles = schema._poles ?? {};

  return states.map((state) => {
    const { details } = readState(state, properties, readPlan.weightsByProjectionName, poles);
    return { stateId: state.stateId, valuesByPropertyName: details };
  });
}
