import Ajv from 'ajv';

import { debugToObject } from '../../constants/common.js';
import { retryJSONParse } from '../../constants/messages.js';
import chatGPT from '../../lib/chatgpt/index.js';
import stripResponse from '../../lib/strip-response/index.js';
import { constants as promptConstants, wrapVariable } from '../../prompts/index.js';

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
    errorsDisplay = wrapVariable(JSON.stringify(errors) ?? '', {
      tag: 'json-schema-errors--do-not-output',
    });
  }

  let schemaPart = '';
  if (schema) {
    schemaPart = `${contentIsSchema} ${wrapVariable(JSON.stringify(schema), {
      tag: 'json-schema--do-not-output',
    })}`;
  }

  return `${onlyJSON} ${shapeAsJSON}

${schemaPart}

${errorsDisplay}

${contentToJSON} ${wrapVariable(stripResponse(text), { tag: 'content' })}

${onlyJSON}`;
};

export default async (text, schema) => {
  let prompt;
  let result;
  let response = text;
  let errorDetails;

  try {
    result = JSON.parse(stripResponse(response));
    if (schema) {
      const ajv = new Ajv();
      const validate = ajv.compile(schema);
      const isValid = validate(result);

      if (!isValid) {
        throw new ValidationError('Ajv validation failed', validate.errors);
      }
      return result;
    }
    return result;
  } catch (error) {
    errorDetails = error.details;
    if (debugToObject) {
      console.error(`Parse JSON [error]: ${error.message} ${retryJSONParse}`);
      console.error('<prompt attempt=1 value="unknown" />');
      console.error('<response>');
      console.error(stripResponse(response));
      console.error('</response>');
      console.error('<error>');
      console.error(error);
      console.error('</error>');
    }
  }

  try {
    prompt = buildJsonPrompt(response, schema, errorDetails);
    response = await chatGPT(prompt, {
      modelOptions: {
        modelName: 'fastGood',
      },
    });
    result = JSON.parse(stripResponse(response));

    if (schema) {
      const ajv = new Ajv();
      const validate = ajv.compile(schema);
      const isValid = validate(result);

      if (!isValid) {
        throw new ValidationError('Ajv validation failed', validate.errors);
      }
      return result;
    }
  } catch (error) {
    errorDetails = error.details;
    if (debugToObject) {
      console.error(`Parse JSON [error]: ${error.message} ${retryJSONParse}`);
      console.error('<prompt attempt=2>');
      console.error(prompt);
      console.error('</prompt>');
      console.error('<response>');
      console.error(stripResponse(response));
      console.error('</response>');
      console.error('<error>');
      console.error(error);
      console.error('</error>');
    }

    prompt = buildJsonPrompt(response, schema, errorDetails);
    response = await chatGPT(prompt, {
      modelOptions: {
        modelName: 'fastGood',
      },
    });
    result = JSON.parse(stripResponse(response));

    if (debugToObject) {
      console.error(`Parse JSON [error]: ${error.message} ${retryJSONParse}`);
      console.error('<prompt attempt=3>');
      console.error(prompt);
      console.error('</prompt>');
      console.error('<response>');
      console.error(stripResponse(response));
      console.error('</response>');
    }
  }

  return result;
};
