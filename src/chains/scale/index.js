import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { scaleSpecificationJsonSchema } from './schemas.js';
import scaleResultSchema from './scale-result.json' with { type: 'json' };
import createProgressEmitter, { scopePhase } from '../../lib/progress/index.js';
import { DomainEvent, Outcome } from '../../lib/progress/constants.js';
import { nameStep } from '../../lib/context/option.js';
import { resolveArgs, resolveTexts } from '../../lib/instruction/index.js';

const name = 'scale';

// ===== Instruction Builder =====

/**
 * Build an instruction bundle for scaling, usable with any collection chain.
 *
 * @param {object} params
 * @param {string|object} params.spec - Pre-generated scale specification
 * @param {string} [params.text] - Override the default instruction text
 * @returns {object} Instruction bundle { text, spec, ...context }
 */
export function scaleInstructions({ spec, text, ...context }) {
  return {
    text: text ?? 'Apply the scale specification to transform each item',
    spec,
    ...context,
  };
}

// ===== Core Functions =====

/**
 * Generate a scale specification from instructions
 * @param {string} prompt - Natural language scaling instructions
 * @param {Object} config - Configuration options
 * @param {number} config.maxAttempts - Max retry attempts (default: 3)
 * @returns {Promise<Object>} Scale specification with domain, range, and mapping
 */
export async function scaleSpec(prompt, config = {}) {
  const runConfig = nameStep('scale:spec', config);
  const specEmitter = createProgressEmitter('scale:spec', runConfig.onProgress, runConfig);
  specEmitter.start();

  try {
    const specSystemPrompt = `You are a scale specification generator. Analyze the scaling instructions and produce a clear, comprehensive specification.`;

    const specUserPrompt = `Analyze these scaling instructions and generate a scale specification.

${asXML(prompt, { tag: 'scaling-instructions' })}

Provide a JSON object with exactly three string properties:
- domain: A single string describing expected input types, formats, and valid ranges
- range: A single string describing output types, formats, and possible values
- mapping: A single string with clear description of how inputs map to outputs, including any formulas, rules, edge cases, and examples

IMPORTANT: Each property must be a simple string value, not a nested object or array.`;

    const response = await retry(
      () =>
        callLlm(specUserPrompt, {
          ...runConfig,
          systemPrompt: specSystemPrompt,
          responseFormat: jsonSchema(
            scaleSpecificationJsonSchema.name,
            scaleSpecificationJsonSchema.schema
          ),
        }),
      {
        label: 'spec',
        config: runConfig,
      }
    );

    if (!response || typeof response !== 'object' || Array.isArray(response)) {
      throw new Error(
        `scale: expected spec object from LLM (got ${response === null ? 'null' : typeof response})`
      );
    }
    for (const field of ['domain', 'range', 'mapping']) {
      if (typeof response[field] !== 'string') {
        throw new Error(`scale: spec.${field} must be a string (got ${typeof response[field]})`);
      }
    }

    specEmitter.complete({ outcome: Outcome.success });

    return response;
  } catch (err) {
    specEmitter.error(err);
    throw err;
  }
}

/**
 * Apply a scale specification to a single item
 * @param {*} item - Item to scale
 * @param {Object} specification - Pre-generated scale specification
 * @param {Object} config - Configuration options
 * @param {number} config.maxAttempts - Max retry attempts (default: 3)
 * @returns {Promise<*>} Scaled value (type depends on specification range)
 */
async function scaleWithSpec(item, spec, config = {}) {
  const runConfig = nameStep('scale:apply', config);

  const prompt = `Apply the scale specification to transform this item.

${asXML(spec, { tag: 'scale-specification' })}

${asXML(item, { tag: 'item' })}

Transform this item according to the specification.
Return a JSON object with a "value" property containing the scaled result.`;

  const response = await retry(
    () =>
      callLlm(prompt, {
        ...runConfig,
        responseFormat: jsonSchema('scale_result', scaleResultSchema),
      }),
    {
      label: 'scale item',
      config: runConfig,
    }
  );

  // Schema declares value as number|string; auto-unwrap returns that value
  // directly. Anything else means the LLM violated the schema or auto-unwrap
  // didn't fire — surface the contract failure rather than propagating
  // undefined/object as the scaled result.
  if (typeof response !== 'number' && typeof response !== 'string') {
    throw new Error(
      `scale: expected number or string from apply LLM (got ${
        response === null ? 'null' : typeof response
      })`
    );
  }

  return response;
}

/**
 * Scale a single item
 * @param {*} item - Item to scale
 * @param {string} instructions - Scaling instructions
 * @param {Object} config - Configuration options
 * @returns {Promise<*>} Scaled value
 */
export default async function scaleItem(item, instructions, config) {
  [instructions, config] = resolveArgs(instructions, config, ['spec']);
  const { text, known, context } = resolveTexts(instructions, ['spec']);
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();

  try {
    emitter.emit({ event: DomainEvent.step, stepName: 'generating-specification' });
    const spec =
      known.spec ||
      (await scaleSpec(context ? `${text}\n\n${context}` : text, {
        ...runConfig,
        onProgress: scopePhase(runConfig.onProgress, 'scale:spec'),
      }));

    emitter.emit({ event: DomainEvent.step, stepName: 'applying-scale', specification: spec });
    const result = await scaleWithSpec(item, spec, {
      ...runConfig,
      onProgress: scopePhase(runConfig.onProgress, 'scale:apply'),
    });

    emitter.complete({ outcome: Outcome.success });
    return result;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

scaleItem.knownTexts = ['spec'];
