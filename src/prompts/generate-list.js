import { onlyJSONArray } from './constants.js';
import wrapVariable from './wrap-variable.js';

const targetNewItemsCount = 10;

export default (
  description,
  { existing = [], attachments = {}, fixes = '' } = {}
) => {
  const existingJoined = JSON.stringify(existing, null, 2);

  const attachmentsJoined = Object.entries(attachments).map(([key, value]) => {
    return `${key}: ${wrapVariable(value)}
`;
  });

  return `${onlyJSONArray}
You're helping me create a list of: ${wrapVariable(description)}

${attachmentsJoined}

So far, the list contains the following items:
${existingJoined}

Please continue building the list by providing at least ${targetNewItemsCount} more unique items related to the description. Make sure each item is:
- Relevant to the topic
- Not already in the list
- Not a duplicate or a variant of an existing item

More Details:
${fixes}

${onlyJSONArray}`;
};
