/**
 * Strip non-numeric characters from a string, preserving numbers and decimal points
 * @param {string} val - The input string to process
 * @returns {string} String containing only numbers and decimal points
 */
export default function stripNumeric(val) {
  // Remove "Answer:" prefix and strip non-numeric characters
  const noAnswer = val.replace(/[aA]nswer:?/, '').trim();
  const onlyNumberParts = noAnswer.replace(/[^0-9.]/g, '').trim();

  return onlyNumberParts;
}
