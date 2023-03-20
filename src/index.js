import chatGPT from './lib/openai/completions.js';
import getRedis from './lib/redis/index.js';
import {
  asBool,
  asNumber,
  asNumberWithUnits,
  asUndefinedByDefault,
  intent as intentPrompt,
  onlyJSON,
  transform,
} from './prompts/fragment-texts/index.js';
import {
  asEnum,
  asIntent,
  asJSONSchema,
  asSchemaOrgMessage,
  asSchemaOrgType,
  style as stylePrompt,
  summarize as summarizePrompt,
} from './prompts/fragment-functions/index.js';
import generateCollection from './problems/collection-simple/index.js';
import {
  stripNumeric,
  stripResponse,
  toBool,
  toEnum,
  toNumber,
  toNumberWithUnits,
  toObject,
} from './response-parsers/index.js'

export const bool = async (message) => {
  const boolMessage = `Question: ${message} \n\n${asBool}`
  return toBool(stripResponse(await chatGPT(boolMessage)));
};

export const number = async (message) => {
  const numberMessage = `Question: ${message} \n\n${asNumber}`
  return toNumber(await chatGPT(numberMessage));
};

export const numberWithUnits = async (message) => {
  const numberMessage = `Question: ${message} \n\n${asNumberWithUnits}`
  return toNumberWithUnits(await chatGPT(numberMessage));
};

export const enumeration = async (message, enumVal={}) => {
  const enumMessage = `Question: ${message}: ${asEnum(enumVal)}`;
  return toEnum(await chatGPT(enumMessage), enumVal);
};

export const schemaOrg = async (object, type) => {
  return toObject(await chatGPT(asSchemaOrgMessage(object, type), { maxTokens: 1000 }));
};

export const intent = async (message) => {
  return toObject(await chatGPT(`${asIntent(message)}${intentPrompt}`));
};

await bool('Does Mace Windu have a blue lightsaber')
  .then(response => console.log(response))
  .catch(error => console.error(error));

await bool('Does Mace Windu have a purple lightsaber')
  .then(response => console.log(response))
  .catch(error => console.error(error));

await number('What is the height of Everest in feet.')
  .then(response => console.log(response))
  .catch(error => console.error(error));

await numberWithUnits('What is the height of Everest in feet.')
  .then(response => console.log(response))
  .catch(error => console.error(error));

await enumeration('What is the top color on a traffic light', { green: 1, yellow: 1, red: 1, purple: 1})
  .then(response => console.log(response))
  .catch(error => console.error(error));

await schemaOrg('Sofia (location)')
  .then(response => console.log(JSON.stringify(response, null, 2)))
  .catch(error => console.error(error));

await schemaOrg('Sofia (location)', 'Photo')
  .then(response => console.log(JSON.stringify(response, null, 2)))
  .catch(error => console.error(error));

await intent('Give me a flight to Burgas')
  .then(response => console.log(JSON.stringify(response, null, 2)))
  .catch(error => console.error(error));

await intent('Lookup a song by the quote "I just gotta tell you how I\'m feeling"')
  .then(response => console.log(JSON.stringify(response, null, 2)))
  .catch(error => console.error(error));

console.error('Generating a collection. This might take a minute.');

const jsonSchema = toObject(await chatGPT(asJSONSchema(
  'make, model, releaseDate (ISO), maxRange (miles), batteryCapacity (kWH), startingCost (USD)'
)));
const cars = await generateCollection('2021 EV Cars', { jsonSchema });

console.table(cars);

await (await getRedis()).disconnect();
