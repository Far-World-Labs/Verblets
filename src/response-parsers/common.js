export const stripResponse = (val) => {
  const noAnswer = val.replace(/[aA]nswer:?/, '').trim();
  const noPunctuation = noAnswer.replace(/\.\s+$/, '').trim();
  return noPunctuation;
};
