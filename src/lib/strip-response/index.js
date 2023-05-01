export default (val) => {
  const noAnswer = val.replace(/[aA]nswer:?/, '').trim();
  const noPunctuation = noAnswer.replace(/[., ]+$/g, '').trim();
  const noQuotes = noPunctuation
    .replace(/^['"]/, '')
    .replace(/['"]$/, '')
    .trim();
  return noQuotes;
};
