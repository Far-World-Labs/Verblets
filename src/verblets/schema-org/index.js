import chatGPT from '../../lib/chatgpt/index.js';
import stripResponse from '../../lib/strip-response/index.js';
import { asSchemaOrgText } from '../../prompts/index.js';
import toObject from '../to-object/index.js';

export default async (text, type) => {
  return toObject(stripResponse(await chatGPT(asSchemaOrgText(text, type))));
};
