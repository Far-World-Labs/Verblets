import stripResponse from './strip-response.js';
import stripNumeric from './strip-numeric.js';

export default (val) => {
  const valLower = stripResponse(val.toLowerCase());
  if (valLower === 'undefined') return undefined;
  const valParsed = +stripNumeric(val);
  if (Number.isNaN(valParsed)) {
    throw new Error(`ChatGPT output [error]`);
  }
  return valParsed;
};
