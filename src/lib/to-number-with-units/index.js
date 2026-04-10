import stripResponse from '../strip-response/index.js';
import stripNumeric from '../strip-numeric/index.js';

const badDatatypeError = 'Bad datatype returned for number query.';
const valueNotANumberError = 'Value is not a number.';

export default (envelope) => {
  const envelopeStripped = stripResponse(envelope);
  let valueExtracted;
  let unitExtracted;

  if (envelopeStripped === 'undefined') {
    return undefined;
  }

  try {
    const envelopeParsed = JSON.parse(envelopeStripped);
    const { value, unit } = envelopeParsed;
    valueExtracted = value;
    unitExtracted = unit;
  } catch (error) {
    throw new Error(`LLM output [error]: ${error.message}`);
  }

  const unitParsed =
    unitExtracted === 'undefined' || unitExtracted == null ? undefined : unitExtracted;

  let valueParsed;
  if (typeof valueExtracted === 'string') {
    const valueLower = valueExtracted.toLowerCase();
    if (valueLower === 'unanswerable') {
      valueParsed = undefined;
    } else {
      valueParsed = +stripNumeric(valueLower);
    }
  } else if (typeof valueExtracted === 'number') {
    valueParsed = valueExtracted;
  } else if (valueExtracted == null) {
    valueParsed = undefined;
  } else {
    throw new Error(`LLM output [error]: ${badDatatypeError}`);
  }

  if (valueParsed !== undefined && Number.isNaN(valueParsed)) {
    throw new Error(`LLM output [error]: ${valueNotANumberError}`);
  }

  return { value: valueParsed, unit: unitParsed };
};
