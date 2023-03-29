import chatGPT from '../../lib/openai/completions.js';
import {
  onlyJSON,
} from '../../prompts/fragment-texts/index.js'
import {
  toObject,
} from '../../response-parsers/index.js';

const bestComponentsPrompt = (thing) => `
Enumerate components of '${thing}' at varying granularities, focusing on exceptional internal elements. When multiple alternatives for a part exist, provide a concise (<10 words) summary for each option. Distinguish and list separate items for identical parts that can coexist.

${onlyJSON}
`;

const subComponentsPrompt = (component, thing) => {
  let focus = '';
  if (component) {
    focus = `Enumerate all direct physical and logical subcomponents of '${component}' within '${thing}', including containers or abstract components. Explore deeper layers with follow-up questions, ensuring that no aspect is overlooked.`;
  } else {
    focus = `Enumerate all direct physical and logical subcomponents of '${thing}', including containers or abstract components. Explore deeper layers with follow-up questions, ensuring that no aspect is overlooked.`;
  }

  return `
${focus}

If some parts are subcomponents of others in the list, don't include them.
  For example, don't include President and Presidential cabinet if Executive branch is listed.
The output must not include "${thing}" or "${component}" in the list.
The output must be a flat list, no additional structure.
${onlyJSON}. Output only the JSON. Do not include a code block.
`
};

const componentOptionsPrompt = (component, thing) => `
Considering the '${component}' as a separate component within '${thing}', identify available alternative options or variations specifically for this part. Provide a brief (<10 words) summary for each choice. Focus on ensuring correctness.

You are to make a JSON list of strings.

${onlyJSON}. Output only the JSON. Do not include a code block.
`;

let count = 50;
export default async (thing) => {
  const bestComponents = await chatGPT(bestComponentsPrompt(thing));

  const componentNames = toObject(await chatGPT(subComponentsPrompt(thing)));

  let components = [];
  let partOptionsJSON;
  for (const name of componentNames) {
    try {
      partOptionsJSON = await chatGPT(
        componentOptionsPrompt(name, thing)
      );

      const options = toObject(partOptionsJSON)
        .map(name => ({ name }));

      components.push({
        name,
        options
      });
    } catch (error) {
      console.error(`Dismantle [error]: ${error.message}`, partOptionsJSON)
    }
    console.error(name, partOptionsJSON);
  }

  return {
    name: thing,
    components,
  };
};
