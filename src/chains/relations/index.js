import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import chatGPT from '../../lib/chatgpt/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { constants as promptConstants } from '../../prompts/index.js';

const { onlyJSON } = promptConstants;

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const relationResultSchema = JSON.parse(
  readFileSync(join(__dirname, 'relation-result.json'), 'utf8')
);

// ===== Default Instructions =====

const DEFAULT_MAP_INSTRUCTIONS = `Extract relations from each text chunk and return them as JSON.`;

const DEFAULT_FILTER_INSTRUCTIONS = `Extract relations and keep only those matching the criteria.`;

const DEFAULT_FIND_INSTRUCTIONS = `Extract relations and select the most significant one.`;

const DEFAULT_GROUP_INSTRUCTIONS = `Group relations by their predicates, subjects, or patterns.`;

// ===== RDF Literal Parsing =====

/**
 * Parse RDF literal notation to JavaScript primitive
 * @param {string} value - String that may contain RDF literal notation
 * @returns {*} Parsed JavaScript value
 */
export function parseRDFLiteral(value) {
  if (typeof value !== 'string') return value;

  // Check if it's an RDF literal (contains ^^)
  const match = value.match(/^(.+?)\^\^xsd:(.+)$/);
  if (!match) return value;

  const [, literalValue, dataType] = match;

  switch (dataType) {
    case 'integer':
    case 'int':
    case 'decimal':
    case 'float':
    case 'double':
      return +literalValue;

    case 'boolean':
      return literalValue === 'true';

    case 'date':
      return new Date(`${literalValue}T00:00:00Z`);

    case 'dateTime':
      return new Date(literalValue);

    case 'string':
      return literalValue;

    default:
      // Unknown type, return original
      return value;
  }
}

/**
 * Parse relations array to convert RDF literals to JavaScript primitives
 * @param {Array<Object>} relations - Array of relation objects
 * @returns {Array<Object>} Relations with parsed values
 */
export function parseRelations(relations) {
  return relations.map((relation) => ({
    ...relation,
    object: parseRDFLiteral(relation.object),
    // Also parse any metadata values that might be RDF literals
    metadata: relation.metadata
      ? Object.fromEntries(
          Object.entries(relation.metadata).map(([key, value]) => [key, parseRDFLiteral(value)])
        )
      : relation.metadata,
  }));
}

const REDUCE_PROCESS_STEPS = `Consolidate relations across text chunks:
1. Merge duplicate relations - same triple mentioned in different chunks
2. Resolve entity variations - ensure consistent canonical forms
3. Build unified relation set - all unique relations discovered
4. Preserve relation context through metadata`;

const FILTER_PROCESS_STEPS = `Extract relations and filter to keep only those meeting the criteria.`;

const FIND_PROCESS_STEPS = `Extract relations and return the one best matching the selection criteria.`;

const GROUP_PROCESS_STEPS = `Extract relations and group them by patterns, types, or entities involved.`;

// ===== Core Functions =====

/**
 * Generate a relation specification from instructions
 * @param {string|Object} prompt - Natural language relation extraction instructions or config object
 * @param {string} prompt.relations - What relations to extract (if object)
 * @param {Array<Object>} prompt.entities - Pre-identified entities for disambiguation (optional)
 * @param {Array<string>} prompt.predicates - Specific predicates to look for (optional)
 * @param {Object} config - Configuration options
 * @returns {Promise<string>} Relation specification as descriptive text
 */
