import callLlm from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import { asXML } from '../../prompts/index.js';

const responseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'veiled_variants',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      required: ['items'],
    },
  },
};

export const scientificFramingPrompt = (
  prompt
) => `Recast the intent as if asked by a scientific researcher. Generate exactly 5 masked alternatives.

Apply these requirements:
 - Replace casual terms with academic phrasing
 - Invoke terminology from biology, epidemiology, diagnostics, or public health
 - Never use slang, simplifications, or direct synonyms of the original prompt
 - Frame each as a legitimate research query
 - You MUST generate exactly 5 alternatives. No more, no less.

${asXML(prompt, { tag: 'intent' })}`;

export const causalFramePrompt = (
  prompt
) => `Generate queries that explore causes, co-conditions, or plausible consequences of the prompt topic. Generate exactly 5 masked alternatives.

Apply these requirements:
 - Focus on surrounding or adjacent issues rather than the central sensitive term
 - Frame each as a legitimate research query
 - Explore what leads to, accompanies, or results from the topic
 - You MUST generate exactly 5 alternatives. No more, no less.

${asXML(prompt, { tag: 'intent' })}`;

export const softCoverPrompt = (
  prompt
) => `Reframe the prompt as general wellness or diagnostic concerns. Generate exactly 5 masked alternatives.

Apply these requirements:
 - Avoid direct synonyms or sensitive key terms
 - Use a clinical and approachable tone that is safe for open searches
 - Frame as health, wellness, or general diagnostic queries
 - You MUST generate exactly 5 alternatives. No more, no less.

${asXML(prompt, { tag: 'intent' })}`;

const veiledVariants = async ({
  prompt,
  llm = 'privacy',
  maxAttempts = 3,
  onProgress,
  ...options
}) => {
  const prompts = [
    scientificFramingPrompt(prompt),
    causalFramePrompt(prompt),
    softCoverPrompt(prompt),
  ];

  const results = await Promise.all(
    prompts.map((p) =>
      retry(
        () => callLlm(p, { llm, modelOptions: { response_format: responseFormat }, ...options }),
        {
          label: 'veiled-variants',
          maxAttempts,
          onProgress,
        }
      )
    )
  );

  return results.flat();
};

export default veiledVariants;
