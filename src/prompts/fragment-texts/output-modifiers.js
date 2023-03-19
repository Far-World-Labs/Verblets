const _asUndefinedByDefault = 'If you are unsure, say "undefined".';

const _onlyJSONArray = 'Return the results as a JSON array with no additional text.';

export const asBool = `Answer the question either with "true" or "false". ${_asUndefinedByDefault}`;

export const asNumber = `Answer the question with a number that could be parsed by the JS Number constructor. Do not include units. ${_asUndefinedByDefault}`;

export const asNumberWithUnits = `Return the answer as JSON of the form \"{ "value": 42, "unit": "<SI or other unit name>" }\". ${_asUndefinedByDefault}`;

export const asUndefinedByDefault = _asUndefinedByDefault;

export const onlyJSON = 'Only show the JSON, no other text and no code block.';

export const onlyJSONArray = _onlyJSONArray;

export const onlyJSONStringArray = `${_onlyJSONArray}
The array should only contain text. No additional structure.`;
