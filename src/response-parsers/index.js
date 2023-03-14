import { stripResponse as _stripResponse } from './common.js';
import _toNumberWithUnits from './to-number-with-units.js';

export const stripNumeric = (val) => {
  const noAnswer = val.replace(/[aA]nswer:?/, '').trim();
  const onlyNumberParts = noAnswer.replace(/[^0-9.]/g, '').trim();
  return onlyNumberParts;
};

export const stripResponse = _stripResponse;

export const toBool = (val) => {
  const valLower = _stripResponse(val.toLowerCase());
  if (valLower === 'true') return true;
  if (valLower === 'false') return false;
  return undefined;
};

export const toEnum = (value, enumValue) => {
  // Clean up the input by removing whitespace and punctuation
  const valueStripped = _stripResponse(value);
  const valueCleaned = valueStripped.replace(/[^\w\s-_\/\\]/gi, '').trim();

  // Map the cleaned input to an enum value
  for (const key of Object.keys(enumValue)) {
    if (key.toLowerCase() === valueCleaned.toLowerCase()) {
      return key;
    }
  }

  return undefined;
};

export const toNumber = (val) => {
  const valLower = _stripResponse(val.toLowerCase());
  if (valLower === 'undefined') return undefined;
  const valParsed = new Number(stripNumeric(val));
  if (isNaN(valParsed)) {
    throw new Error(`ChatGPT output [error]: ${error.message}`);
  }
  return valParsed;
};

export const toNumberWithUnits = _toNumberWithUnits;

export const toObject = (val) => {
  let valStripped = _stripResponse(val);
  let valParsed;
  try {
    valParsed = JSON.parse(valStripped);
  } catch (error) {
    throw new Error(`ChatGPT output [error]: ${error.message}`);
  }
  return valParsed;
};
