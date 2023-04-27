import { onlyJSON } from './constants.js';

export default (propertiesDescription) => {
  return `Give me a JSONSchema definition for the following properties: ${propertiesDescription}

Include per-property metadata as JSON comments.

${onlyJSON}`;
};
