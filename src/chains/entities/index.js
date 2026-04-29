import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import entityResultSchema from './entity-result.json' with { type: 'json' };
import createProgressEmitter, { scopePhase } from '../../lib/progress/index.js';
import { DomainEvent, Outcome } from '../../lib/progress/constants.js';
import { nameStep } from '../../lib/context/option.js';
import { resolveArgs, resolveTexts } from '../../lib/instruction/index.js';
import { expectArray, expectObject, expectString } from '../../lib/expect-shape/index.js';

const name = 'entities';

// ===== Instruction Builder =====

/**
 * Build an instruction bundle for entity extraction, usable with any collection chain.
 *
 * @param {object} params
 * @param {string} params.spec - Pre-generated entity specification
 * @param {string} [params.text] - Override the default instruction text
 * @returns {object} Instruction bundle { text, spec, ...context }
 */
export function entityInstructions({ spec, text, ...context }) {
  return {
    text: text ?? 'Extract entities according to the entity specification',
    spec,
    ...context,
  };
}

// ===== Core Functions =====

/**
 * Generate an entity specification from instructions
 * @param {string} prompt - Natural language entity extraction instructions
 * @param {Object} config - Configuration options
 * @returns {Promise<string>} Entity specification as descriptive text
 */
export async function entitySpec(prompt, config = {}) {
  const runConfig = nameStep('entities:spec', config);

  const specSystemPrompt = `You are an entity specification generator. Create a clear, concise specification for entity extraction.`;

  const specUserPrompt = `Analyze these entity extraction instructions and generate a specification.

${asXML(prompt, { tag: 'entity-instructions' })}

Provide a brief specification describing:
- What types of entities to extract
- Any specific rules or constraints
- How to handle edge cases

Keep it simple and actionable.`;

  const response = await retry(
    () =>
      callLlm(specUserPrompt, {
        ...runConfig,
        systemPrompt: specSystemPrompt,
      }),
    {
      label: 'entities-spec',
      config: runConfig,
    }
  );

  return expectString(response, { chain: 'entities', expected: 'spec from LLM' });
}

/**
 * Apply entity specification to extract entities from text
 * @param {string} text - Text to extract entities from
 * @param {string} specification - Pre-generated entity specification
 * @param {Object} config - Configuration options
 * @returns {Promise<Object>} Object with entities array
 */
async function extractWithSpec(text, spec, config = {}) {
  const runConfig = nameStep('entities:apply', config);

  const prompt = `Apply the entity specification to extract entities from this text.

${asXML(spec, { tag: 'entity-specification' })}

${asXML(text, { tag: 'text' })}

Extract entities according to the specification. Return a JSON object with an "entities" array where each element has exactly two properties:
- "name" (string): The entity name or text as it appears in the source
- "type" (string): The category of entity (e.g. person, company, location, date, concept)

Include every entity that matches the specification. Do not add properties beyond "name" and "type".`;

  const response = await retry(
    () =>
      callLlm(prompt, {
        ...runConfig,
        responseFormat: jsonSchema('entity_result', entityResultSchema),
      }),
    {
      label: 'entities-apply',
      config: runConfig,
    }
  );

  expectObject(response, { chain: 'entities', expected: 'object from extraction LLM' });
  expectArray(response.entities, {
    chain: 'entities',
    expected: 'entities array from extraction LLM',
  });
  return response;
}

/**
 * Extract entities from a single text
 * @param {string} text - Text to extract entities from
 * @param {string} instructions - Entity extraction instructions
 * @param {Object} config - Configuration options
 * @returns {Promise<Object>} Object with entities array
 */
export default async function extractEntities(text, instructions, config) {
  [instructions, config] = resolveArgs(instructions, config, ['spec']);
  const { text: instructionText, known, context } = resolveTexts(instructions, ['spec']);
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();

  try {
    emitter.emit({
      event: DomainEvent.step,
      stepName: 'generating-specification',
      instructions: instructionText,
    });

    const spec =
      known.spec ||
      (await entitySpec(context ? `${instructionText}\n\n${context}` : instructionText, {
        ...runConfig,
        onProgress: scopePhase(runConfig.onProgress, 'spec'),
      }));

    emitter.emit({ event: DomainEvent.step, stepName: 'extracting-entities', specification: spec });

    const result = await extractWithSpec(text, spec, {
      ...runConfig,
      onProgress: scopePhase(runConfig.onProgress, 'apply'),
    });

    emitter.complete({ outcome: Outcome.success });

    return result;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

extractEntities.knownTexts = ['spec'];
