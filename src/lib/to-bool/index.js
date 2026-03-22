import stripResponse from '../strip-response/index.js';

//TODO:DOCS_OBSERVATIONS only handles "true"/"false" — consider adding "yes"/"no", "1"/"0" for broader LLM response coverage
export default (val) => {
  const valLower = stripResponse(val.toLowerCase());
  if (valLower === 'true') return true;
  if (valLower === 'false') return false;
  return undefined;
};
