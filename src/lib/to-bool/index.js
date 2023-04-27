import stripResponse from '../strip-response/index.js';

export default (val) => {
  const valLower = stripResponse(val.toLowerCase());
  if (valLower === 'true') return true;
  if (valLower === 'false') return false;
  return undefined;
};