export async function relationSpec(prompt, config = {}) {
  const { llm, ...rest } = config;

  const specSystemPrompt = `You are a relation specification generator. Create a clear, concise specification for relation extraction.`;

  let instructions, entities, predicates;

  if (typeof prompt === 'string') {
    instructions = prompt;
  } else {
    instructions = prompt.relations || prompt.instructions;
    entities = prompt.entities;
    predicates = prompt.predicates;
  }

  let specUserPrompt = `Analyze these relation extraction instructions and generate a specification.

${asXML(instructions, { tag: 'relation-instructions' })}`;

  if (entities && entities.length > 0) {
    specUserPrompt += `

Use these entities for disambiguation and canonical forms:
${asXML(entities, { tag: 'entities' })}`;
  }

  if (predicates && predicates.length > 0) {
    specUserPrompt += `

Focus on these specific relation types:
${asXML(predicates, { tag: 'predicates' })}`;
  }

  specUserPrompt += `

Provide a specification describing:
- What types of relations to extract
- How to canonicalize entity references
- What predicates to focus on (if any)
- Any metadata to include
- How to handle edge cases

Use natural language, not symbolic identifiers or linked data formats.`;

  const response = await chatGPT(specUserPrompt, {
    llm,
    system: specSystemPrompt,
    ...rest,
  });

  return response;
}

/**
 * Apply relation specification to extract relations from text
 * @param {string} text - Text to extract relations from
 * @param {string} specification - Pre-generated relation specification
 * @param {Object} config - Configuration options
 * @param {Array<Object>} config.entities - Pre-identified entities for disambiguation (optional)
 * @returns {Promise<Object>} Object with relations array
 */
export async function applyRelations(text, specification, config = {}) {
  const { llm, entities, ...options } = config;

  let prompt = `Apply the relation specification to extract relations from this text.

${asXML(specification, { tag: 'relation-specification' })}`;

  if (entities && entities.length > 0) {
    prompt += `

Use these entities for disambiguation and canonical forms:
${asXML(entities, { tag: 'entities' })}`;
  }

  prompt += `

${asXML(text, { tag: 'text' })}

Extract relations according to the specification.
Return a JSON object with an "items" array containing the relations.
Each relation should be a tuple with:
- subject: The subject entity (canonical form)
- predicate: The relationship/predicate
- object: EITHER an entity OR a primitive value:
  - FOR ENTITIES (people, places, organizations, things): use canonical form as plain string
    Examples: "Apple Inc.", "Tim Cook", "San Francisco"
  - FOR PRIMITIVE VALUES: use RDF literal notation:
    * Numbers: 42^^xsd:integer, 3.14^^xsd:decimal, 1.5e10^^xsd:double
    * Booleans: true^^xsd:boolean, false^^xsd:boolean
    * Dates: 2024-01-15^^xsd:date, 2024-01-15T14:30:00Z^^xsd:dateTime
    * Strings (when not entities): plain string or text^^xsd:string for explicit typing
- metadata: Additional context (optional)

IMPORTANT: In the JSON output, write RDF literals WITHOUT quotes around the value part.
Example: {"object": "42^^xsd:integer"} NOT {"object": '"42"^^xsd:integer'}

${onlyJSON}`;

  const response = await chatGPT(prompt, {
    modelOptions: {
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'relation_result',
          schema: relationResultSchema,
        },
      },
    },
    llm,
    ...options,
  });

  // Handle auto-unwrapped response (chatGPT unwraps simple collection schemas)
  // If response is an array, it's already the items array
  if (Array.isArray(response)) {
    return { items: parseRelations(response) };
  }

  // Otherwise handle as normal object with items property
  if (response && response.items) {
    response.items = parseRelations(response.items);
  }

  return response;
}

/**
 * Extract relations from a single text
 * @param {string} text - Text to extract relations from
 * @param {string|Object} instructions - Relation extraction instructions
 * @param {Object} config - Configuration options
 * @returns {Promise<Array>} Array of relation objects
 */
export async function extractRelations(text, instructions, config = {}) {
  const spec = await relationSpec(instructions, config);
  const entities = typeof instructions === 'object' ? instructions.entities : config.entities;
  const result = await applyRelations(text, spec, { ...config, entities });
  return result.items || [];
}

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
 * Create map instructions for relation extraction
 * @param {string|Object} instructions - Relation extraction string or instructions object
 * @param {string} instructions.relations - What relations to extract
 * @param {string} instructions.processing - Additional processing instructions (optional)
 * @param {Array<Object>} instructions.entities - Pre-identified entities (optional)
 * @param {Array<string>} instructions.predicates - Specific predicates to look for (optional)
 * @param {Object} config - Configuration options
 * @param {boolean} config.returnTuple - Return {value, specification} instead of string with property
 * @param {Function} createSpec - Spec generation function (defaults to relationSpec)
 * @returns {Promise<string|Object>} Instructions string with specification property, or tuple if configured
 */
