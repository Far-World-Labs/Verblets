import callLlm from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import popReferenceSchema from './pop-reference-result.json';
import { getOptions, scopeOperation } from '../../lib/context/option.js';

const popReferenceResponseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'pop_reference_result',
    schema: popReferenceSchema,
  },
};

/**
 * Find pop culture references that metaphorically match given sentences
 * @param {string} sentence - The sentence to metaphorically compare
 * @param {string} description - A descriptor guiding tone, intent, or interpretive nuance
 * @param {Object} config - Configuration options
 * @returns {Promise<Array>} Array of PopCultureReference objects
 */
export default async function popReference(sentence, description, config = {}) {
  config = scopeOperation('pop-reference', config);
  const { include = [] } = config;
  const { referenceContext, referencesPerSource } = await getOptions(config, {
    referenceContext: false,
    referencesPerSource: 2,
  });

  // Build the include list description
  let includeDescription = '';
  if (include.length > 0) {
    const sources = include.map((item) => {
      if (typeof item === 'string') {
        return item;
      } else if (item.reference && item.percent) {
        return `${item.reference} (focus ${item.percent}%)`;
      }
      return item.reference || item;
    });
    includeDescription = asXML(sources.join('\n'), { tag: 'sources' });
  }

  // Wrap the sentence and description in XML
  const sentenceXml = asXML(sentence, { tag: 'sentence' });
  const descriptionXml = asXML(description, { tag: 'description' });

  const contextInstruction = referenceContext
    ? 'Include a brief context description for each reference explaining the scene or idea being referenced.'
    : 'Do not include context descriptions.';

  const prompt = `Find pop culture references that metaphorically capture the sentence based on its description.

${descriptionXml}

${sentenceXml}

${
  includeDescription
    ? `Draw references from these sources:\n${includeDescription}\n`
    : 'Select appropriate pop culture references from any well-known source.'
}

Process:
1. Identify the key elements in the sentence that could be metaphorically represented
2. Find ${referencesPerSource} references per source that capture these elements
3. Score each reference based on how well it fits (0-1 scale)
4. Identify which part of the sentence each reference connects to

${contextInstruction}

Requirements:
- Each reference should be a specific moment, scene, or concept (not just the source name)
- References should meaningfully connect to the sentence's meaning
- Provide exact character positions for matched text
- Higher scores mean stronger metaphorical fit`;

  const response = await retry(
    () =>
      callLlm(prompt, {
        ...config,
        response_format: popReferenceResponseFormat,
      }),
    {
      label: 'pop-reference',
      config,
    }
  );

  const references = response?.references || response;

  if (!Array.isArray(references)) {
    throw new Error('Expected array of references in response');
  }

  return references;
}
