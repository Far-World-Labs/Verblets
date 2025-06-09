// Basic
export const asUndefinedByDefault = 'If you are unsure, say "undefined" as your answer.';
export const asBool = 'Answer the question either with "true" or "false" as your answer.';
export const asNumber =
  'Answer the question with a number that could be parsed by the JS Number constructor. Do not include formatting, units, digit group separators, or spelled-out numbers in your answer.';
export const asJSON =
  'Respond with a JSON object or array that parses with JSON.parse, with no wrapping code block, and no wrapping XML.';

// Response steering
export const useLineNumber = 'Include the line number where each check is performed.';
export const noFalseInformation = 'Do not include false information.';
export const strictFormat = 'You MUST follow the format as described.';
export const tryCompleteData = 'Err towards giving complete data, even if you have to guess.';

// JSON Output
export const onlyJSON =
  'Respond with a JSON object or array that parses with JSON.parse, with no other text and no code block.';
const onlyJSONArrayBase =
  'Respond with a JSON array that parses with JSON.parse, with no additional text, no punctuation, and no code block.';
export const onlyJSONArray = onlyJSONArrayBase;
export const onlyJSONStringArray = `${onlyJSONArrayBase} The array should only contain text. No additional structure.`;
export const onlyJSONStringArrayPerLine =
  'For each input line, return exactly one line containing a JSON array of strings. No additional text, no code blocks.';
export const onlyJSONObjectArray =
  'Return an array of obects--not strings, and not just the objects.';
export const onlyJSONStringArrayAlt1 = 'Output an JSON array of strings.';
export const asSplitIntoJSONArray = 'Split the following to a JSON array.';
export const onlyFullCode =
  'Output only the full code generated, with no other text and no code block.';
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
export const contentHasIntent = 'What is the intent of the following message:';
export const contentIsSortCriteria = 'Sort the following items by:';

// Give explanation
export const explainAndSeparate =
  'Give an explanation followed by a succinct answer. The explanation part should come first, and should be at least 100 words. Next, insert a row of 20 equal signs (=) to create a clear separation.';
export const explainAndSeparateJSON =
  'The content below the dividing line should only be valid JSON that can be parsed with JSON.parse.';
export const explainAndSeparatePrimitive =
  'Next insert the succinctly-stated answer should be below the dividing line and work as a primitive datatype in JS. Be as succinct as possible as it will be parsed by a script.';

// Reflective
export const thinkStepByStep = "Let's think step by step";
export const identifyUnclearInfo =
  'Identify any unclear or ambiguous information in your response, and rephrase it for clarity.';
export const argueAgainstOutput =
  'Try to argue against your own output and see if you can find any flaws. If so, address them. Walk me through the process';
export const rateBasic =
  'Rate on a scale in the decimal from 0-1 how the content satisfies the following criteria. Be candidly critical and strict in your assessment.';
export const rateSatisfaction =
  'Rate on a scale in the decimal from 0-1 how well you satisfied each point in the initial prompt. Be very critical, no need to justify yourself.';
export const rewriteBasedOnRating = 'If 0.3 or lower, rewrite to address.';
export const requestAdditionalInput =
  'What additional input do you need from me to help you write better output?';
export const summarizeRequest =
  'Please summarise what I am asking for you before you begin your answer.';

// Analytical
export const considerProsCons = 'Consider both pros and cons before arriving at a conclusion.';
export const provideExamples = 'Provide specific examples to illustrate your point.';
export const explainReasoning = 'Explain the reasoning behind your answer.';
export const alternativeSolutions =
  'If there are any alternative solutions or perspectives, please share them.';
export const explainToChild = 'How would you explain this topic to a child?';
export const identifyAssumptions = 'What assumptions are you making?';
export const alternativeInterpretations = 'How else could this be interpreted?';

// Evidence-Based
export const evidenceSupportsView = 'What evidence supports your view?';
export const expertResponse = 'How would an expert in this field respond?';
export const limitationsOfApproach = 'What are the limitations of your approach?';
export const missingInformation = 'What information is still missing?';
export const evaluateDifferingViews = 'How would you evaluate differing views?';
export const confidenceInResponse = 'How confident are you in your response?';
export const lessKnowledgeResponse = 'How would you answer this if you knew less about the topic?';
export const analogyForUnderstanding = 'Come up with an analogy to make this easier to understand.';
