// Basic
export const asUndefinedByDefault = 'If you are unsure, say "undefined" as your answer.';
export const asBool = 'Answer the question either with "true" or "false" as your answer.';
export const asNumber =
  'Answer the question with a number that could be parsed by the JS Number constructor. Do not include formatting, units, digit group separators, or spelled-out numbers in your answer.';
export const asDate =
  'Answer the question with a date that can be parsed by the JS Date constructor. ISO format is preferred. Do not include additional text or punctuation.';
export const asJSON =
  'Respond with a JSON object or array that parses with JSON.parse, with no wrapping code block, and no wrapping XML.';
export const asWrappedArrayJSON = 'Return a JSON object with an "items" array property.';
export const asWrappedValueJSON = 'Return a JSON object with a "value" property.';

// Response steering
export const strictFormat = 'You MUST follow the format as described.';
export const tryCompleteData =
  'Provide as much valid data as possible based on available information. Clearly indicate any uncertainties or missing data.';

// JSON Output
export const onlyJSON =
  'Respond with a JSON object or array that parses with JSON.parse, with no other text and no code block.';
const onlyJSONArrayBase =
  'Respond with a JSON array that parses with JSON.parse, with no additional text, no punctuation, and no code block.';
export const onlyJSONArray = onlyJSONArrayBase;
export const onlyJSONStringArray = `${onlyJSONArrayBase} The array should only contain text. No additional structure.`;
export const onlyJSONObjectArray =
  'Return an array of obects--not strings, and not just the objects.';
export const asNumberWithUnits = `${onlyJSON} It should take the form "{ "value": 42, "unit": "<SI or other unit name>" }".`;
export const shapeAsJSON =
  'Even if the input is not JSON, describe as much as possible in a JSON structure that corresponds to the input.';

// Content headers
export const contentIsQuestion = 'Question:';
export const contentIsInstructions = 'Instructions:';
export const contentIsDetails = 'Details:';
export const contentIsFixes = 'Fixes:';
export const contentIsMain = 'Focus all efforts on this content here:';
export const contentToJSON = 'Contents to convert to JSON:';
export const contentIsExample = 'Use this as example output only:';
export const contentIsChoices = 'Choose only from the following:';
export const contentIsTransformationSource = 'Transform the following object:';
export const contentListCriteria = 'Create a list of items with the following description:';
export const contentListItemCriteria = 'Make sure each item meets the following conditions:';
export const contentListToOmit = 'Do not use any of the following items:';
export const contentIsExampleObject =
  'The returned object must look like the following, including all the same properties:';
export const contentIsSchema = 'Make it conform exactly to the following schema:';
export const contentIsSortCriteria = 'Sort the following items by:';
export const contentIsIntent = 'Give me an intent response for the following:';
export const contentIsOperationOption = 'The extracted operation must be one of the following:';
export const contentIsParametersOptions =
  'The extracted parameters must be from the following options:';

// Give explanation
export const explainAndSeparate =
  'Give an explanation followed by a succinct answer. The explanation part should come first, and should be at least 100 words. Next, insert a row of 20 equal signs (=) to create a clear separation.';
export const explainAndSeparateJSON =
  'The content below the dividing line should only be valid JSON that can be parsed with JSON.parse.';
export const explainAndSeparatePrimitive =
  'Next insert the succinctly-stated answer should be below the dividing line and work as a primitive datatype in JS. Be as succinct as possible as it will be parsed by a script.';

// Evidence-Based
export const expertResponse = 'How would an expert in this field respond?';
