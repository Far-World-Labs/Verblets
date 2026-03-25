import callLlm from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import { track } from '../../lib/progress-callback/index.js';
import { nameStep, getOptions } from '../../lib/context/option.js';

const name = 'value-arbitrate';

/**
 * Find the most restrictive must value — the one with the highest index
 * in the ordered values array. Higher index = more restrictive.
 * @param {Array<{name: string, resolved: *}>} mustResults
 * @param {*[]} values - Ordered from least to most restrictive
 * @returns {number} Index of the must-floor in the values array
 */
const mustFloorIndex = (mustResults, values) => {
  let highest = -1;
  for (const { resolved } of mustResults) {
    const idx = values.indexOf(resolved);
    if (idx > highest) highest = idx;
  }
  return highest;
};

/**
 * Build a classify prompt for AI mediation among competing may-signals.
 * @param {Array<{name: string, resolved: *, weight?: number, prompt?: string}>} mayResults
 * @param {*[]} candidates - Values the AI can choose from
 * @param {string} [instruction] - Optional additional instruction
 * @returns {string}
 */
const buildMediationPrompt = (mayResults, candidates, instruction) => {
  const signalDescriptions = mayResults
    .map(({ name, resolved, weight, prompt }) => {
      const parts = [`- "${name}" recommends: ${resolved}`];
      if (weight !== undefined) parts.push(`(weight: ${weight})`);
      if (prompt) parts.push(`— ${prompt}`);
      return parts.join(' ');
    })
    .join('\n');

  const candidateList = candidates.map((v) => `"${v}"`).join(', ');

  return `Multiple stakeholders have expressed preferences for a configuration value. Select the single best value from the allowed options.

STAKEHOLDER SIGNALS:
${signalDescriptions}

ALLOWED VALUES (ordered least to most restrictive): ${candidateList}

Select exactly one value from the allowed options. Consider the weights and context of each signal.${instruction ? `\n\n${instruction}` : ''}`;
};

/**
 * Arbitrate a value from multiple stakeholder signals with must/may semantics.
 *
 * Must-signals are binding constraints — the most restrictive must determines a
 * deterministic floor. May-signals are weighted preferences — when multiple mays
 * compete within the must-constrained space, AI mediates via classify.
 *
 * The values array is ordered from least to most restrictive. Must-floor enforcement
 * eliminates any value below the floor index. If only one candidate remains, it is
 * returned without an AI call.
 *
 * @param {Array<{name: string, value: function, strictness: 'must'|'may', weight?: number, prompt?: string}>} signals
 * @param {object} ctx - Evaluation context passed to each signal's value function
 * @param {*[]} values - Ordered from least to most restrictive
 * @param {object} [config={}] - Chain config (llm, policy, etc.)
 * @param {string} [config.instruction] - Optional instruction appended to the mediation prompt
 * @returns {Promise<*>} The selected value
 */
export default async function valueArbitrate(signals, ctx, values, config = {}) {
  if (!signals?.length) throw new Error('valueArbitrate requires at least one signal');
  if (!values?.length) throw new Error('valueArbitrate requires at least one value');

  const runConfig = nameStep(name, config);
  const span = track(name, runConfig);
  const { instruction } = await getOptions(runConfig, {
    instruction: undefined,
  });

  const emitComplete = () => span.result();

  // Step 1: Evaluate all signals concurrently
  const evaluated = await Promise.all(
    signals.map(async (signal) => ({
      name: signal.name,
      strictness: signal.strictness,
      weight: signal.weight,
      prompt: signal.prompt,
      resolved: await signal.value(ctx),
    }))
  );

  // Step 2: Separate must and may results
  const mustResults = evaluated.filter((s) => s.strictness === 'must');
  const mayResults = evaluated.filter((s) => s.strictness === 'may');

  // Step 3: Determine must-floor
  const floorIdx = mustResults.length > 0 ? mustFloorIndex(mustResults, values) : -1;

  // Values at or above the floor are candidates
  const candidates = floorIdx >= 0 ? values.slice(floorIdx) : [...values];

  if (candidates.length === 0) {
    // Must-floor is at or beyond the most restrictive value — return it
    emitComplete();
    return values[values.length - 1];
  }

  if (candidates.length === 1) {
    emitComplete();
    return candidates[0];
  }

  // Step 4: Filter may-results to those recommending valid candidates
  const viableMays = mayResults.filter((s) => candidates.includes(s.resolved));

  // If all mays agree, no AI needed
  const uniqueMayValues = [...new Set(viableMays.map((s) => s.resolved))];
  if (uniqueMayValues.length === 1) {
    emitComplete();
    return uniqueMayValues[0];
  }

  // If no mays have opinions within the candidate space, return the floor
  if (viableMays.length === 0) {
    emitComplete();
    return candidates[0];
  }

  // Step 5: AI mediation via classify
  const prompt = buildMediationPrompt(viableMays, candidates, instruction);

  const enumValues = Object.fromEntries(candidates.map((v) => [String(v), v]));
  const schema = {
    type: 'object',
    properties: {
      value: {
        type: 'string',
        enum: candidates.map(String),
        description: 'The selected value',
      },
    },
    required: ['value'],
    additionalProperties: false,
  };

  const result = await retry(
    () =>
      callLlm(prompt, {
        ...runConfig,
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'value_arbitrate', schema },
        },
      }),
    { label: 'value-arbitrate', config: runConfig }
  );

  // callLlm auto-unwraps the value from the JSON response
  const selected = enumValues[result];
  emitComplete();
  return selected !== undefined ? selected : candidates[0];
}
