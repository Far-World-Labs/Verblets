// Basic Prompts
const asUndefinedByDefaultText = 'If you are unsure, say "undefined".';
const onlyJSONArrayText =
  'Output a well-formed JSON array, with no additional text, no punctuation, and no code block.';
export const asUndefinedByDefault = asUndefinedByDefaultText;
export const asBool = `Answer the question either with "true" or "false". ${asUndefinedByDefaultText}`;
export const asNumber = `Answer the question with a number that could be parsed by the JS Number constructor. Do not include units. ${asUndefinedByDefaultText}`;
export const asNumberWithUnits = `Return the answer as JSON of the form "{ "value": 42, "unit": "<SI or other unit name>" }". ${asUndefinedByDefaultText}`;

// JSON Output Prompts
export const onlyJSON =
  'Output a well-formed JSON, with no other text and no code block.';
export const onlyJSONArray = onlyJSONArrayText;
export const onlyJSONStringArray = `${onlyJSONArrayText} The array should only contain text. No additional structure.`;

// Reflective Prompts
export const thinkStepByStep = `Let's think step by step`;
export const identifyUnclearInfo =
  'Identify any unclear or ambiguous information in your response, and rephrase it for clarity.';
export const argueAgainstOutput =
  'Try to argue against your own output and see if you can find any flaws. If so, address them. Walk me through the process';
export const rateSatisfaction =
  'Rate on a scale from 0-1 (ie. 0.75) how well you satisfied each point in the initial prompt. Be very critical, no need to justify yourself.';
export const rewriteBasedOnRating = 'If 0.3 or lower, rewrite to address.';
export const requestAdditionalInput =
  'What additional input do you need from me to help you write better output?';
export const summarizeRequest =
  'Please summarise what I am asking for you before you begin your answer.';

// Analytical Prompts
export const considerProsCons =
  'Consider both pros and cons before arriving at a conclusion.';
export const provideExamples =
  'Provide specific examples to illustrate your point.';
export const explainReasoning = 'Explain the reasoning behind your answer.';
export const alternativeSolutions =
  'If there are any alternative solutions or perspectives, please share them.';
export const explainToChild = 'How would you explain this topic to a child?';
export const identifyAssumptions = 'What assumptions are you making?';
export const alternativeInterpretations = 'How else could this be interpreted?';

// Evidence-Based Prompts
export const evidenceSupportsView = 'What evidence supports your view?';
export const expertResponse = 'How would an expert in this field respond?';
export const limitationsOfApproach =
  'What are the limitations of your approach?';
export const missingInformation = 'What information is still missing?';
export const evaluateDifferingViews = 'How would you evaluate differing views?';
export const confidenceInResponse = 'How confident are you in your response?';
export const lessKnowledgeResponse =
  'How would you answer this if you knew less about the topic?';
export const analogyForUnderstanding =
  'Come up with an analogy to make this easier to understand.';
