import stripResponse from '../strip-response/index.js';

export default (value, enumValue) => {
  const valueStripped = stripResponse(value);
  const valueCleaned = valueStripped.replace(/[^\w\s-_/\\]/gi, '').trim();

  const foundKey = Object.keys(enumValue).find(
    (key) => key.toLowerCase() === valueCleaned.toLowerCase()
  );

  return foundKey || undefined;
};
