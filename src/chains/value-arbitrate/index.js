import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import parallelBatch from '../../lib/parallel-batch/index.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { Outcome, ErrorPosture } from '../../lib/progress/constants.js';
import { nameStep, getOptions } from '../../lib/context/option.js';

const name = 'value-arbitrate';

const isMultiValueMode = (values) =>
  values.length > 0 &&
  typeof values[0] === 'object' &&
  values[0] !== undefined &&
  'values' in values[0];

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

const buildMultiMediationPrompt = (mediationDimensions, instruction) => {
  const dimSections = mediationDimensions
    .map(({ dim, candidates, viableMays }) => {
      const signalBlock = viableMays
        .map(({ name, resolved, weight, prompt }) => {
          const parts = [`  - "${name}" recommends: ${resolved}`];
          if (weight !== undefined) parts.push(`(weight: ${weight})`);
          if (prompt) parts.push(`— ${prompt}`);
          return parts.join(' ');
        })
        .join('\n');
      const candidateList = candidates.map((v) => `"${v}"`).join(', ');
      return `DIMENSION "${dim.name}" — allowed values (least to most restrictive): ${candidateList}\n  Signals:\n${signalBlock}`;
    })
    .join('\n\n');

  return `Multiple stakeholders have expressed preferences for configuration values across several dimensions. Select the best value for each dimension from its allowed options.

${dimSections}

For each dimension, select exactly one value from its allowed options. Consider the weights and context of each signal, and how choices across dimensions relate to each other.${instruction ? `\n\n${instruction}` : ''}`;
};

const arbitrateDimension = (dim, evaluated) => {
  const mustResults = [];
  const mayResults = [];

  for (const s of evaluated) {
    const dimValue = s.resolved?.[dim.name];
    if (dimValue === undefined) continue;
    const projected = { ...s, resolved: dimValue };
    if (s.strictness === 'must') mustResults.push(projected);
    else mayResults.push(projected);
  }

  const floorIdx = mustResults.length > 0 ? mustFloorIndex(mustResults, dim.values) : -1;
  const candidates = floorIdx >= 0 ? dim.values.slice(floorIdx) : [...dim.values];

  let selection;
  if (candidates.length === 0) {
    selection = dim.values[dim.values.length - 1];
  } else if (candidates.length === 1) {
    selection = candidates[0];
  } else {
    const viableMays = mayResults.filter((s) => candidates.includes(s.resolved));
    const uniqueValues = [...new Set(viableMays.map((s) => s.resolved))];
    if (uniqueValues.length === 1) {
      selection = uniqueValues[0];
    } else if (viableMays.length === 0) {
      selection = candidates[0];
    }
  }

  return { floorIdx, candidates, selection, mayResults };
};

