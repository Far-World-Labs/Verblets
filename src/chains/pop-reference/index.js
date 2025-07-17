import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import chatGPT from '../../lib/chatgpt/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { constants as promptConstants } from '../../prompts/index.js';

const { onlyJSON } = promptConstants;

// Get the directory of this module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load the JSON schema for pop reference results
 * @returns {Promise<Object>} JSON schema for validation
 */
async function getPopReferenceSchema() {
  const schemaPath = path.join(__dirname, 'pop-reference-result.json');
  return JSON.parse(await fs.readFile(schemaPath, 'utf8'));
}

/**
 * Create model options for structured outputs
 * @param {string|Object} llm - LLM model name or configuration object
 * @returns {Promise<Object>} Model options for chatGPT
 */
async function createModelOptions(llm) {
  const schema = await getPopReferenceSchema();

  const responseFormat = {
    type: 'json_schema',
    json_schema: {
      name: 'pop_reference_result',
      schema,
    },
  };

  if (typeof llm === 'string') {
    return {
      modelName: llm,
      response_format: responseFormat,
    };
  } else if (llm) {
    return {
      ...llm,
      response_format: responseFormat,
    };
  } else {
    return {
      response_format: responseFormat,
    };
  }
}

/**
 * Find pop culture references that metaphorically match given sentences
 * @param {string} sentence - The sentence to metaphorically compare
 * @param {string} description - A descriptor guiding tone, intent, or interpretive nuance
 * @param {Object} options - Configuration options
 * @returns {Promise<Array>} Array of PopCultureReference objects
 */
export default async function popReference(sentence, description, options = {}) {
  const {
    include = [],
    referenceContext = false,
    referencesPerSource = 2,
    llm,
    ...restOptions
  } = options;

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
- Higher scores mean stronger metaphorical fit

${onlyJSON}`;

  const modelOptions = await createModelOptions(llm);
  const response = await chatGPT(prompt, {
    modelOptions,
    ...restOptions,
  });

  // Parse response
  const parsed = typeof response === 'string' ? JSON.parse(response) : response;
  const references = parsed?.references || parsed;

  if (!Array.isArray(references)) {
    throw new Error('Expected array of references in response');
  }

  return references;
}
