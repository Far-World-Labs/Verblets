import { run } from '../../lib/chatgpt/index.js';
import chatGPT from '../../lib/chatgpt/index.js';
import { asXML } from '../../prompts/wrap-variable.js';

export const anonymizeMethod = {
  STRICT: 'strict',
  BALANCED: 'balanced',
  LIGHT: 'light',
};

const METHODS = Object.values(anonymizeMethod);

// ===== Default Instructions =====

const DEFAULT_MAP_INSTRUCTIONS = `Apply anonymization to each text item and return the anonymized version.`;

const DEFAULT_FILTER_INSTRUCTIONS = `Keep items that contain sensitive information above a moderate threshold.

Note: This evaluates the original text's sensitivity, then returns anonymized versions of filtered items.`;

const DEFAULT_FIND_INSTRUCTIONS = `Select the item with the highest sensitivity score.

Note: This evaluates the original texts, then returns the anonymized version of the selected item.`;

const DEFAULT_GROUP_INSTRUCTIONS = `Group items by sensitivity level (low/medium/high) based on the types of information they contain.`;

const REDUCE_PROCESS_STEPS = `Apply the reduce operation to combine text items, then anonymize the final accumulated result.`;

const FILTER_PROCESS_STEPS = `Evaluate each item's sensitivity to determine which meet the filter criteria.`;

const FIND_PROCESS_STEPS = `Analyze items to identify the one that best matches the selection criteria.`;

const GROUP_PROCESS_STEPS = `Analyze each item to determine its appropriate group based on anonymization needs.`;

// ===== Core Functions =====

/**
 * Generate an anonymization specification from instructions
 * @param {string|Object} prompt - Natural language anonymization instructions or config object
 * @param {string} prompt.method - Anonymization method (strict/balanced/light)
 * @param {string} prompt.context - Additional context for anonymization
 * @param {Object} config - Configuration options
 * @returns {Promise<string>} Anonymization specification as descriptive text
 */
export async function anonymizeSpec(prompt, config = {}) {
  const { llm, ...rest } = config;

  const specSystemPrompt = `You are an anonymization specification generator. Create a clear, concise specification for text anonymization.`;

  let method, context, instructions;

  if (typeof prompt === 'string') {
    instructions = prompt;
  } else {
    method = prompt.method || 'balanced';
    context = prompt.context;
    instructions = prompt.instructions || `Anonymize text using ${method} method`;
  }

  let specUserPrompt = `Analyze these anonymization instructions and generate a specification.

${asXML(instructions, { tag: 'anonymization-instructions' })}`;

  if (method) {
    specUserPrompt += `
    
Method: ${method} (${
      method === 'strict'
        ? 'Maximum anonymization'
        : method === 'balanced'
        ? 'Balanced anonymization'
        : 'Light anonymization'
    })`;
  }

  if (context) {
    specUserPrompt += `

Context: ${context}`;
  }

  specUserPrompt += `

Provide a specification describing:
- What level of anonymization to apply
- What types of information to remove or replace
- How to maintain consistency across texts
- Any special handling requirements

Keep it focused on actionable anonymization rules.`;

  const response = await chatGPT(specUserPrompt, {
    llm,
    system: specSystemPrompt,
    ...rest,
  });

  return response;
}

const validateInput = (input) => {
  if (!input || typeof input !== 'object') {
    throw new Error('Input must be an object');
  }

  const { text, method, context } = input;

  if (!text || typeof text !== 'string') {
    throw new Error('Input must include a text string');
  }

  if (!method || !METHODS.includes(method)) {
    throw new Error(`Method must be one of: ${METHODS.join(', ')}`);
  }

  if (context !== undefined && typeof context !== 'string') {
    throw new Error('Context must be a string if provided');
  }

  return { text, method, context };
};