export async function mapInstructions(instructions, config = {}, createSpec = relationSpec) {
  const { returnTuple, ...specConfig } = config;
  const specification = await createSpec(instructions, specConfig);

  let processing;
  if (typeof instructions === 'object' && instructions.processing) {
    processing = instructions.processing;
  }

  let combinedInstructions;
  if (processing) {
    combinedInstructions = `${asXML(processing, { tag: 'processing-instructions' })}

Apply this relation specification:
${asXML(specification, { tag: 'relation-specification' })}

Return a JSON object with an "items" array containing the extracted relations.
Each relation must have: subject (string), predicate (string), object (string), and optional metadata (object).`;
  } else {
    combinedInstructions = `${DEFAULT_MAP_INSTRUCTIONS}

${asXML(specification, { tag: 'relation-specification' })}

Return a JSON object with an "items" array containing the extracted relations.`;
  }

  return createInstructionResult(combinedInstructions, specification, returnTuple);
}

/**
 * Create filter instructions for relation extraction
 * @param {Object} instructions - Instructions object
 * @param {string} instructions.relations - What relations to extract
 * @param {string} instructions.processing - Filter criteria (optional)
 * @param {Array<Object>} instructions.entities - Pre-identified entities (optional)
 * @param {Array<string>} instructions.predicates - Specific predicates to look for (optional)
 * @param {Object} config - Configuration options
 * @param {boolean} config.returnTuple - Return {value, specification} instead of string with property
 * @param {Function} createSpec - Spec generation function (defaults to relationSpec)
 * @returns {Promise<string|Object>} Instructions string with specification property, or tuple if configured
 */
export async function filterInstructions(instructions, config = {}, createSpec = relationSpec) {
  const { returnTuple, ...specConfig } = config;
  const specification = await createSpec(instructions, specConfig);

  const processing = instructions.processing;

  let combinedInstructions;
  if (processing) {
    combinedInstructions = `${asXML(processing, { tag: 'filter-criteria' })}

${FILTER_PROCESS_STEPS}

${asXML(specification, { tag: 'relation-specification' })}`;
  } else {
    combinedInstructions = `${DEFAULT_FILTER_INSTRUCTIONS}

${asXML(specification, { tag: 'relation-specification' })}`;
  }

  return createInstructionResult(combinedInstructions, specification, returnTuple);
}

/**
 * Create reduce instructions for relation extraction
 * @param {Object} instructions - Instructions object
 * @param {string} instructions.relations - What relations to extract
 * @param {string} instructions.processing - How to consolidate relations (optional)
 * @param {Array<Object>} instructions.entities - Pre-identified entities (optional)
 * @param {Array<string>} instructions.predicates - Specific predicates to look for (optional)
 * @param {Object} config - Configuration options
 * @param {boolean} config.returnTuple - Return {value, specification} instead of string with property
 * @param {Function} createSpec - Spec generation function (defaults to relationSpec)
 * @returns {Promise<string|Object>} Instructions string with specification property, or tuple if configured
 */
export async function reduceInstructions(instructions, config = {}, createSpec = relationSpec) {
  const { returnTuple, ...specConfig } = config;
  const specification = await createSpec(instructions, specConfig);

  const defaultProcessing = `Build comprehensive relation graph from all chunks`;
  const processing = instructions.processing || defaultProcessing;

  const combinedInstructions = `${asXML(processing, {
    tag: 'reduce-operation',
  })}

${REDUCE_PROCESS_STEPS}

${asXML(specification, { tag: 'relation-specification' })}`;

  return createInstructionResult(combinedInstructions, specification, returnTuple);
}

