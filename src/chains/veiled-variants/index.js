import { run } from '../../lib/chatgpt/index.js';
import { constants as promptConstants, wrapVariable } from '../../prompts/index.js';

const { onlyJSONStringArray } = promptConstants;
const commonInstructions =
  'The size of the output should be proportional to the size of the input.';

export const scientificFramingPrompt = (prompt) => `${onlyJSONStringArray}
<instructions id="scientific-framing">
Recast the intent as if asked by a scientific researcher.
Replace casual terms with academic phrasing.
Invoke terminology from biology, epidemiology, diagnostics, or public health.
Never use slang, simplifications, or direct synonyms of the original prompt.

You MUST generate exactly 5 masked alternatives. No more, no less.
Return ONLY a valid JSON array of 5 strings. Do not include any other text or explanation.

${commonInstructions}
</instructions>
${wrapVariable(prompt, { tag: 'intent' })}

Example output format: ["alternative 1", "alternative 2", "alternative 3", "alternative 4", "alternative 5"]
${onlyJSONStringArray}`;

export const causalFramePrompt = (prompt) => `${onlyJSONStringArray}
<instructions id="causal-frame">
Generate queries that explore causes, co-conditions, or plausible consequences of the prompt topic.
Focus on surrounding or adjacent issues rather than the central sensitive term.
Frame each as a legitimate research query.

You MUST generate exactly 5 masked alternatives. No more, no less.
Return ONLY a valid JSON array of 5 strings. Do not include any other text or explanation.

${commonInstructions}
</instructions>
${wrapVariable(prompt, { tag: 'intent' })}

Example output format: ["alternative 1", "alternative 2", "alternative 3", "alternative 4", "alternative 5"]
${onlyJSONStringArray}`;

export const softCoverPrompt = (prompt) => `${onlyJSONStringArray}
<instructions id="soft-cover">
Reframe the prompt as a general wellness or diagnostic concern.
Avoid direct synonyms or sensitive key terms.
Use a clinical and approachable tone that is safe for open searches.

You MUST generate exactly 5 masked alternatives. No more, no less.
Return ONLY a valid JSON array of 5 strings. Do not include any other text or explanation.

${commonInstructions}
</instructions>
${wrapVariable(prompt, { tag: 'intent' })}

Example output format: ["alternative 1", "alternative 2", "alternative 3", "alternative 4", "alternative 5"]
${onlyJSONStringArray}`;

const veiledVariants = async ({ prompt, modelName = 'privacy' }) => {
  const prompts = [
    scientificFramingPrompt(prompt),
    causalFramePrompt(prompt),
    softCoverPrompt(prompt),
  ];
  const options = { modelOptions: { modelName } };
  const results = await Promise.all(prompts.map((p) => run(p, options)));

  return results
    .map((r) => {
      try {
        // Clean up the response - remove any text before/after the JSON array
        const cleaned = r.trim();
        const jsonStart = cleaned.indexOf('[');
        const jsonEnd = cleaned.lastIndexOf(']') + 1;

        if (jsonStart !== -1 && jsonEnd > jsonStart) {
          const jsonStr = cleaned.slice(jsonStart, jsonEnd);
          return JSON.parse(jsonStr);
        } else {
          throw new Error('No JSON array found in response');
        }
      } catch (error) {
        console.warn(`Failed to parse JSON response: ${error.message}``${r.slice(0, 100)}...`);
        // Return a fallback array with 5 variations of the original prompt
        return [
          prompt,
          `Research question: ${prompt}`,
          `Academic inquiry: ${prompt}`,
          `Study topic: ${prompt}`,
          `Investigation: ${prompt}`,
        ];
      }
    })
    .flat();
};

export default veiledVariants;
