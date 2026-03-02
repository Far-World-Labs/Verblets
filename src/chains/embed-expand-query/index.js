import embedRewriteQuery from '../../verblets/embed-rewrite-query/index.js';
import embedMultiQuery from '../../verblets/embed-multi-query/index.js';
import embedStepBack from '../../verblets/embed-step-back/index.js';
import embedSubquestions from '../../verblets/embed-subquestions/index.js';

export const ALL_STRATEGIES = ['rewrite', 'multi', 'stepBack', 'subquestions'];

const STRATEGY_FNS = {
  rewrite: embedRewriteQuery,
  multi: embedMultiQuery,
  stepBack: embedStepBack,
  subquestions: embedSubquestions,
};

export { embedRewriteQuery, embedMultiQuery, embedStepBack, embedSubquestions };

/**
 * Expand a single query into multiple search queries using selected strategies.
 *
 * Runs strategies in parallel and returns a deduplicated array with the
 * original query first.
 *
 * @param {string} query
 * @param {object} [config]
 * @param {string[]} [config.strategies] - Subset of ALL_STRATEGIES (default: all)
 * @param {number} [config.count] - Variant count for multi/stepBack
 * @param {object} [config.llm] - LLM model options
 * @param {object} [config.logger] - Logger instance
 * @returns {Promise<string[]>}
 */
export default async function embedExpandQuery(query, config = {}) {
  const { strategies = ALL_STRATEGIES, count, llm, logger, ...rest } = config;

  const sharedConfig = { llm, logger, ...rest };
  const countConfig = count !== undefined ? { ...sharedConfig, count } : sharedConfig;

  const tasks = strategies.map((name) => {
    const fn = STRATEGY_FNS[name];
    const cfg = name === 'multi' || name === 'stepBack' ? countConfig : sharedConfig;
    return fn(query, cfg);
  });

  const results = await Promise.all(tasks);

  const seen = new Set();
  const expanded = [query];
  seen.add(query);

  for (const result of results) {
    const items = Array.isArray(result) ? result : [result];
    for (const item of items) {
      if (!seen.has(item)) {
        seen.add(item);
        expanded.push(item);
      }
    }
  }

  return expanded;
}
