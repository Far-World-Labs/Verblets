/**
 * Test Analysis Chain Reporter
 * Provides test event processing, analysis, and reporting capabilities
 *
 * This is a Vitest reporter (infrastructure), not a standard chain.
 * The reporter itself manages its own lifecycle via Redis ring buffers
 * and processor pipelines. We wrap the re-export with minimal emitter
 * lifecycle so the eventing system has visibility.
 */

import createProgressEmitter from '../../lib/progress/index.js';
import { Outcome } from '../../lib/progress/constants.js';
import { nameStep } from '../../lib/context/option.js';

export { default } from './reporter.js';

const name = 'test-analysis';

/**
 * Programmatic entry point for test-analysis lifecycle tracking.
 * Wraps an analysis run with emitter start/complete/error events.
 *
 * @param {Function} runFn - async function performing the analysis work
 * @param {Object} [config={}] - chain config
 * @returns {Promise<*>} result of runFn
 */
export async function runAnalysis(runFn, config = {}) {
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();

  try {
    const result = await runFn(runConfig);
    emitter.complete({ outcome: Outcome.success });
    return result;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}
