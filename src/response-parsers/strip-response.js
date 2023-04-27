export default (val) => {
  const noAnswer = val.replace(/[aA]nswer:?/, "").trim();
  const noPunctuation = noAnswer.replace(/\.\s+$/, "").trim();
  const noQuotes = noPunctuation
    .replace(/^['"]/, "")
    .replace(/['"]$/, "")
    .trim();
  return noQuotes;
};
