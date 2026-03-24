import callLlm from '../../lib/llm/index.js';
import { hydeOutputDoc } from '../../prompts/embed-query-transforms.js';
import { schema } from './schema.js';
import { emitChainResult } from '../../lib/progress-callback/index.js';

const name = 'embed-rewrite-to-output-doc';

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
  const startTime = Date.now();
  const result = await callLlm(hydeOutputDoc(query), {
    ...config,
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'hyde_output_doc', schema },
    },
  });
  emitChainResult(config, name, { duration: Date.now() - startTime });
  return result;
}
