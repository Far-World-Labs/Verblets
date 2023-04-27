import stripResponse from '../strip-response/index.js';
import stripNumeric from '../strip-numeric/index.js';

export default (val) => {
  const valLower = stripResponse(val.toLowerCase());
  if (valLower === 'undefined') return undefined;
  const valParsed = +stripNumeric(val);
  if (Number.isNaN(valParsed)) {
    throw new Error(`ChatGPT output [error]`);
  }
  return valParsed;
};
