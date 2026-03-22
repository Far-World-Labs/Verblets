import stripResponse from '../strip-response/index.js';

export default (val) => {
  const valLower = stripResponse(val.toLowerCase());
  if (valLower === '1') return true;
  if (valLower === '0') return false;
  if (valLower === 'yes') return true;
  if (valLower === 'no') return false;
  if (valLower === 'true') return true;
  if (valLower === 'false') return false;
  return undefined;
};
