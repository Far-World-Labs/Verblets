import {
  stripResponse,
} from './common.js';

export default (envelope) => {
  const envelopeStripped = stripResponse(envelope);
  let valueExtracted, unitExtracted;
  try {
    const envelopeParsed = JSON.parse(envelopeStripped);
    let { value, unit } = envelopeParsed;
    valueExtracted = value;
    unitExtracted = unit;
  } catch (error) {
    throw new Error(`ChatGPT output [error]: ${error.message}`);
  }

  if (typeof valueExtracted === 'undefined') {
    throw new Error(`ChatGPT output [error]: No number returned in number query.`);
  }
  if (!unitExtracted) {
    throw new Error(`ChatGPT output [error]: No unit returned in number with units query.`);
  }

  let valueParsed;
  if (typeof valueExtracted === 'string') {
    const valueLower = valueExtracted.toLowerCase();
    valueParsed = new Number(stripNumeric(valueExtracted));
  } else if (typeof valueExtracted === 'number') {
    valueParsed = valueExtracted;
  } else if (valueExtracted === 'undefined') {
    valueParsed = undefined;
  } else {
    throw new Error(`ChatGPT output [error]: Bad datatype returned for number query.`);
  }

  if (isNaN(valueParsed)) {
    throw new Error(`ChatGPT output [error]: ${error.message}`);
  }

  return { value: valueParsed, unit: unitExtracted };
};
