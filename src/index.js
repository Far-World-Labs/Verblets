import chatGPT from './completions.js';


// prompt modifiers
const asBool = 'Answer the question either with "true" or "false". If you are unsure, say "undefined".'
const asNumber = 'Answer the question either with a number that could be parsed by the JS Number constructor. If you are unsure, say "undefined".'
const asEnum = (enumVal) => {
  const keys = Object.keys(enumVal);
  const options = keys.map((k, i) => (i === (keys.length - 1)) ? `or ${k}` : `${k}`).join(', ');
  return `${options}. \n\nIf the option doesnt fit, say "undefined".`
}
const stripResponse = (val) => {
  const noAnswer = val.replace(/[aA]nswer:?/, '').trim();
  const noPunctuation = noAnswer.replace(/\.\s+$/, '').trim();
  return noPunctuation;
};
const stripNumeric = (val) => {
  const noAnswer = val.replace(/[aA]nswer:?/, '').trim();
  const onlyNumberParts = noAnswer.replace(/[^0-9.]/g, '').trim();
  return onlyNumberParts;
};

const toBool = (val) => {
  const valLower = stripResponse(val.toLowerCase());
  if (valLower === 'true') return true;
  if (valLower === 'false') return false;
  return undefined;
};

const toNumber = (val) => {
  const valLower = stripResponse(val.toLowerCase());
  if (valLower === 'undefined') return undefined;
  const result = new Number(stripNumeric(val));
  if (isNaN(result)) {
    throw new Error(`TypeError: ${val} is not a number`);
  }
  return result;
};

const toEnum = (val) => {
  const valLower = stripResponse(val.toLowerCase());
  if (valLower === 'undefined') return undefined;
  return stripResponse(val);
};

export const bool = async (message) => {
  const boolMessage = `Question: ${message} \n\n${asBool}`
  return toBool(stripResponse(await chatGPT(boolMessage)));
};

export const number = async (message) => {
  const numberMessage = `Question: ${message} \n\n${asNumber}`
  return toNumber(await chatGPT(numberMessage));
};

export const enumeration = async (message, enumVal={}) => {
  const enumMessage = `Question: ${message}: ${asEnum(enumVal)}`;
  return toEnum(await chatGPT(enumMessage));
};

await bool('Does Mace Windu have a blue lightsaber')
  .then(response => console.log(response))
  .catch(error => console.error(error));

await bool('Does Mace Windu have a purple lightsaber')
  .then(response => console.log(response))
  .catch(error => console.error(error));

await number('What is the height of Everest in feet.', { green: 1, yellow: 1, red: 1, purple: 1})
  .then(response => console.log(response))
  .catch(error => console.error(error));

await enumeration('What is the top color on a traffic light', { green: 1, yellow: 1, red: 1, purple: 1})
  .then(response => console.log(response))
  .catch(error => console.error(error));
