import {
  contentIsQuestion,
  contentListToOmit,
  expertResponse,
  onlyJSONStringArrayAlt1,
} from './constants.js';
import { asXML } from './wrap-variable.js';

export default (text, { existing = [] } = {}) => {
  const existingJoined = existing.map((item) => `"${item}"`).join(', ');

  return `Instead of answering the following question, I would like you to generate additional questions. Consider interesting perspectives. Consider what information is unknown. ${expertResponse}. Overall, just come up with good questions.

${contentIsQuestion} ${text}

${contentListToOmit} ${asXML(existingJoined, { tag: 'omitted' })}

${onlyJSONStringArrayAlt1} One question per string.`;
};
