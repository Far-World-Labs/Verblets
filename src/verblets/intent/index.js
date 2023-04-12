import chatGPT from '../../lib/openai/completions.js';
import {
  intent as intentPrompt,
} from '../../prompts/fragment-texts/index.js';
import {
  asIntent,
} from '../../prompts/fragment-functions/index.js';
import {
 stripResponse,
 toObject,
} from '../../response-parsers/index.js';

export default async (text) => {
  return toObject(stripResponse(
    await chatGPT(`${asIntent(text)}${intentPrompt}`)
  ));
};