/**
 * Create find instructions for relation extraction
 * @param {Object} instructions - Instructions object
 * @param {string} instructions.relations - What relations to extract
 * @param {string} instructions.processing - Selection criteria (optional)
 * @param {Array<Object>} instructions.entities - Pre-identified entities (optional)
 * @param {Array<string>} instructions.predicates - Specific predicates to look for (optional)
 * @param {Object} config - Configuration options
 * @param {boolean} config.returnTuple - Return {value, specification} instead of string with property
 * @param {Function} createSpec - Spec generation function (defaults to relationSpec)
 * @returns {Promise<string|Object>} Instructions string with specification property, or tuple if configured
 */
export async function findInstructions(instructions, config = {}, createSpec = relationSpec) {
  const { returnTuple, ...specConfig } = config;
  const specification = await createSpec(instructions, specConfig);

  const processing = instructions.processing;

  let combinedInstructions;
  if (processing) {
    combinedInstructions = `${asXML(processing, { tag: 'selection-criteria' })}

${FIND_PROCESS_STEPS}

${asXML(specification, { tag: 'relation-specification' })}`;
  } else {
    combinedInstructions = `${DEFAULT_FIND_INSTRUCTIONS}

${asXML(specification, { tag: 'relation-specification' })}`;
  }

  return createInstructionResult(combinedInstructions, specification, returnTuple);
}

/**
 * Create group instructions for relation extraction
 * @param {Object} instructions - Instructions object
 * @param {string} instructions.relations - What relations to extract
 * @param {string} instructions.processing - Grouping strategy (optional)
 * @param {Array<Object>} instructions.entities - Pre-identified entities (optional)
 * @param {Array<string>} instructions.predicates - Specific predicates to look for (optional)
 * @param {Object} config - Configuration options
 * @param {boolean} config.returnTuple - Return {value, specification} instead of string with property
 * @param {Function} createSpec - Spec generation function (defaults to relationSpec)
 * @returns {Promise<string|Object>} Instructions string with specification property, or tuple if configured
 */
export async function groupInstructions(instructions, config = {}, createSpec = relationSpec) {
  const { returnTuple, ...specConfig } = config;
  const specification = await createSpec(instructions, specConfig);

  const processing = instructions.processing;

  let combinedInstructions;
  if (processing) {
    combinedInstructions = `${asXML(processing, { tag: 'grouping-strategy' })}

${GROUP_PROCESS_STEPS}

${asXML(specification, { tag: 'relation-specification' })}`;
  } else {
    combinedInstructions = `${DEFAULT_GROUP_INSTRUCTIONS}

${asXML(specification, { tag: 'relation-specification' })}`;
  }

  return createInstructionResult(combinedInstructions, specification, returnTuple);
}

// ===== Advanced Relation Functions =====

/**
 * Create a relation extraction function with a pre-generated specification
 * @param {string} specification - Pre-generated relation specification
 * @param {Object} config - Configuration options
 * @param {Array<Object>} config.entities - Pre-identified entities for disambiguation (optional)
 * @returns {Function} Relation extraction function with specification property
 */
export function createRelationExtractor(specification, config = {}) {
  const extractorFunction = async function (input) {
    const result = await applyRelations(input, specification, config);
    return result.items || [];
  };

  // Add specification property for introspection
  Object.defineProperty(extractorFunction, 'specification', {
    get() {
      return specification;
    },
    enumerable: true,
  });

  return extractorFunction;
}

/**
 * Original relation extraction function - simple, stateless version
 * @param {string|Object} prompt - Relation extraction instructions
 * @param {Object} config - Configuration options
 * @returns {Function} Relation extraction function
 */
export default function relations(prompt, config = {}) {
  const extractorFunction = async function (input) {
    return await extractRelations(input, prompt, config);
  };

  Object.defineProperty(extractorFunction, 'prompt', {
    get() {
      return prompt;
    },
    enumerable: true,
  });

  return extractorFunction;
}
