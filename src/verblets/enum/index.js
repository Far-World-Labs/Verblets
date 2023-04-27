import chatGPT from "../../lib/openai/completions.js";
import { asEnum } from "../../prompts/fragment-functions/index.js";
import { stripResponse, toEnum } from "../../response-parsers/index.js";

export default async (text, enumVal) => {
  const enumText = `${text}

${asEnum(enumVal)}`;
  return toEnum(stripResponse(await chatGPT(enumText)), enumVal);
};
