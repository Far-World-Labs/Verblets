import stripResponse from '../strip-response/index.js';

export default (value, enumValue) => {
  // Clean up the input by removing whitespace and punctuation
  const valueStripped = stripResponse(value);
  const valueCleaned = valueStripped.replace(/[^\w\s-_/\\]/gi, '').trim();

  // Map the cleaned input to an enum value
  const foundKey = Object.keys(enumValue).find(
    (key) => key.toLowerCase() === valueCleaned.toLowerCase()
  );

  return foundKey || undefined;
};
