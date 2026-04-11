// ── Output Format ──────────────────────────────────────────────────────
// Prefer responseFormat with JSON schemas for structured output.
// These remain useful when you need lightweight format steering inside
// free-form prompts or when appending to user-supplied instructions.

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
export const asNumberWithUnits =
  'Respond with a JSON object that parses with JSON.parse, with no other text and no code block. It should take the form "{ "value": 42, "unit": "<SI or other unit name>" }".';

export const onlyJSON =
  'Respond with a JSON object or array that parses with JSON.parse, with no other text and no code block.';
const onlyJSONArrayBase =
  'Respond with a JSON array that parses with JSON.parse, with no additional text, no punctuation, and no code block.';
export const onlyJSONArray = onlyJSONArrayBase;
export const onlyJSONStringArray = `${onlyJSONArrayBase} The array should only contain text. No additional structure.`;
export const onlyJSONObjectArray =
  'Return an array of objects — not strings, and not just the objects.';
export const shapeAsJSON =
  'Even if the input is not JSON, describe as much as possible in a JSON structure that corresponds to the input.';

// ── Response Steering ─────────────────────────────────────────────────
// Short directives to shape how the model approaches the task.

export const strictFormat = 'You MUST follow the format as described.';
export const tryCompleteData =
  'Provide as much valid data as possible based on available information. Clearly indicate any uncertainties or missing data.';
export const useLineNumber = 'Include the line number where each check is performed.';
export const noFabrication = 'Do not fabricate facts. When uncertain, say so rather than guessing.';

// ── Content Headers ───────────────────────────────────────────────────
// Standard labels for separating sections in multi-part prompts.

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
export const contentIsIntent = 'Give me an intent response for the following:';
export const contentIsOperationOption = 'The extracted operation must be one of the following:';
export const contentIsParametersOptions =
  'The extracted parameters must be from the following options:';

// ── Explanation + Separator ───────────────────────────────────────────
// For prompts that need a human-readable explanation above and a
// machine-parseable answer below a divider.

export const explainAndSeparate =
  'Give an explanation followed by a succinct answer. The explanation part should come first, and should be at least 100 words. Next, insert a row of 20 equal signs (=) to create a clear separation.';
export const explainAndSeparateJSON =
  'The content below the dividing line should only be valid JSON that can be parsed with JSON.parse.';
export const explainAndSeparatePrimitive =
  'Next insert the succinctly-stated answer should be below the dividing line and work as a primitive datatype in JS. Be as succinct as possible as it will be parsed by a script.';

// ── Reasoning & Process ───────────────────────────────────────────────
// Append to prompts when you want the model to show its work, break
// problems into steps, or confirm understanding before answering.

export const thinkStepByStep = 'Think through this step by step.';
export const summarizeRequest =
  'First restate the request in your own words, then provide your answer.';
export const identifyAssumptions = 'State any assumptions you are making before answering.';
export const explainReasoning = 'Explain the reasoning behind your answer.';

// ── Self-Critique & Verification ──────────────────────────────────────
// Prompt the model to review, score, or challenge its own output.
// Useful in multi-turn chains where quality gates matter.

export const argueAgainstOutput =
  'Try to find flaws in your own output. If you find any, address them.';
export const identifyUnclearInfo =
  'Identify any unclear or ambiguous information in your response, and rephrase it for clarity.';
export const rateConfidence =
  'Rate your confidence in this response on a 0–1 scale. Be candidly critical.';
export const rateSatisfaction =
  'Rate on a 0–1 scale how well your output satisfied each point in the original prompt. Be strict.';
export const rewriteIfWeak = 'If your confidence is 0.3 or lower, rewrite to address the gaps.';

// ── Depth & Breadth ───────────────────────────────────────────────────
// Modifiers that widen or deepen the analysis.

export const considerProsCons = 'Consider both pros and cons before arriving at a conclusion.';
export const alternativeSolutions =
  'If there are alternative solutions or perspectives, include them.';
export const provideExamples = 'Provide specific examples to illustrate your point.';
export const analogyForUnderstanding = 'Use an analogy to make this easier to understand.';
export const expertResponse = 'How would an expert in this field respond?';
export const explainSimply = 'Explain this so a non-expert can understand it.';
export const alternativeInterpretations = 'How else could this be interpreted?';

// ── Epistemic Honesty ─────────────────────────────────────────────────
// For prompts where you need the model to be transparent about what it
// knows, what it doesn't, and the limits of its answer.

export const evidenceSupportsView = 'What evidence supports your view?';
export const limitationsOfApproach = 'What are the limitations of this approach?';
export const missingInformation = 'What information is still missing?';
export const evaluateDifferingViews = 'How would you evaluate differing views on this?';
export const requestAdditionalInput = 'What additional input would help you give a better answer?';
