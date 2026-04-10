import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import { hydeOutputDoc } from '../../prompts/embed-query-transforms.js';
import { schema } from './schema.js';
import { nameStep } from '../../lib/context/option.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { Outcome } from '../../lib/progress/constants.js';

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
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();
  try {
    const result = await callLlm(hydeOutputDoc(query), {
      ...runConfig,
      response_format: jsonSchema('hyde_output_doc', schema),
    });
    emitter.complete({ outcome: Outcome.success });
    return result;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}
