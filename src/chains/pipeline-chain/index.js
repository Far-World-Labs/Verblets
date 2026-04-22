import createProgressEmitter, { scopePhase } from '../../lib/progress/index.js';
import { DomainEvent, Outcome, ErrorPosture } from '../../lib/progress/constants.js';
import { nameStep, getOptions } from '../../lib/context/option.js';

const name = 'pipeline-chain';

function actualType(value) {
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function stepLabel(step, index) {
  return step.name ?? `step-${index}`;
}

function isChainStep(step) {
  return 'chain' in step;
}

/**
 * Validate that adjacent steps have compatible declared types.
 * Throws TypeError on the first mismatch found.
 */
function validatePipeline(steps) {
  if (!Array.isArray(steps) || steps.length === 0) {
    throw new Error('Pipeline requires at least one step');
  }

  for (const step of steps) {
    if (!isChainStep(step) && !('transform' in step)) {
      throw new Error('Each step must have a "chain" or "transform" property');
    }
    if (!step.outputType) {
      throw new Error(`Step "${stepLabel(step, steps.indexOf(step))}" is missing outputType`);
    }
    if (!step.inputType) {
      throw new Error(`Step "${stepLabel(step, steps.indexOf(step))}" is missing inputType`);
    }
  }

  for (let i = 0; i < steps.length - 1; i += 1) {
    const current = steps[i];
    const next = steps[i + 1];
    if (current.outputType !== next.inputType) {
      throw new TypeError(
        `Type mismatch between step ${i} ("${stepLabel(current, i)}") and ` +
          `step ${i + 1} ("${stepLabel(next, i + 1)}"): ` +
          `output type "${current.outputType}" is incompatible with input type "${next.inputType}"`
      );
    }
  }
}

function assertOutputType(value, step, index) {
  const actual = actualType(value);
  if (actual !== step.outputType) {
    throw new TypeError(
      `Step ${index} ("${stepLabel(step, index)}") produced "${actual}" ` +
        `but declared output type "${step.outputType}"`
    );
  }
}

/**
 * Compose multiple chain functions and intermediate transforms into a sequential pipeline.
 *
 * Each step declares its inputType and outputType. The pipeline validates type compatibility
 * between adjacent steps before execution, and verifies actual output types at runtime.
 *
 * Steps are either chain steps or transform steps:
 *   Chain step:     { chain: fn, instructions?, inputType, outputType, name? }
 *   Transform step: { transform: fn, inputType, outputType, name? }
 *
 * Chain steps are called with (value, instructions, subConfig) following the standard
 * chain calling convention. Transform steps are called with (value) as pure functions.
 *
 * @param {*} input - Initial value fed into the first step
 * @param {Array<object>} steps - Pipeline step definitions
 * @param {object} [config={}] - Configuration options
 * @returns {Promise<*>} Output of the final step
 */
const pipelineChain = async function pipelineChain(input, steps, config = {}) {
  validatePipeline(steps);

  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();
  emitter.emit({ event: DomainEvent.input, value: input });

  try {
    await getOptions(runConfig, { errorPosture: ErrorPosture.strict });

    const batchDone = emitter.batch(steps.length);
    let value = input;

    for (let i = 0; i < steps.length; i += 1) {
      const step = steps[i];
      const label = stepLabel(step, i);

      emitter.emit({ event: DomainEvent.step, stepIndex: i, stepName: label });

      if (isChainStep(step)) {
        const subConfig = {
          ...runConfig,
          onProgress: scopePhase(runConfig.onProgress, `pipeline:${label}`),
        };
        value = await step.chain(value, step.instructions, subConfig);
      } else {
        value = await step.transform(value);
      }

      assertOutputType(value, step, i);
      batchDone(1);
    }

    emitter.emit({ event: DomainEvent.output, value });
    emitter.complete({
      totalSteps: steps.length,
      outcome: Outcome.success,
    });

    return value;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
};

pipelineChain.knownTexts = [];

export default pipelineChain;
export { validatePipeline };
