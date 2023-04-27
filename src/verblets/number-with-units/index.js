import chatGPT from "../../lib/openai/completions.js";
import { asNumberWithUnits } from "../../prompts/fragment-texts/index.js";
import {
  stripResponse,
  toNumberWithUnits,
} from "../../response-parsers/index.js";

export default async (text) => {
  const numberText = `Question: ${text} \n\n${asNumberWithUnits}`;
  return toNumberWithUnits(stripResponse(await chatGPT(numberText)));
};
