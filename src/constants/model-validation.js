/**
 * Model Definition Validation
 */

import Ajv from 'ajv';
import modelDefinitionSchema from './model-definition-schema.json';

const ajv = new Ajv();
const validate = ajv.compile(modelDefinitionSchema);

export function assertValidModelDef(key, def) {
  // Materialize getters into a plain object for validation
  // Note: apiKey is not validated since it may not be available at module load time
  const materialized = {
    name: def.name,
    endpoint: def.endpoint,
    maxContextWindow: def.maxContextWindow,
    maxOutputTokens: def.maxOutputTokens,
    requestTimeout: def.requestTimeout,
    apiUrl: def.apiUrl,
  };

  // Validate the materialized object
  if (!validate(materialized)) {
    const errors = validate.errors
      .map((e) => `${e.instancePath || 'root'}${e.instancePath ? ': ' : ''}${e.message}`)
      .join(', ');
    throw new Error(`Model '${key}' invalid: ${errors}`);
  }
}
