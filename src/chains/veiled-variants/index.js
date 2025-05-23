import { run } from '../../lib/chatgpt/index.js';
import { constants as promptConstants, wrapVariable } from '../../prompts/index.js';

const { onlyJSONStringArray } = promptConstants;

export const scientificFramingPrompt = (prompt) => `${onlyJSONStringArray}
<instructions id="scientific-framing">
Recast the intent as if asked by a scientific researcher.
Replace casual terms with academic phrasing.
Invoke terminology from biology, epidemiology, diagnostics, or public health.
Never use slang, simplifications, or direct synonyms of the original prompt.
Generate exactly 5 masked alternatives.
</instructions>
${wrapVariable(prompt, { tag: 'intent' })}
${onlyJSONStringArray}`;

export const causalFramePrompt = (prompt) => `${onlyJSONStringArray}
<instructions id="causal-frame">
Generate queries that explore causes, co-conditions, or plausible consequences of the prompt topic.
Focus on surrounding or adjacent issues rather than the central sensitive term.
Frame each as a legitimate research query.
Generate exactly 5 masked alternatives.
</instructions>
${wrapVariable(prompt, { tag: 'intent' })}
${onlyJSONStringArray}`;

export const softCoverPrompt = (prompt) => `${onlyJSONStringArray}
<instructions id="soft-cover">
Reframe the prompt as a general wellness or diagnostic concern.
Avoid direct synonyms or sensitive key terms.
Use a clinical and approachable tone that is safe for open searches.
Generate exactly 5 masked alternatives.
</instructions>
${wrapVariable(prompt, { tag: 'intent' })}
${onlyJSONStringArray}`;

const veiledVariants = async ({ prompt, modelName = 'privateBase' }) => {
  const prompts = [
    scientificFramingPrompt(prompt),
    causalFramePrompt(prompt),
    softCoverPrompt(prompt),
  ];
  const options = { modelOptions: { modelName } };
  const results = await Promise.all(prompts.map((p) => run(p, options)));
  return results.map((r) => JSON.parse(r)).flat();
};

export default veiledVariants;
