import { resolveTexts } from '../index.js';
import { nameStep, getOptions } from '../../context/option.js';
import createProgressEmitter from '../../progress/index.js';
import { DomainEvent, Outcome } from '../../progress/constants.js';

/**
 * Chain-of-thought decomposition: run named reasoning steps sequentially,
 * threading accumulated results through each step.
 *
 * Each step receives { input, prior, options, instruction, context, config }
 * where `prior` is the array of completed { step, result } entries.
 * Steps with a `when` predicate are skipped when the predicate returns false.
 *
 * @param {*} input - The value to reason about
 * @param {string|object} instruction - Instruction bundle with `steps` array,
 *   optional `name` (chain name for progress), and optional `options` (getOptions spec)
 * @param {object} [config] - Standard chain config (onProgress, policy, etc.)
 * @returns {Promise<Array<{ step: string, result: * }>>} Accumulated step results
 */
export async function chainOfThoughtDecompose(input, instruction, config = {}) {
  const { text, known, context } = resolveTexts(instruction, ['steps', 'name', 'options']);
  const steps = known.steps;
  const chainName = known.name || 'chain-of-thought';
  const optionSpec = known.options;

  if (!Array.isArray(steps)) {
    throw new Error('chainOfThoughtDecompose requires a steps array in the instruction bundle');
  }

  const runConfig = nameStep(chainName, config);
  const emitter = createProgressEmitter(chainName, runConfig.onProgress, runConfig);
  emitter.start();
  emitter.emit({ event: DomainEvent.input, value: input });

  const options = optionSpec ? await getOptions(runConfig, optionSpec) : {};

  try {
    const prior = [];
    const roundDone = emitter.batch(steps.length);

    for (const step of steps) {
      if (step.when && !step.when({ input, prior, options })) {
        roundDone(1);
        continue;
      }

      emitter.emit({
        event: DomainEvent.step,
        stepName: step.name,
        stepIndex: prior.length,
      });

      // eslint-disable-next-line no-await-in-loop
      const result = await step.execute({
        input,
        prior,
        options,
        instruction: text,
        context,
        config: runConfig,
      });

      prior.push({ step: step.name, result });
      roundDone(1);
    }

    emitter.emit({ event: DomainEvent.output, value: prior });
    emitter.complete({ outcome: Outcome.success, steps: prior.length });

    return prior;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}
