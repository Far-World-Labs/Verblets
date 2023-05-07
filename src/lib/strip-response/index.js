/*
 * This regex pattern looks for combinations of:
 *
 *   { followed by optional whitespace and ",
 *   [ followed by optional whitespace, {, ", a digit [0-9], or [.
 */
const jsonStartRegex = /(?:\s*[\[{]|[{\[]+\s*[\[{])/;

export default (val) => {
  const [questionPart = '', middle, answerPart = ''] = val.split(/(=){11,29}/);

  const answerSection = answerPart.trim()?.length
    ? answerPart.trim()
    : questionPart.trim();

  const noAnswer = answerSection.replace(/[aA]nswer:?/, '').trim();

  const noPunctuation = noAnswer.replace(/[., ]+$/g, '').trim();

  const noQuotes = noPunctuation
    .replace(/^['"]/, '')
    .replace(/['"]$/, '')
    .trim();

  if (noQuotes.startsWith('{') || noQuotes.startsWith('[')) {
    return noQuotes;
  }

  const match = noQuotes.match(jsonStartRegex);
  const jsonStart = match ? noQuotes.slice(match.index) : undefined;

  return jsonStart ?? noQuotes;
};
