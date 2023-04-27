import chatGPT from '../../lib/openai/completions.js';
import stripResponse from '../../lib/strip-response/index.js';
import {
  constants as promptConstants,
  wrapVariable,
} from '../../prompts/index.js';

const { onlyJSON } = promptConstants;

export default async (text) => {
  let response;

  try {
    return JSON.parse(stripResponse(text));
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        'Retrying JSON.parse. This usually can be avoided with modifications to your prompt. This message only appears in dev.'
      );
    }

    const jsonPrompt = `${onlyJSON}

Contents to convert to JSON: ${wrapVariable(stripResponse(text))}

${onlyJSON}`;

    response = await chatGPT(jsonPrompt);

    // might throw
    return JSON.parse(stripResponse(response));
  }
};
