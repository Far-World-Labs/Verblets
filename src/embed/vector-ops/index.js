/**
 * Pure vector math primitives for semantic state operations.
 * All functions are non-mutating — inputs are never modified.
 */

import { cosineSimilarity } from '../../lib/pure/index.js';

/**
 * Compute the element-wise mean of an array of Float32Array vectors.
 * Returns a new Float32Array. Empty input returns undefined.
 *
 * @param {Float32Array[]} vectors
 * @returns {Float32Array | undefined}
 */
export function meanVector(vectors) {
  if (vectors.length === 0) return undefined;
  if (vectors.length === 1) return new Float32Array(vectors[0]);

  const dim = vectors[0].length;
  const sum = new Float32Array(dim);
  for (const vec of vectors) {
    for (let i = 0; i < dim; i++) sum[i] += vec[i];
  }
  const invLen = 1 / vectors.length;
  for (let i = 0; i < dim; i++) sum[i] *= invLen;
  return sum;
}

/**
 * L2-normalize a vector. Returns a new Float32Array.
 * Zero vectors return a zero vector (no division by zero).
 *
 * @param {Float32Array} vec
 * @returns {Float32Array}
 */
export function normalize(vec) {
  let sumSq = 0;
  for (let i = 0; i < vec.length; i++) sumSq += vec[i] * vec[i];
  const result = new Float32Array(vec.length);
  if (sumSq === 0) return result;
  const invNorm = 1 / Math.sqrt(sumSq);
  for (let i = 0; i < vec.length; i++) result[i] = vec[i] * invNorm;
  return result;
}

/**
 * Score a vector along a bipolar axis defined by low and high pole vectors.
 * Returns a value in roughly [-1, 1] for normalized inputs:
 *   dot(vec, highPole) - dot(vec, lowPole)
 *
 * @param {Float32Array} vec - The vector to score
 * @param {Float32Array} lowPole - Direction of the low end
 * @param {Float32Array} highPole - Direction of the high end
 * @returns {number}
 */
export function dotAxisScore(vec, lowPole, highPole) {
  return cosineSimilarity(vec, highPole) - cosineSimilarity(vec, lowPole);
}

/**
 * Scale a vector by a scalar factor. Returns a new Float32Array.
 *
 * @param {Float32Array} vec
 * @param {number} factor
 * @returns {Float32Array}
 */
export function scaleVector(vec, factor) {
  const result = new Float32Array(vec.length);
  for (let i = 0; i < vec.length; i++) result[i] = vec[i] * factor;
  return result;
}

/**
 * Compute the L2 magnitude of a vector.
 *
 * @param {Float32Array} vec
 * @returns {number}
 */
export function magnitude(vec) {
  let sumSq = 0;
  for (let i = 0; i < vec.length; i++) sumSq += vec[i] * vec[i];
  return Math.sqrt(sumSq);
}