const stage1Prompt = (text, context) => `
Remove Distinctive Content and Markers
 - Identify and replace every distinctive or uncommon word, phrase, or sentence structure with the most widely used, nondescript alternative.
 - Remove all idioms, metaphors, analogies, cultural references, personal perspectives, and subjective tones.
 - Eliminate any explicit or implicit references to the author's identity, background, education, expertise, region, or intent.

${context ? `Context: ${context}\n` : ''}
Text to process:
${text}

Return ONLY the processed text, with no explanations or additional content.`;

const stage2Prompt = (text, context) => `
Normalize Structure, Formatting, and Tone
 - Restructure sentences and paragraphs to strictly follow standard, average patterns in length, order, and construction. Avoid any distinctive rhythm, complexity, or flow.
 - Uniformly normalize punctuation, formatting, and paragraphing; avoid any variation or emphasis that could signal style.
 - Strip out all emotional, evaluative, or expressive language, enforcing a neutral, impersonal, and objective tone.

 ${context ? `Context: ${context}\n` : ''}
 Text to process:
${text}

Return ONLY the normalized text, with no explanations or additional content.`;

const stage3Prompt = (text, context) => `
Stage 3: Suppress Latent Stylistic Patterns
 - Review for and suppress any recurring linguistic patterns, syntactic habits, or structural quirks—even if they appear common.
 - For all possible ways to phrase content, always select the plainest, most generic, and least distinctive form.
 - Ensure the final text reads as if generated by an automated system, with no evidence of personality, emotion, region, or any unique authorial traits.

 ${context ? `Context: ${context}\n` : ''}
Text to process:
${text}

Return ONLY the final anonymized text, with no explanations or additional content.`;

const anonymize = async (input, config = {}) => {
  const { text, method, context } = validateInput(input);
  const { llm, ...options } = config;

  // Stage 1: Remove distinctive content
  const stage1Result = await run(stage1Prompt(text, method, context), {
    modelOptions: { modelName: 'privacy', ...llm },
    ...options,
  });

  if (method === anonymizeMethod.LIGHT) {
    return {
      text: stage1Result,
      stages: {
        distinctiveContentRemoved: stage1Result,
      },
    };
  }

  // Stage 2: Normalize structure and tone
  const stage2Result = await run(stage2Prompt(stage1Result, method), {
    modelOptions: { modelName: 'privacy', ...llm },
    ...options,
  });

  if (method === anonymizeMethod.BALANCED) {
    return {
      text: stage2Result,
      stages: {
        distinctiveContentRemoved: stage1Result,
        structureNormalized: stage2Result,
      },
    };
  }

  // Stage 3: Suppress stylistic patterns
  const stage3Result = await run(stage3Prompt(stage2Result, method), {
    modelOptions: { modelName: 'privacy', ...llm },
    ...options,
  });

  return {
    text: stage3Result,
    stages: {
      distinctiveContentRemoved: stage1Result,
      structureNormalized: stage2Result,
      patternsSuppressed: stage3Result,
    },
  };
};

// ===== Instruction Builders =====

/**
 * Helper to create instruction with attached specification
 * @param {string} instructions - The instruction string
 * @param {string} specification - The specification text
 * @param {boolean} returnTuple - Whether to return as tuple
 * @returns {string|Object} Instructions with specification attached or tuple
 */
function createInstructionResult(instructions, specification, returnTuple) {
  if (returnTuple) {
    return { value: instructions, specification };
  }
  // Create a String object to allow property attachment
  const instructionString = new String(instructions);
  instructionString.specification = specification;
  return instructionString;
}

/**
 * Create map instructions for anonymization
 * @param {string|Object} instructions - Anonymization instructions or object
 * @param {string} instructions.anonymization - Anonymization instructions (if object)
 * @param {string} instructions.processing - Additional map processing instructions (optional)
 * @param {Object} config - Configuration options
 * @param {boolean} config.returnTuple - Return {value, specification} instead of string with property
 * @param {Function} createSpec - Spec generation function (defaults to anonymizeSpec)
 * @returns {Promise<string|Object>} Instructions string with specification property, or tuple if configured
 */
