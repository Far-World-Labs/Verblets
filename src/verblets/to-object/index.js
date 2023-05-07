import Ajv from 'ajv';

import { debugToObject } from '../../constants/common.js';
import { retryJSONParse } from '../../constants/messages.js';
import chatGPT from '../../lib/chatgpt/index.js';
import stripResponse from '../../lib/strip-response/index.js';
import {
  constants as promptConstants,
  wrapVariable,
} from '../../prompts/index.js';

const { contentToJSON, onlyJSON, contentIsSchema } = promptConstants;

class ValidationError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

function buildJsonPrompt(text, schema) {
  return `${onlyJSON}

${contentIsSchema} ${wrapVariable(JSON.stringify(schema) ?? 'None given', {
    tag: 'json-schema--do-not-output',
  })}

${contentToJSON} ${wrapVariable(stripResponse(text))}

${onlyJSON}`;
}

function buildSchemaPrompt(text, schema) {
  return `${onlyJSON}

${contentIsSchema} ${wrapVariable(JSON.stringify(schema) ?? 'None given', {
    tag: 'json-schema--do-not-output',
  })}

${contentToJSON} ${wrapVariable(stripResponse(text))}

${onlyJSON}`;
}

export default async (text, schema) => {
  let prompt;
  let result;
  let response = text;

  try {
    result = JSON.parse(stripResponse(response));
    return result;
  } catch (error) {
    if (debugToObject) {
      console.error(`Parse JSON [error]: ${error.message} ${retryJSONParse}`);
      console.error('+++');
      console.error(stripResponse(text));
      console.error(error);
      console.error('+++');
    }
  }

  try {
    prompt = buildJsonPrompt(response, schema);
    response = await chatGPT(prompt);
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
    if (debugToObject) {
      console.error(`Parse JSON [error]: ${error.message} ${retryJSONParse}`);
      console.error('+++');
      console.error(stripResponse(response));
      console.error(error);
      console.error('+++');
    }

    prompt = buildSchemaPrompt(response, schema);
    response = await chatGPT(prompt);
    result = JSON.parse(stripResponse(response));
  }

  return result;
};
