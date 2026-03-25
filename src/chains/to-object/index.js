import Ajv from 'ajv';

import { retryJSONParse } from '../../constants/messages.js';
import { debug } from '../../lib/debug/index.js';
import extractJson from '../../lib/extract-json/index.js';
import callLlm from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import stripResponse from '../../lib/strip-response/index.js';
import { constants as promptConstants, asXML } from '../../prompts/index.js';
import { track } from '../../lib/progress-callback/index.js';
import { nameStep } from '../../lib/context/option.js';

const name = 'to-object';

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

function parseAndValidate(text, schema) {
  try {
    const result = extractJson(stripResponse(text));
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
  if (!error) return;

  debug(`Parse JSON [error]: ${error.message} ${retryJSONParse}`);
  debug(`<prompt attempt=${attempt}${prompt ? '' : ' value="unknown"'} />`);
  if (prompt) {
    debug(`<prompt>\n${prompt}\n</prompt>`);
  }
  debug(`<response>\n${stripResponse(response)}\n</response>`);
  debug(`<error>\n${error}\n</error>`);
}

/**
 * Converts text to structured JSON object using LLM assistance
 */
export default async function toObject(text, schema, config = {}) {
  const runConfig = nameStep(name, { llm: 'fastGood', ...config });
  const span = track(name, runConfig);
  let errorDetails;

  try {
    // First attempt: try direct parsing
    try {
      const directResult = parseAndValidate(text, schema);

      span.result();

      return directResult;
    } catch (error) {
      errorDetails = error.details;
      logDebugInfo(1, null, text, error);
    }

    // Second attempt: use LLM to fix JSON
    try {
      const prompt = buildJsonPrompt(text, schema, errorDetails);
      const response = await retry(() => callLlm(prompt, runConfig), {
        label: 'to-object json fix',
        config: runConfig,
      });

      const result = parseAndValidate(response, schema);

      span.result();

      return result;
    } catch (error) {
      errorDetails = error.details;
      logDebugInfo(2, buildJsonPrompt(text, schema, errorDetails), text, error);
    }

    // Third attempt: final retry with updated errors
    const prompt = buildJsonPrompt(text, schema, errorDetails);
    const response = await retry(() => callLlm(prompt, runConfig), {
      label: 'to-object final retry',
      config: runConfig,
    });

    const result = parseAndValidate(response, schema);
    logDebugInfo(3, prompt, response, null); // Log successful attempt

    span.result();

    return result;
  } catch (err) {
    logDebugInfo(3, buildJsonPrompt(text, schema, errorDetails), text, err);

    span.error(err);

    throw new Error(`Failed to convert to valid JSON after 3 attempts: ${err.message}`);
  }
}
