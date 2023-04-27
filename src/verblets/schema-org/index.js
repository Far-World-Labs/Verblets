import chatGPT from "../../lib/openai/completions.js";
import { asSchemaOrgText } from "../../prompts/fragment-functions/index.js";
import { stripResponse } from "../../response-parsers/index.js";
import toObject from "../to-object/index.js";

export default async (text, type) => {
  return toObject(
    stripResponse(
      await chatGPT(asSchemaOrgText(text, type), { maxTokens: 1000 })
    )
  );
};
