/*
 * This regex pattern looks for combinations of:
 *
 *   { followed by optional whitespace and ",
 *   [ followed by optional whitespace, {, ", a digit [0-9], or [.
 */
const jsonStartRegex = /(?:\s*[{[]|[{[]+\s*[{[])/;

export default (val) => {
  const [questionPart = '', , answerPart = ''] = val.split(/(=){11,29}/);

  const answerPartTrimmed = answerPart.trim() ?? '';

  const answerSection = answerPartTrimmed.length
    ? answerPart.trim()
    : questionPart.trim();

  const answerNoPrefix = answerSection.replace(/[aA]nswer:?/, '').trim();

  const answerNoPunctuation = answerNoPrefix.replace(/[., ]+$/g, '').trim();

  const answerNoQuotes = answerNoPunctuation
    .replace(/^['"]/, '')
    .replace(/['"]$/, '')
    .trim();

  if (answerNoQuotes.startsWith('{') || answerNoQuotes.startsWith('[')) {
    return answerNoQuotes;
  }

  const match = answerNoQuotes.match(jsonStartRegex);
  const answerJSONStart = match ? answerNoQuotes.slice(match.index) : undefined;

  return answerJSONStart ?? answerNoQuotes;
};
