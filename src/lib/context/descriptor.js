import { jsonSchema } from '../response-format/index.js';

/**
 * Convert composed context attribute descriptors to a JSON Schema responseFormat
 * suitable for structured LLM output. Each descriptor becomes an enum property.
 *
 * @param {object} descriptors - Keyed by attribute name, each value is { attribute, values, instruction }
 * @param {string} [name='context_population'] - Schema name for the responseFormat wrapper
 * @returns {{ type: 'json_schema', json_schema: { name: string, schema: object } }}
 */
export function descriptorToSchema(descriptors, name = 'context_population') {
  const properties = {};
  const required = [];

  for (const [key, desc] of Object.entries(descriptors)) {
    properties[key] = {
      type: 'string',
      enum: desc.values,
      description: desc.instruction,
    };
    required.push(key);
  }

  return jsonSchema(name, {
    type: 'object',
    properties,
    required,
    additionalProperties: false,
  });
}
