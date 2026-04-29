import test from '../test/index.js';
import createProgressEmitter, { scopePhase } from '../../lib/progress/index.js';
import { Outcome, ErrorPosture } from '../../lib/progress/constants.js';
import { nameStep } from '../../lib/context/option.js';
import parallelBatch from '../../lib/parallel-batch/index.js';

const name = 'test-advice';

const boundaryIssues = 'Run the code with 5 boundary value test cases and report any that fail';

const successIssues =
  'Identify 5 passing scenarios and significant boundary conditions in this code. Provide minimal input examples for each scenario to demonstrate correctness.';

const failureIssues =
  "Identify 5 failing scenarios and significant boundary conditions in this code. Provide minimal input examples for each scenario to demonstrate the failure. Assume DBC, and don't complain when types are specified in jsDoc.";

const defectIssues =
  'Identify 5 defects in this code. Provide minimal input examples to demonstrate each defect.';

const bestPracticesIssues = 'Suggest 5 best practices improvements for this code.';

const cleanCodeIssues = 'Suggest 5 "clean code" improvements for this code.';

const qualityIssues =
  'Identify 5 specific issues related to code quality, readability, and maintainability.';

const refactorIssues =
  'Suggest 5 refactors that would most improve the composibility of this code.';

const ALL_INSTRUCTIONS = [
  boundaryIssues,
  successIssues,
  failureIssues,
  defectIssues,
  bestPracticesIssues,
  cleanCodeIssues,
  qualityIssues,
  refactorIssues,
];

export default async function testAdvice(path, config = {}) {
  if (typeof path !== 'string' || path.length === 0) {
    throw new Error(
      `test-advice: path must be a non-empty string (got ${path === null ? 'null' : typeof path})`
    );
  }
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();

  try {
    const batchDone = emitter.batch(ALL_INSTRUCTIONS.length);

    const batchResults = await parallelBatch(
      ALL_INSTRUCTIONS,
      async (instructions) => {
        const issues = await test(path, instructions, {
          ...runConfig,
          onProgress: scopePhase(runConfig.onProgress, 'test-advice:test'),
        });
        batchDone(1);
        return issues;
      },
      {
        maxParallel: 3,
        errorPosture: ErrorPosture.resilient,
        abortSignal: runConfig.abortSignal,
        label: 'test-advice:instructions',
      }
    );

    const validBatches = batchResults.filter(Array.isArray);
    const failedInstructions = ALL_INSTRUCTIONS.length - validBatches.length;

    if (validBatches.length === 0) {
      throw new Error(`test-advice: all ${ALL_INSTRUCTIONS.length} instructions failed`);
    }

    const results = validBatches.flat();
    emitter.complete({
      outcome: failedInstructions > 0 ? Outcome.partial : Outcome.success,
      totalIssues: results.length,
      failedInstructions,
    });
    return results;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

testAdvice.knownTexts = [];
