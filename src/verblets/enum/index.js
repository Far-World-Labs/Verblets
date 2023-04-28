import chatGPT from '../../lib/chatgpt/index.js';
import stripResponse from '../../lib/strip-response/index.js';
import toEnum from '../../lib/to-enum/index.js';
import { asEnum } from '../../prompts/index.js';

export default async (text, enumVal) => {
  const enumText = `${text}

${asEnum(enumVal)}`;
  return toEnum(stripResponse(await chatGPT(enumText)), enumVal);
};
