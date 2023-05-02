export default (val) => {
  // eslint-disable-next-line no-unused-vars
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
  return noQuotes;
};
