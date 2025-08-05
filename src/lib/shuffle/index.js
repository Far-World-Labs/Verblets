/**
 * Shuffle an array using Fisher-Yates algorithm
 * From https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
 *
 * @param {Array} array - Array to shuffle
 * @param {boolean} inPlace - If true, shuffles the array in-place. If false, returns a new shuffled array (default).
 * @returns {Array} The shuffled array
 */
export default function shuffle(array, inPlace = false) {
  const result = inPlace ? array : [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

export { shuffle };
