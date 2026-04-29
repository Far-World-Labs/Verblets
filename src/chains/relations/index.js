import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { DomainEvent, Outcome } from '../../lib/progress/constants.js';
import { nameStep, getOptions, withPolicy } from '../../lib/context/option.js';
import { resolveArgs, resolveTexts } from '../../lib/instruction/index.js';
import relationResultSchema from './relation-result.json' with { type: 'json' };

const name = 'relations';

// ===== Option Mappers =====

/**
 * Map canonicalization option. Accepts 'low'|'high' or passes through undefined.
 * @param {string|undefined} value
 * @returns {string|undefined} 'low', 'high', or undefined (default moderate)
 */
export const mapCanonicalization = (value) => {
  if (value === undefined) return undefined;
  if (value === 'low' || value === 'med' || value === 'high') return value;
  return undefined;
};

// ===== Instruction Builder =====

/**
 * Build an instruction bundle for relation extraction, usable with any collection chain.
 *
 * @param {object} params
 * @param {string} params.spec - Pre-generated relation specification
 * @param {string} [params.text] - Override the default instruction text
 * @returns {object} Instruction bundle { text, spec, ...context }
 */
export function relationInstructions({ spec, text, ...context }) {
  return {
    text: text ?? 'Extract relations according to the relation specification',
    spec,
    ...context,
  };
}

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

/**
 * Validate the LLM extraction response and unwrap to a plain items array.
 * Throws on malformed shapes — the schema is the contract; silent fallback
 * to [] hides corrupt LLM output and produces garbage downstream.
 */
function parseExtractedRelations(response) {
  const items = Array.isArray(response) ? response : response?.items;
  if (!Array.isArray(items)) {
    throw new Error(
      `relations: expected { items: [] } or array from extraction LLM (got ${typeof response})`
    );
  }
  for (const item of items) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error(`relations: expected relation object in items (got ${typeof item})`);
    }
  }
  return parseRelations(items);
}

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
  const runConfig = nameStep('relations:spec', config);
  const { canonicalization } = await getOptions(runConfig, {
    canonicalization: withPolicy(mapCanonicalization),
  });

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

  if (canonicalization === 'high') {
    specUserPrompt += `\n\nCanonicalization strictness: strict`;
    specUserPrompt += `\n- Enforce exact canonical forms for all entities\n- Normalize variations aggressively (e.g., "Apple Inc.", "Apple", "AAPL" all become one canonical form)\n- Reject ambiguous or partial entity references`;
  } else if (canonicalization === 'low') {
    specUserPrompt += `\n\nCanonicalization strictness: loose`;
    specUserPrompt += `\n- Accept more variation in entity forms\n- Preserve original phrasing when canonical form is uncertain\n- Only canonicalize when entities are clearly identical`;
  }

  specUserPrompt += `

Provide a specification describing:
- What types of relations to extract
- How to canonicalize entity references
- What predicates to focus on (if any)
- Any metadata to include
- How to handle edge cases

Use natural language, not symbolic identifiers or linked data formats.`;

  const response = await retry(
    () =>
      callLlm(specUserPrompt, {
        ...runConfig,
        systemPrompt: specSystemPrompt,
      }),
    {
      label: 'relations-spec',
      config: runConfig,
    }
  );

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
async function extractRelationsWithSpec(text, spec, config = {}) {
  const runConfig = nameStep('relations:apply', config);
  const { canonicalization } = await getOptions(runConfig, {
    canonicalization: withPolicy(mapCanonicalization),
  });
  const { entities } = runConfig;

  let prompt = `Apply the relation specification to extract relations from this text.

${asXML(spec, { tag: 'relation-specification' })}`;

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
Example: {"object": "42^^xsd:integer"} NOT {"object": '"42"^^xsd:integer'}`;

  if (canonicalization === 'high') {
    prompt += `\n\nCanonicalization: STRICT — normalize all entity references to their most common or official canonical form. Merge all variations.`;
  } else if (canonicalization === 'low') {
    prompt += `\n\nCanonicalization: LOOSE — preserve original entity forms from the text. Only merge entities when they are unambiguously identical.`;
  }

  const response = await retry(
    () =>
      callLlm(prompt, {
        ...runConfig,
        responseFormat: jsonSchema('relation_result', relationResultSchema),
      }),
    {
      label: 'relations-apply',
      config: runConfig,
    }
  );

  return { items: parseExtractedRelations(response) };
}

/**
 * Extract relations from a single text
 * @param {string} text - Text to extract relations from
 * @param {string|Object} instructions - Relation extraction instructions
 * @param {Object} config - Configuration options
 * @returns {Promise<Array>} Array of relation objects
 */
export default async function extractRelations(text, instructions, config) {
  [instructions, config] = resolveArgs(instructions, config, ['spec']);
  const { text: instructionText, known, context } = resolveTexts(instructions, ['spec']);
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();

  try {
    const effectiveInstructions = context ? `${instructionText}\n\n${context}` : instructionText;
    const spec = known.spec || (await relationSpec(effectiveInstructions, runConfig));
    emitter.emit({ event: DomainEvent.phase, phase: 'applying-relations', specification: spec });
    const result = await extractRelationsWithSpec(text, spec, runConfig);

    emitter.complete({ outcome: Outcome.success });

    return result.items;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

extractRelations.knownTexts = ['spec'];
