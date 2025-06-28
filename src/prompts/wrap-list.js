import { asXML } from './wrap-variable.js';

export default (list = [], { introText = 'Consider the following items:' } = {}) => {
  const listText = list.map((f, i) => ` - ${i + 1}. ${f}`).join('\n');

  let listFragment = asXML('\n');
  if (list.length) {
    listFragment = `${introText} ${asXML(listText)}`;
  }
  return listFragment;
};
