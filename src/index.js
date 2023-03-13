import chatGPT from './completions.js';

// prompt modifiers
const asUndefinedByDefault = 'If you are unsure, say "undefined".';
const asBool = `Answer the question either with "true" or "false". ${asUndefinedByDefault}`;
const asNumber = `Answer the question with a number that could be parsed by the JS Number constructor. Do not include units. ${asUndefinedByDefault}`;
const asNumberWithUnits = `Return the answer as JSON of the form \"{ "value": 42, "unit": "<SI or other unit name>" }\". ${asUndefinedByDefault}`;

const asEnum = (enumVal) => {
  const keys = Object.keys(enumVal);
  const options = keys.map((k, i) => (i === (keys.length - 1)) ? `or ${k}` : `${k}`).join(', ');
  return `${options}. \n\nIf the option doesnt fit, say "undefined".`
}

const onlyJSON = 'Only show the JSON, no other text and no code block.';

const asSchemaOrgType = (type) => type ? `Ensure the type is ${type}. ` : '';
const asSchemaOrgMessage = (object, type) => {
  const typeMessage = asSchemaOrgType(type);
  return `Give me "${object}" in schema.org JSON format with a full set of properties. ${typeMessage}. ${onlyJSON}`;
};

const asIntent = (intent) => `Intent: "${intent}"`;

const intentInstructions = `

Give me an intent response for the above intent.

Ensure the intent is sufficiently abstract.
Include the full list of supplied parameters.
Don't include optional parameters under "parameters" unless they were found when the intent was parsed.

For example:
\`\`\`
{
  "queryText": "show me flights to New York",
  "intent": {
    "displayName": "Flights"
  },
  "parameters": {
    "destination": "New York"
  },
  "optionalParameters": {
    "origin": "",
    "departure_date": "",
    "return_date": "",
    "num_passengers": ""
  },
  "fulfillmentText": "Here are some flights to New York.",
}
\`\`\`

${onlyJSON}
`

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
  const valParsed = new Number(stripNumeric(val));
  if (isNaN(valParsed)) {
    throw new Error(`ChatGPT output [error]: ${error.message}`);
  }
  return valParsed;
};

const toObject = (val) => {
  let valStripped = stripResponse(val);
  let valParsed;
  try {
    valParsed = JSON.parse(valStripped);
  } catch (error) {
    throw new Error(`ChatGPT output [error]: ${error.message}`);
  }
  return valParsed;
};

const toNumberWithUnits = (envelope) => {
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

const toEnum = (value, enumValue) => {
  // Clean up the input by removing whitespace and punctuation
  const valueStripped = stripResponse(value);
  const valueCleaned = valueStripped.replace(/[^\w\s-_\/\\]/gi, '').trim();

  // Map the cleaned input to an enum value
  for (const key of Object.keys(enumValue)) {
    if (key.toLowerCase() === valueCleaned.toLowerCase()) {
      return key;
    }
  }

  return undefined;
};

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
  return toObject(await chatGPT(`${asIntent(message)}${intentInstructions}`));
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