async function arbitrateMulti(signals, ctx, dimensions, config) {
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();
  const { instruction, constraints } = await getOptions(runConfig, {
    instruction: undefined,
    constraints: undefined,
  });

  try {
    const evaluated = (
      await parallelBatch(
        signals,
        async (signal) => ({
          name: signal.name,
          strictness: signal.strictness,
          weight: signal.weight,
          prompt: signal.prompt,
          resolved: await signal.value(ctx),
        }),
        { maxParallel: 5, errorPosture: ErrorPosture.resilient, abortSignal: runConfig.abortSignal }
      )
    ).filter(Boolean);

    const dimState = new Map();
    for (const dim of dimensions) {
      dimState.set(dim.name, arbitrateDimension(dim, evaluated));
    }

    emitter.emit({
      event: 'value-arbitrate:dimensions-evaluated',
      dimensions: dimensions.map((d) => d.name),
    });

    if (constraints?.length) {
      const buildSnapshot = () => {
        const snapshot = {};
        for (const dim of dimensions) {
          const state = dimState.get(dim.name);
          snapshot[dim.name] = state.selection ?? state.candidates[0];
        }
        return snapshot;
      };

      for (const constraint of constraints) {
        const snapshot = buildSnapshot();
        const adjustments = constraint.enforce(snapshot);
        if (!adjustments) continue;

        for (const [dimName, requiredValue] of Object.entries(adjustments)) {
          const dim = dimensions.find((d) => d.name === dimName);
          if (!dim) continue;

          const requiredIdx = dim.values.indexOf(requiredValue);
          if (requiredIdx < 0) continue;

          const state = dimState.get(dimName);

          if (requiredIdx <= state.floorIdx) continue;

          const newCandidates = dim.values.slice(requiredIdx);
          let newSelection;

          if (newCandidates.length <= 1) {
            newSelection = newCandidates[0] ?? dim.values[dim.values.length - 1];
          } else if (state.selection !== undefined && newCandidates.includes(state.selection)) {
            newSelection = state.selection;
          } else {
            newSelection = requiredValue;
          }

          dimState.set(dimName, {
            ...state,
            floorIdx: requiredIdx,
            candidates: newCandidates,
            selection: newSelection,
          });
        }
      }

      emitter.emit({ event: 'value-arbitrate:constraints-applied' });
    }

    const needsMediation = dimensions.filter(
      (dim) => dimState.get(dim.name).selection === undefined
    );

    if (needsMediation.length === 0) {
      emitter.complete({ outcome: Outcome.success, dimensions: dimensions.length });
      return dimensions.map((dim) => dimState.get(dim.name).selection);
    }

    const mediationDimensions = needsMediation.map((dim) => {
      const state = dimState.get(dim.name);
      const viableMays = state.mayResults.filter((s) => state.candidates.includes(s.resolved));
      return { dim, candidates: state.candidates, viableMays };
    });

    const prompt = buildMultiMediationPrompt(mediationDimensions, instruction);

    const properties = {};
    const enumMaps = {};
    for (const { dim, candidates } of mediationDimensions) {
      enumMaps[dim.name] = Object.fromEntries(candidates.map((v) => [String(v), v]));
      properties[dim.name] = {
        type: 'string',
        enum: candidates.map(String),
        description: `Selected value for ${dim.name}`,
      };
    }

    const schema = {
      type: 'object',
      properties,
      required: needsMediation.map((d) => d.name),
      additionalProperties: false,
    };

    const mapped = await retry(
      async () => {
        const aiResult = await callLlm(prompt, {
          ...runConfig,
          responseFormat: jsonSchema('value_arbitrate_multi', schema),
        });
        const out = {};
        for (const dim of needsMediation) {
          const aiValue = aiResult?.[dim.name];
          const m = enumMaps[dim.name]?.[aiValue];
          if (m === undefined) {
            const candidates = dimState.get(dim.name).candidates.join(', ');
            throw new Error(
              `value-arbitrate: LLM returned ${JSON.stringify(aiValue)} for "${dim.name}", not in candidates [${candidates}]`
            );
          }
          out[dim.name] = m;
        }
        return out;
      },
      { label: 'value-arbitrate', config: runConfig }
    );

    for (const dim of needsMediation) {
      const state = dimState.get(dim.name);
      dimState.set(dim.name, { ...state, selection: mapped[dim.name] });
    }

    emitter.complete({
      outcome: Outcome.success,
      dimensions: dimensions.length,
      mediated: needsMediation.length,
    });
    return dimensions.map((dim) => dimState.get(dim.name).selection);
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

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
 * When values is an array of dimension descriptors ({ name, values }), multi-value
 * arbitration is used: each dimension is arbitrated independently, then cross-value
 * constraints from config.constraints are enforced. Returns an array of selected
 * values in dimension order.
 *
 * @param {Array<{name: string, value: function, strictness: 'must'|'may', weight?: number, prompt?: string}>} signals
 * @param {object} ctx - Evaluation context passed to each signal's value function
 * @param {*[]|Array<{name: string, values: *[]}>} values - Ordered values or dimension descriptors
 * @param {object} [config={}] - Chain config (llm, policy, etc.)
 * @param {string} [config.instruction] - Optional instruction appended to the mediation prompt
 * @param {Array<{name: string, enforce: function}>} [config.constraints] - Cross-value constraints (multi-value mode)
 * @returns {Promise<*|*[]>} The selected value (single) or array of values (multi)
 */
export default async function valueArbitrate(signals, ctx, values, config = {}) {
  if (!signals?.length) throw new Error('valueArbitrate requires at least one signal');
  if (!values?.length) throw new Error('valueArbitrate requires at least one value');

  if (isMultiValueMode(values)) {
    return arbitrateMulti(signals, ctx, values, config);
  }

  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();
  const { instruction } = await getOptions(runConfig, {
    instruction: undefined,
  });

  try {
    // Step 1: Evaluate all signals concurrently; failed evaluations drop out
    const evaluated = (
      await parallelBatch(
        signals,
        async (signal) => ({
          name: signal.name,
          strictness: signal.strictness,
          weight: signal.weight,
          prompt: signal.prompt,
          resolved: await signal.value(ctx),
        }),
        { maxParallel: 5, errorPosture: ErrorPosture.resilient, abortSignal: runConfig.abortSignal }
      )
    ).filter(Boolean);

    // Step 2: Separate must and may results
    const mustResults = evaluated.filter((s) => s.strictness === 'must');
    const mayResults = evaluated.filter((s) => s.strictness === 'may');

    // Step 3: Determine must-floor
    const floorIdx = mustResults.length > 0 ? mustFloorIndex(mustResults, values) : -1;

    // Values at or above the floor are candidates
    const candidates = floorIdx >= 0 ? values.slice(floorIdx) : [...values];

    if (candidates.length === 0) {
      // Must-floor is at or beyond the most restrictive value — return it
      emitter.complete({ outcome: Outcome.success });
      return values[values.length - 1];
    }

    if (candidates.length === 1) {
      emitter.complete({ outcome: Outcome.success });
      return candidates[0];
    }

    // Step 4: Filter may-results to those recommending valid candidates
    const viableMays = mayResults.filter((s) => candidates.includes(s.resolved));

    // If all mays agree, no AI needed
    const uniqueMayValues = [...new Set(viableMays.map((s) => s.resolved))];
    if (uniqueMayValues.length === 1) {
      emitter.complete({ outcome: Outcome.success });
      return uniqueMayValues[0];
    }

    // If no mays have opinions within the candidate space, return the floor
    if (viableMays.length === 0) {
      emitter.complete({ outcome: Outcome.success });
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

    const selected = await retry(
      async () => {
        const result = await callLlm(prompt, {
          ...runConfig,
          responseFormat: jsonSchema('value_arbitrate', schema),
        });
        // callLlm auto-unwraps the value from the JSON response
        const m = enumValues[result];
        if (m === undefined) {
          throw new Error(
            `value-arbitrate: LLM returned ${JSON.stringify(result)}, not in candidates [${candidates.join(', ')}]`
          );
        }
        return m;
      },
      { label: 'value-arbitrate', config: runConfig }
    );

    emitter.complete({ outcome: Outcome.success });
    return selected;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

valueArbitrate.knownTexts = [];
