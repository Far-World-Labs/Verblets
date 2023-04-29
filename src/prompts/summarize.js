import wrapVariable from './wrap-variable.js';

export default (text, instructions = '') => {
  return `Summarize the following content.

${wrapVariable(instructions, {
  forceHTML: true,
  tag: 'summarization-instructions',
})}

${wrapVariable(text, { forceHTML: true, tag: 'content-to-summarize' })}`;
};
