import callLlm from '../../lib/llm/index.js';
import { hydeOutputDoc } from '../../prompts/embed-query-transforms.js';
import { schema } from './schema.js';

/**
 * Generate a hypothetical document that answers the query (HyDE technique).
 *
 * The resulting passage can be embedded and used for similarity search,
 * bridging the vocabulary gap between questions and source documents.
 *
 * @param {string} query
 * @param {object} [config] - { llm, logger }
 * @returns {Promise<string>}
 */
export default async function embedRewriteToOutputDoc(query, config = {}) {
  const { llm, ...options } = config;
  return await callLlm(hydeOutputDoc(query), {
    llm,
    modelOptions: {
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'hyde_output_doc', schema },
      },
    },
    ...options,
  });
}
