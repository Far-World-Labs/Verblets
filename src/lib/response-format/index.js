/**
 * Build a responseFormat object for structured JSON output.
 * Wraps a JSON schema in the standard { type, json_schema: { name, schema } } envelope.
 *
 * @param {string} name - Schema name (e.g. 'sort_result', 'filter_decisions')
 * @param {object} schema - JSON Schema object
 * @returns {{ type: 'json_schema', json_schema: { name: string, schema: object } }}
 */
export const jsonSchema = (name, schema) => ({
  type: 'json_schema',
  json_schema: { name, schema },
});

// Helper to detect if a response format schema is a simple collection wrapper
export const isSimpleCollectionSchema = (responseFormat) => {
  const schema = responseFormat?.json_schema?.schema;
  if (!schema || schema.type !== 'object') return false;

  const props = schema.properties;
  const propKeys = Object.keys(props || {});

  // Single 'items' property that's an array
  return propKeys.length === 1 && propKeys[0] === 'items' && props.items?.type === 'array';
};

// Helper to detect if a response format schema is a simple value wrapper
export const isSimpleValueSchema = (responseFormat) => {
  const schema = responseFormat?.json_schema?.schema;
  if (!schema || schema.type !== 'object') return false;

  const props = schema.properties;
  const propKeys = Object.keys(props || {});

  // Single 'value' property
  return propKeys.length === 1 && propKeys[0] === 'value';
};
