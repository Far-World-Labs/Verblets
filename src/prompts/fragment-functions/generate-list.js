import {
  onlyJSON,
} from '../fragment-texts/index.js';

export default (collectionDescription, { existing=[] }={}) => {
  const existingJoined = existing
        .map(item => `"${item}"`)
        .join(', ');

  return `Generate a list described by "${collectionDescription}".

I already have the following items: \`${existingJoined}\`

Only give me new items I don't already have.

Return the result as a JSON array. ${onlyJSON}`;
};
