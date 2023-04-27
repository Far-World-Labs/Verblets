import wrapVariable from './wrap-variable.js';

export default (
  list = [],
  { introText = 'Consider the following items:' } = {}
) => {
  const listText = list.map((f, i) => ` - ${i + 1}. ${f}`).join('\n');

  let listFragment = wrapVariable('\n');
  if (list.length) {
    listFragment = `${introText} ${wrapVariable(listText)}`;
  }
  return listFragment;
};
