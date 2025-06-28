import { asXML } from './wrap-variable.js';
import { onlyFullCode } from './constants.js';

export default (text, instructions = '') => {
  return `Summarize the following content. ${onlyFullCode}

${asXML(instructions, {
  tag: 'summarization-instructions',
})}

${asXML(text, { tag: 'content-to-summarize' })}`;
};
