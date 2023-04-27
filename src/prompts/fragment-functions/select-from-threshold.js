import * as R from "ramda";

// Returns a modifier function that generates a prompt fragment based on a given value
/*
 * let openEndedDegree = findDegreeModifier(openEnded, [
 *   { threshold: 0.2, degree: 'must not be' },
 *   { threshold: 0.4, degree: 'must be minimally' },
 *   { threshold: 0.6, degree: 'must be somewhat' },
 *   { threshold: 0.8, degree: 'must be very' },
 *   { threshold: 1.0, degree: 'must be extremely' },
 * ]);
 * const openEndedPrompt = `Questions ${openEndedDegree} open-ended. `
 */
export default (value, thresholds = []) => {
  const threshold =
    thresholds.find((t) => value <= t.threshold) || R.last(thresholds);
  return threshold.degree;
};
