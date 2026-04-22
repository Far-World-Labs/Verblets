import score from '../score/index.js';
import filter from '../filter/index.js';
import reduce from '../reduce/index.js';
import createProgressEmitter, { scopePhase } from '../../lib/progress/index.js';
import { DomainEvent, Outcome } from '../../lib/progress/constants.js';
import { nameStep, getOptions } from '../../lib/context/option.js';
import { resolveArgs, resolveTexts } from '../../lib/instruction/index.js';

const name = 'review';

function averageScore(scores) {
  const valid = scores.filter((s) => s !== undefined);
  if (valid.length === 0) return 0;
  return valid.reduce((sum, s) => sum + s, 0) / valid.length;
}

/**
 * Iterative quality refinement: score → filter → repeat until threshold, then reduce.
 *
 * Each iteration scores items, checks the average against the threshold, and
 * filters out low-quality items if the threshold is not met. The loop exits when:
 * - Average score meets or exceeds the threshold
 * - Max iterations reached
 * - Filter produces no change (all items kept or all rejected)
 *
 * After the loop, surviving items are reduced into a final result.
 *
 * @param {Array} list - Items to review
 * @param {string|object} instructions - Evaluation criteria (string or bundle with filtering, reducing)
 * @param {Object} config - Configuration options
 * @param {number} [config.threshold=7] - Minimum average score to stop iterating
 * @param {number} [config.maxIterations=3] - Maximum scoring/filtering cycles
 * @returns {Promise<*>} Reduced result from surviving items
 */
export default async function review(list, instructions, config) {
  [instructions, config] = resolveArgs(instructions, config, ['filtering', 'reducing']);
  const { text, known, context } = resolveTexts(instructions, ['filtering', 'reducing']);
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();
  emitter.emit({ event: DomainEvent.input, value: list });

  try {
    const { threshold, maxIterations } = await getOptions(runConfig, {
      threshold: 7,
      maxIterations: 3,
    });

    const scoreInstruction = context ? `${text}\n\n${context}` : text;
    const filterInstruction =
      known.filtering ?? `Remove items that do not meet quality standards based on: ${text}`;
    const reduceInstruction = known.reducing ?? text;

    let items = list;
    let iteration = 0;

    while (iteration < maxIterations) {
      emitter.emit({ event: DomainEvent.tick, phase: 'scoring', iteration });

      const scores = await score(items, scoreInstruction, {
        ...runConfig,
        onProgress: scopePhase(runConfig.onProgress, `iteration-${iteration}/score`),
      });

      const avg = averageScore(scores);
      iteration += 1;

      emitter.emit({
        event: DomainEvent.tick,
        phase: 'scored',
        iteration,
        averageScore: avg,
      });

      if (avg >= threshold) {
        emitter.emit({
          event: DomainEvent.phase,
          phase: 'threshold-met',
          iteration,
          averageScore: avg,
        });
        break;
      }

      if (iteration >= maxIterations) break;

      emitter.emit({ event: DomainEvent.tick, phase: 'filtering', iteration });

      const filtered = await filter(items, filterInstruction, {
        ...runConfig,
        onProgress: scopePhase(runConfig.onProgress, `iteration-${iteration}/filter`),
      });

      emitter.emit({
        event: DomainEvent.tick,
        phase: 'filtered',
        iteration,
        inputCount: items.length,
        outputCount: filtered.length,
      });

      if (filtered.length === items.length || filtered.length === 0) {
        emitter.emit({
          event: DomainEvent.phase,
          phase: 'filter-stable',
          iteration,
        });
        break;
      }

      items = filtered;
    }

    emitter.emit({ event: DomainEvent.phase, phase: 'reducing' });

    const result = await reduce(items, reduceInstruction, {
      ...runConfig,
      onProgress: scopePhase(runConfig.onProgress, 'reduce'),
    });

    emitter.emit({ event: DomainEvent.output, value: result });
    emitter.complete({
      totalItems: list.length,
      survivingItems: items.length,
      totalIterations: iteration,
      outcome: Outcome.success,
    });

    return result;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

review.knownTexts = ['filtering', 'reducing'];
