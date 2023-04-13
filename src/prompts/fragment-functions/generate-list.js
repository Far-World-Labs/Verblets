import {
  onlyJSONArray,
} from '../fragment-texts/index.js';

export default (description, { existing=[], fixes='' }={}) => {
  const existingJoined = JSON.stringify(existing, null, 2);

  return `${onlyJSONArray}

You're helping me create a list of "${description}". So far, the list contains the following items:
${existingJoined}

Please continue building the list by providing 5 more unique items related to "${description}". Make sure each item is:
- Relevant to the topic
- Not already in the list
- Not a duplicate or a variant of an existing item

More Details:
${fixes}

${onlyJSONArray}`;
};