export async function mapInstructions(instructions, config = {}, createSpec = anonymizeSpec) {
  // Handle backward compatibility - if instructions is a string, use it as anonymization
  const anonymization =
    typeof instructions === 'string' ? instructions : instructions.anonymization;
  const processing = typeof instructions === 'object' ? instructions.processing : null;
  const { returnTuple, ...specConfig } = config;
  const specification = await createSpec(anonymization, specConfig);

  let combinedInstructions;
  if (processing) {
    combinedInstructions = `${asXML(processing, { tag: 'processing-instructions' })}

Apply this anonymization specification to each item:
${asXML(specification, { tag: 'anonymization-specification' })}

Return the anonymized text with any relevant metadata.`;
  } else {
    combinedInstructions = `${DEFAULT_MAP_INSTRUCTIONS}

${asXML(specification, { tag: 'anonymization-specification' })}

Return the anonymized text.`;
  }

  return createInstructionResult(combinedInstructions, specification, returnTuple);
}

/**
 * Create filter instructions for anonymization
 *
 * TODO: The filter chain currently only returns yes/no decisions and filters the original items.
 * It should be refactored to support one-pass filter+operation behavior where filtered items
 * can be transformed before being returned.
 *
 * @param {Object} instructions - Instructions object
 * @param {string} instructions.anonymization - Anonymization instructions
 * @param {string} instructions.processing - Filter criteria (optional - defaults to sensitivity threshold)
 * @param {Object} config - Configuration options
 * @param {boolean} config.returnTuple - Return {value, specification} instead of string with property
 * @param {Function} createSpec - Spec generation function (defaults to anonymizeSpec)
 * @returns {Promise<string|Object>} Instructions string with specification property, or tuple if configured
 */
export async function filterInstructions(instructions, config = {}, createSpec = anonymizeSpec) {
  const { anonymization, processing } = instructions;
  const { returnTuple, ...specConfig } = config;
  const specification = await createSpec(anonymization, specConfig);

  let combinedInstructions;
  if (processing) {
    combinedInstructions = `${asXML(processing, { tag: 'filter-criteria' })}

${FILTER_PROCESS_STEPS}

For items that pass the filter, apply this anonymization:
${asXML(specification, { tag: 'anonymization-specification' })}`;
  } else {
    combinedInstructions = `${DEFAULT_FILTER_INSTRUCTIONS}

For items that pass the filter, apply this anonymization:
${asXML(specification, { tag: 'anonymization-specification' })}`;
  }

  return createInstructionResult(combinedInstructions, specification, returnTuple);
}

/**
 * Create reduce instructions for anonymization
 * @param {Object} instructions - Instructions object
 * @param {string} instructions.anonymization - Anonymization instructions for final result
 * @param {string} instructions.processing - How to reduce/combine the texts
 * @param {Object} config - Configuration options
 * @param {boolean} config.returnTuple - Return {value, specification} instead of string with property
 * @param {Function} createSpec - Spec generation function (defaults to anonymizeSpec)
 * @returns {Promise<string|Object>} Instructions string with specification property, or tuple if configured
 */
export async function reduceInstructions(instructions, config = {}, createSpec = anonymizeSpec) {
  const { anonymization, processing } = instructions;
  const { returnTuple, ...specConfig } = config;
  const specification = await createSpec(anonymization, specConfig);

  const combinedInstructions = `${asXML(processing, { tag: 'reduce-operation' })}

${REDUCE_PROCESS_STEPS}

Apply this anonymization to the final accumulated result:
${asXML(specification, { tag: 'anonymization-specification' })}`;

  return createInstructionResult(combinedInstructions, specification, returnTuple);
}

