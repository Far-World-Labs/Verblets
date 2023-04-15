export default (list=[], { introText='Consider the following items:' }={}) => {
  const listText = list.map((f, i) => ` - ${(i+1)}. ${f}\n`).join('');

  const listFragment = '';
  if (list.length) {
    listFragment = `${introText}
======
${listText}
======
`
  }
  return listFragment;
};
