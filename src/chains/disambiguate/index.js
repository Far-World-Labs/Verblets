import chatGPT from '../../lib/chatgpt/index.js';
import { constants as promptConstants } from '../../prompts/index.js';
import toObject from '../../verblets/to-object/index.js';
import enums from '../../verblets/enum/index.js';

const { onlyJSONStringArray, onlyJSON } = promptConstants;

const sensesPrompt = (term) => `
${onlyJSONStringArray}
List the distinct meanings of the word "${term}" without explanations.
${onlyJSONStringArray}
`;

const chooseSensePrompt = (term, context, senses) => {
  const choices = senses.map((s) => `- ${s}`).join('\n');
  return `
${onlyJSON}
Determine which meaning of "${term}" best fits the context below.
<choices>
${choices}
</choices>
<context>
${context}
</context>
Return an object with "sense" and a short "reason".
${onlyJSON}`;
};

export default async ({ term, context }) => {
  const sensesText = await chatGPT(sensesPrompt(term));
  const senses = await toObject(sensesText);
  const sensesEnum = senses.reduce((acc, s, idx) => ({ ...acc, [s]: idx }), {});
  const senseName = await enums(chooseSensePrompt(term, context, senses), sensesEnum);
  return { term, sense: senseName };
};
