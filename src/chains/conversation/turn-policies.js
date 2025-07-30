import shuffle from '../../lib/shuffle/index.js';

/**
 * Weighted random sampling with replacement
 * @param {Array} items - Array of items to sample from
 * @param {Array} weights - Array of weights corresponding to items
 * @param {number} count - Number of items to sample
 * @returns {Array} Array of sampled items
 */
function weightedSample(items, weights, count) {
  if (items.length !== weights.length) {
    throw new Error('Items and weights arrays must have the same length');
  }

  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const normalizedWeights = weights.map((weight) => weight / totalWeight);

  // Create cumulative distribution
  const cumulativeWeights = [];
  let cumSum = 0;
  for (const weight of normalizedWeights) {
    cumSum += weight;
    cumulativeWeights.push(cumSum);
  }

  const results = [];
  for (let i = 0; i < count; i++) {
    const random = Math.random();
    const index = cumulativeWeights.findIndex((cumWeight) => random <= cumWeight);
    results.push(items[index]);
  }

  return results;
}

/**
 * Round-robin turn policy - cycles through speakers in order
 * @param {Array} speakers - Array of speaker objects with id property
 * @returns {Function} Turn policy function
 */
export function roundRobin(speakers) {
  return function (round, _history) {
    if (speakers.length === 0) return [];

    const speakerIndex = round % speakers.length;
    return [speakers[speakerIndex].id];
  };
}

/**
 * Probabilistic sampling turn policy - selects speakers based on weights
 * @param {Array} speakers - Array of speaker objects with id property
 * @param {Object} options - Configuration options
 * @param {Array} options.weights - Optional weights for speakers (defaults to equal weights)
 * @param {number} options.minSpeakers - Minimum number of speakers per round (default: 1)
 * @param {number} options.maxSpeakers - Maximum number of speakers per round (default: 3)
 * @returns {Function} Turn policy function
 */
export function probabilisticSampling(speakers, options = {}) {
  const {
    weights = speakers.map(() => 1), // Equal weights by default
    minSpeakers = 1,
    maxSpeakers = 3,
  } = options;

  if (weights.length !== speakers.length) {
    throw new Error('Weights array must match speakers array length');
  }

  return function (_round, _history) {
    if (speakers.length === 0) return [];
    if (speakers.length === 1) return [speakers[0].id];

    const speakerIds = speakers.map((s) => s.id);

    // Random number of speakers between min and max
    const numSpeakers = Math.floor(Math.random() * (maxSpeakers - minSpeakers + 1)) + minSpeakers;

    // Sample speakers using weighted selection
    const selectedSpeakers = weightedSample(speakerIds, weights, numSpeakers);

    return shuffle(selectedSpeakers);
  };
}

/**
 * Default turn policy - uses probabilistic sampling with max 5 speakers
 * @param {Array} speakers - Array of speaker objects
 * @returns {Function} Turn policy function
 */
export function defaultTurnPolicy(speakers) {
  return probabilisticSampling(speakers, { maxSpeakers: 5 });
}
