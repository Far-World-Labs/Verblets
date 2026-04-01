/**
 * Suggest targeting rules from decision traces.
 *
 * Single LLM call — takes an array of traces and returns targeting rule AST
 * nodes from `lib/targeting-rule`. Consumers supply the traces however they
 * like (trace collector, database query, manual construction).
 */

import callLlm from '../../lib/llm/index.js';
import { schema } from '../../lib/targeting-rule/index.js';
import { nameStep } from '../../lib/context/option.js';
import createProgressEmitter from '../../lib/progress/index.js';

const name = 'suggest-targeting-rules';

/**
 * Build the analysis prompt from traces.
 * @param {object[]} traces
 * @param {string} [instruction]
 * @returns {string}
 */
export const buildPrompt = (traces, instruction) => {
  const traceBlock = traces
    .map(
      (t, i) =>
        `${i + 1}. option="${t.option}" operation="${t.operation}" source="${t.source}" value="${t.value}"${t.policyReturned !== undefined ? ` policyReturned="${t.policyReturned}"` : ''}${t.error ? ` error="${t.error}"` : ''}`
    )
    .join('\n');

  return `Analyze the following decision traces from a configuration system. Each trace records how an option was resolved: via a policy function, direct config, or fallback default.

Look for patterns that suggest targeting rules:
- Options that consistently fall back to defaults (missing coverage)
- Clusters of similar contexts that should share a rule
- Anomalous decisions that differ from the majority pattern

Express each suggestion as a targeting rule with clauses. Each clause matches a context attribute using an operator (in, startsWith, endsWith, contains, lessThan, greaterThan). All clauses in a rule must match for the rule to apply. Each rule sets one option to one value.

DECISION TRACES (${traces.length} total):
${traceBlock}

Based on these patterns, suggest concrete targeting rules.${instruction ? `\n\nAdditional guidance: ${instruction}` : ''}`;
};

/**
 * Suggest targeting rules from decision traces.
 *
 * @param {object[]} traces - Decision trace objects (from trace-collector or any source)
 * @param {string} [instruction] - Additional guidance for the analysis
 * @param {object} [config={}] - LLM config
 * @returns {Promise<object[]>} Array of targeting rule AST nodes
 */
export default async function suggestTargetingRules(traces, instruction, config = {}) {
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();

  if (!traces || traces.length === 0) {
    emitter.complete({ outcome: 'success' });
    return [];
  }

  try {
    const prompt = buildPrompt(traces, instruction);

    const result = await callLlm(prompt, {
      ...runConfig,
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'targeting_rules', schema },
      },
    });

    const rules = result?.rules ?? result ?? [];

    emitter.complete({ outcome: 'success' });

    return rules;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}
