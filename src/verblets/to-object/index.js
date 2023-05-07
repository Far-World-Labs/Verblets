import Ajv from 'ajv';

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

export default async (text, schema) => {
  let response;

  try {
    const result = JSON.parse(stripResponse(text));
    if (schema) {
      const ajv = new Ajv();
      const validate = ajv.compile(schema);

      const isValid = validate(result);
      if (!isValid) {
        throw new ValidationError(`AJV validation failed`, validate.errors);
      }
    }
    return result;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`Parse JSON [error]: ${error.message} ${retryJSONParse}`);
      console.error('+++');
      console.error(stripResponse(text));
      console.error('+++');
    }

    const jsonPrompt = `${onlyJSON}

${contentIsSchema} ${wrapVariable(JSON.stringify(schema) ?? 'None given', {
      tag: 'schema',
    })}

${contentToJSON} ${wrapVariable(stripResponse(text))}

${onlyJSON}`;

    response = await chatGPT(jsonPrompt);

    // might throw
    return JSON.parse(stripResponse(response));
  }
};
