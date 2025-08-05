import Ajv from 'ajv';

import { debugToObject } from '../../constants/common.js';
import { retryJSONParse } from '../../constants/messages.js';
import chatGPT from '../../lib/chatgpt/index.js';
import stripResponse from '../../lib/strip-response/index.js';
import { constants as promptConstants, asXML } from '../../prompts/index.js';

const { contentIsSchema, contentToJSON, onlyJSON, shapeAsJSON } = promptConstants;

class ValidationError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

const buildJsonPrompt = function (text, schema, errors) {
  let errorsDisplay = '';
  if (errors?.length) {
    errorsDisplay = asXML(JSON.stringify(errors) ?? '', {
      tag: 'json-schema-errors--do-not-output',
    });
  }

  let schemaPart = '';
  if (schema) {
    schemaPart = `${contentIsSchema} ${asXML(JSON.stringify(schema), {
      tag: 'json-schema--do-not-output',
    })}`;
  }

  return `${onlyJSON} ${shapeAsJSON}

${schemaPart}

${errorsDisplay}

${contentToJSON} ${asXML(stripResponse(text), { tag: 'content' })}

${onlyJSON}`;
};

/**
 * Validates JSON against schema if provided
 */
function validateWithSchema(result, schema) {
  if (!schema) return result;

  const ajv = new Ajv();
  const validate = ajv.compile(schema);
  const isValid = validate(result);

  if (!isValid) {
    throw new ValidationError('Schema validation failed', validate.errors);
  }
  return result;
}

/**
 * Attempts to parse and validate JSON with error handling
 */
function parseAndValidate(text, schema) {
  try {
    const result = JSON.parse(stripResponse(text));
    return validateWithSchema(result, schema);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new Error(`JSON parsing failed: ${error.message}`);
  }
}

/**
 * Logs debug information for failed attempts
 */
function logDebugInfo(attempt, prompt, response, error) {
  if (!debugToObject) return;

  console.error(`Parse JSON [error]: ${error.message} ${retryJSONParse}`);
  console.error(`<prompt attempt=${attempt}${prompt ? '' : ' value="unknown"'} />`);
  if (prompt) {
    console.error('<prompt>');
    console.error(prompt);
    console.error('</prompt>');
  }
  console.error('<response>');
  console.error(stripResponse(response));
  console.error('</response>');
  console.error('<error>');
  console.error(error);
  console.error('</error>');
}

/**
 * Converts text to structured JSON object using LLM assistance
 */
export default async function toObject(text, schema, config = {}) {
  const { llm, ...options } = config;
  let errorDetails;

  // First attempt: try direct parsing
  try {
    return parseAndValidate(text, schema);
  } catch (error) {
    errorDetails = error.details;
    logDebugInfo(1, null, text, error);
  }

  // Second attempt: use LLM to fix JSON
  try {
    const prompt = buildJsonPrompt(text, schema, errorDetails);
    const response = await chatGPT(prompt, {
      modelOptions: { modelName: 'fastGood', ...llm },
      ...options,
    });

    const result = parseAndValidate(response, schema);
    return result;
  } catch (error) {
    errorDetails = error.details;
    logDebugInfo(2, buildJsonPrompt(text, schema, errorDetails), text, error);
  }

  // Third attempt: final retry with updated errors
  try {
    const prompt = buildJsonPrompt(text, schema, errorDetails);
    const response = await chatGPT(prompt, {
      modelOptions: { modelName: 'fastGood', ...llm },
      ...options,
    });

    const result = parseAndValidate(response, schema);
    logDebugInfo(3, prompt, response, null);
    return result;
  } catch (error) {
    logDebugInfo(3, buildJsonPrompt(text, schema, errorDetails), text, error);
    throw new Error(`Failed to convert to valid JSON after 3 attempts: ${error.message}`);
  }
}
