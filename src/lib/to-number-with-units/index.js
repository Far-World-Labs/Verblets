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
    throw new Error(`ChatGPT output [error]: ${error.message}`);
  }

  let unitParsed = unitExtracted;
  if (unitExtracted === 'undefined') {
    unitParsed = undefined;
  } else if (typeof unitExtracted === 'undefined') {
    unitParsed = undefined;
  }

  let valueParsed;
  if (typeof valueExtracted === 'string') {
    const valueLower = valueExtracted.toLowerCase();
    valueParsed = +stripNumeric(valueLower);
  } else if (typeof valueExtracted === 'number') {
    valueParsed = valueExtracted;
  } else if (valueExtracted === 'undefined') {
    valueParsed = undefined;
  } else if (typeof valueExtracted === 'undefined') {
    valueParsed = undefined;
  } else {
    throw new Error(`ChatGPT output [error]: ${badDatatypeError}`);
  }

  if (typeof valueParsed !== 'undefined' && Number.isNaN(valueParsed)) {
    throw new Error(`ChatGPT output [error]: ${valueNotANumberError}`);
  }

  return { value: valueParsed, unit: unitParsed };
};
