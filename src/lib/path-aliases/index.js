const defaultDelimiter = "/";

/**
 * Splits sequences using the given delimiter.
 * @param {string[]} sequences - An array of strings.
 * @param {string} delimiter - Delimiter to split the sequences.
 * @returns {string[][]} - An array of split sequences.
 */
const splitSequences = (sequences, delimiter = defaultDelimiter) =>
  sequences.map((sequence) => sequence.split(delimiter));

/**
 * Creates unique sequence tails for the given sequences.
 * @param {string[]} sequences - An array of strings.
 * @param {string} delimiter - Delimiter to split and join the sequences.
 * @returns {Object} - An object mapping the original path to its unique tail.
 */
export default (sequences, delimiter = defaultDelimiter) => {
  const splitSequencesList = splitSequences(sequences, delimiter);
  const tailsUnique = {};

  sequences.forEach((sequence, index) => {
    const splitSequence = splitSequencesList[index];

    for (let i = 1; i <= splitSequence.length; i += 1) {
      const tail = splitSequence.slice(-i).join(delimiter);
      const conflictingSequences = sequences.filter((seq) =>
        seq.endsWith(tail)
      );

      if (conflictingSequences.length === 1) {
        tailsUnique[sequence] = tail;
        break;
      }
    }
  });

  return tailsUnique;
};
