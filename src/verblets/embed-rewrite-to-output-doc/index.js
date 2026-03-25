import callLlm from '../../lib/llm/index.js';
import { hydeOutputDoc } from '../../prompts/embed-query-transforms.js';
import { schema } from './schema.js';
import { nameStep } from '../../lib/context/option.js';
import { track } from '../../lib/progress-callback/index.js';

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
  const runConfig = nameStep(name, config);
  const span = track(name, runConfig);
  const result = await callLlm(hydeOutputDoc(query), {
    ...runConfig,
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'hyde_output_doc', schema },
    },
  });
  span.result();
  return result;
}
