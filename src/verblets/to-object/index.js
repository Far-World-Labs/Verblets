import { retryingJSONParse } from '../../constants/messages.js';
import chatGPT from '../../lib/openai/completions.js';
import stripResponse from '../../lib/strip-response/index.js';

import {
  constants as promptConstants,
  wrapVariable,
} from '../../prompts/index.js';

const { contentToJSON, onlyJSON } = promptConstants;

export default async (text) => {
  let response;

  try {
    return JSON.parse(stripResponse(text));
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error(retryingJSONParse);
    }

    const jsonPrompt = `${onlyJSON}

${contentToJSON} ${wrapVariable(stripResponse(text))}

${onlyJSON}`;

    response = await chatGPT(jsonPrompt);

    // might throw
    return JSON.parse(stripResponse(response));
  }
};