/**
 * Create find instructions for anonymization
 * @param {Object} instructions - Instructions object
 * @param {string} instructions.anonymization - Anonymization instructions for selected item
 * @param {string} instructions.processing - Selection criteria (optional - defaults to highest sensitivity)
 * @param {Object} config - Configuration options
 * @param {boolean} config.returnTuple - Return {value, specification} instead of string with property
 * @param {Function} createSpec - Spec generation function (defaults to anonymizeSpec)
 * @returns {Promise<string|Object>} Instructions string with specification property, or tuple if configured
 */
export async function findInstructions(instructions, config = {}, createSpec = anonymizeSpec) {
  const { anonymization, processing } = instructions;
  const { returnTuple, ...specConfig } = config;
  const specification = await createSpec(anonymization, specConfig);

  let combinedInstructions;
  if (processing) {
    combinedInstructions = `${asXML(processing, { tag: 'selection-criteria' })}

${FIND_PROCESS_STEPS}

Apply this anonymization to the selected item:
${asXML(specification, { tag: 'anonymization-specification' })}`;
  } else {
    combinedInstructions = `${DEFAULT_FIND_INSTRUCTIONS}

Apply this anonymization to the selected item:
${asXML(specification, { tag: 'anonymization-specification' })}`;
  }

  return createInstructionResult(combinedInstructions, specification, returnTuple);
}

/**
 * Create group instructions for anonymization
 * @param {Object} instructions - Instructions object
 * @param {string} instructions.anonymization - Anonymization instructions for items
 * @param {string} instructions.processing - Grouping strategy (optional - defaults to sensitivity levels)
 * @param {Object} config - Configuration options
 * @param {boolean} config.returnTuple - Return {value, specification} instead of string with property
 * @param {Function} createSpec - Spec generation function (defaults to anonymizeSpec)
 * @returns {Promise<string|Object>} Instructions string with specification property, or tuple if configured
 */
export async function groupInstructions(instructions, config = {}, createSpec = anonymizeSpec) {
  const { anonymization, processing } = instructions;
  const { returnTuple, ...specConfig } = config;
  const specification = await createSpec(anonymization, specConfig);

  let combinedInstructions;
  if (processing) {
    combinedInstructions = `${asXML(processing, { tag: 'grouping-strategy' })}

${GROUP_PROCESS_STEPS}

Apply this anonymization to items within each group:
${asXML(specification, { tag: 'anonymization-specification' })}`;
  } else {
    combinedInstructions = `${DEFAULT_GROUP_INSTRUCTIONS}

Apply this anonymization to items within each group:
${asXML(specification, { tag: 'anonymization-specification' })}`;
  }

  return createInstructionResult(combinedInstructions, specification, returnTuple);
}

// ===== Advanced Anonymization Functions =====

/**
 * Apply anonymization specification to text
 * @param {string} text - Text to anonymize
 * @param {string} specification - Pre-generated anonymization specification
 * @param {Object} config - Configuration options
 * @returns {Promise<Object>} Anonymized result with metadata
 */
export async function applyAnonymization(text, specification, config = {}) {
  const { llm, ...options } = config;

  // Parse the specification to determine method
  const methodMatch = specification.match(/method:\s*(strict|balanced|light)/i);
  const method = methodMatch ? methodMatch[1].toLowerCase() : 'balanced';

  // For now, use the existing anonymize function
  // In a full implementation, this would directly apply the specification
  const result = await anonymize({ text, method }, { llm, ...options });

  return result;
}

/**
 * Create an anonymizer function with a pre-generated specification
 * @param {string} specification - Pre-generated anonymization specification
 * @param {Object} config - Configuration options
 * @returns {Function} Anonymizer function with specification property
 */
export function createAnonymizer(specification, config = {}) {
  const anonymizerFunction = async function (input) {
    const text = typeof input === 'string' ? input : input.text;
    return await applyAnonymization(text, specification, config);
  };

  // Add specification property for introspection
  Object.defineProperty(anonymizerFunction, 'specification', {
    get() {
      return specification;
    },
    enumerable: true,
  });

  return anonymizerFunction;
}

export { anonymize };
export default anonymize;
