import wrapVariable from './wrap-variable.js';
import { onlyFullCode } from './constants.js';

export default (text, instructions = '') => {
  return `Summarize the following content. ${onlyFullCode}

${wrapVariable(instructions, {
  forceHTML: true,
  tag: 'summarization-instructions',
})}

${wrapVariable(text, { forceHTML: true, tag: 'content-to-summarize' })}`;
};
