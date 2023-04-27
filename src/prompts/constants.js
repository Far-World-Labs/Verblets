const asUndefinedByDefaultText = 'If you are unsure, say "undefined".';

const onlyJSONArrayText = "Output a well-formed JSON array, with no additional text, no punctuation, and no code block.";

export const asBool = `Answer the question either with "true" or "false". ${asUndefinedByDefaultText}`;

export const asNumber = `Answer the question with a number that could be parsed by the JS Number constructor. Do not include units. ${asUndefinedByDefaultText}`;

export const asNumberWithUnits = `Return the answer as JSON of the form "{ "value": 42, "unit": "<SI or other unit name>" }". ${asUndefinedByDefaultText}`;

export const asUndefinedByDefault = asUndefinedByDefaultText;

export const onlyJSON = "Output a well-formed JSON, with no other text and no code block.";

export const onlyJSONArray = onlyJSONArrayText;

export const onlyJSONStringArray = `${onlyJSONArrayText} The array should only contain text. No additional structure.`;
