import callLlm from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import parallelBatch from '../../lib/parallel-batch/index.js';
import windowFor from '../../lib/window-for/index.js';
import { nameStep, getOptions, withPolicy } from '../../lib/context/option.js';
import createProgressEmitter, { scopePhase } from '../../lib/progress/index.js';
import { DomainEvent, Outcome, ErrorPosture } from '../../lib/progress/constants.js';
import { resolveArgs, resolveTexts } from '../../lib/instruction/index.js';
import { asXML } from '../../prompts/wrap-variable.js';

const name = 'join';

// ===== Option Mappers =====

const DEFAULT_FIDELITY = { windowSize: 5, overlapPercent: 50 };

/**
 * Map fidelity option to a window processing posture.
 * Coordinates window granularity and overlap density.
 * low: large windows, minimal overlap — fewer LLM calls, rougher transitions.
 * high: small windows, high overlap — more LLM calls, smoother transitions.
 * Default: balanced (windowSize 5, 50% overlap).
 * @param {string|object|undefined} value
 * @returns {{ windowSize: number, overlapPercent: number }}
 */
export const mapFidelity = (value) => {
  if (value === undefined) return DEFAULT_FIDELITY;
  if (typeof value === 'object') return value;
  return (
    {
      low: { windowSize: 10, overlapPercent: 25 },
      med: DEFAULT_FIDELITY,
      high: { windowSize: 3, overlapPercent: 67 },
    }[value] ?? DEFAULT_FIDELITY
  );
};

/**
 * Join text fragments using AI with windowed processing for equal context exposure.
 * The prompt dictates all aspects of joining including style, spacing, and format.
 *
 * @param {string[]} list - Array of text fragments to join
 * @param {string} prompt - Instructions for how to join fragments (dictates all style/format)
 * @param {object} config - Configuration options
 * @param {number} config.windowSize - Size of overlapping windows (default: 5)
 * @param {number} config.overlapPercent - Percentage of overlap between windows (default: 50)
 * @param {string} config.styleHint - Optional additional style guidance
 * @param {number} config.maxAttempts - Maximum retry attempts (default: 3)
 * @returns {Promise<string>} Single result as dictated by prompt
 */
export default async function join(list, prompt, config) {
  [prompt, config] = resolveArgs(prompt, config);
  prompt ??= 'Combine these into a coherent single output.';
  if (list.length === 0) return '';
  if (list.length === 1) return list[0];

  const { text: promptText, context } = resolveTexts(prompt, []);
  const effectivePrompt = context ? `${promptText}\n\n${context}` : promptText;
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();
  const { styleHint, windowSize, overlapPercent } = await getOptions(runConfig, {
    fidelity: withPolicy(mapFidelity, ['windowSize', 'overlapPercent']),
    styleHint: '',
  });

  try {
    // Create overlapping windows using the windowFor utility
    const windows = windowFor(list, windowSize, overlapPercent);

    // Process each window
    const batchDone = emitter.batch(windows.length);

    const windowResults = await parallelBatch(
      windows,
      async (window, windowIndex) => {
        emitter.emit({
          event: DomainEvent.step,
          stepName: 'processing-window',
          windowNumber: windowIndex + 1,
          totalWindows: windows.length,
        });

        const fragmentList = window.fragments.map((f, idx) => `${idx + 1}. ${f}`).join('\n');
        const styleBlock = styleHint ? `\n\n${asXML(styleHint, { tag: 'style-guidance' })}` : '';

        const instruction = `${effectivePrompt}${styleBlock}

Window ${windowIndex + 1} of ${windows.length} - Join these fragments:

${asXML(fragmentList, { tag: 'fragments' })}

Important: This is part of a larger sequence. Join these fragments while being mindful that this result will be combined with other processed windows. Add necessary connecting words, prepositions, conjunctions, or other filler text to create a coherent, grammatically correct, and semantically meaningful result. Output only the joined result for this window.`;

        const result = await retry(() => callLlm(instruction, runConfig), {
          label: `join-window-${windowIndex + 1}`,
          config: runConfig,
          onProgress: scopePhase(runConfig.onProgress, 'window'),
        });

        batchDone(1);

        return {
          content: result || window.fragments.join(' '),
          window,
        };
      },
      { maxParallel: 3, errorPosture: ErrorPosture.resilient, abortSignal: runConfig.abortSignal }
    );

    // Filter valid results
    const validResults = windowResults.filter((r) => r.content && r.content.trim());

    if (validResults.length === 1) {
      emitter.complete({ outcome: Outcome.success, windows: windows.length });
      return validResults[0].content;
    }

    // Stitch operation: preserve terminals, only process overlapping sections
    let stitchedResult = validResults[0].content;

    for (let i = 1; i < validResults.length; i++) {
      emitter.emit({
        event: DomainEvent.step,
        stepName: 'stitching',
        stitchNumber: i,
        totalStitches: validResults.length - 1,
      });

      const currentResult = validResults[i];
      const previousWindow = validResults[i - 1].window;
      const currentWindow = currentResult.window;

      // Find the overlapping region based on original fragment indices
      const overlapStart = Math.max(previousWindow.startIndex, currentWindow.startIndex);
      const overlapEnd = Math.min(previousWindow.endIndex, currentWindow.endIndex);

      if (overlapStart <= overlapEnd) {
        // There's an overlap - process only the overlapping section
        const overlapFragments = list.slice(overlapStart, overlapEnd + 1);

        const stitchStyleBlock = styleHint
          ? `\n\n${asXML(styleHint, { tag: 'style-guidance' })}`
          : '';
        const overlapText = overlapFragments.join(' | ');

        const stitchInstruction = `${effectivePrompt}${stitchStyleBlock}

Stitch these two sections by resolving their overlapping region:

${asXML(stitchedResult, { tag: 'section-a', name: 'preserve-terminals' })}

${asXML(currentResult.content, { tag: 'section-b', name: 'preserve-terminals' })}

${asXML(overlapText, { tag: 'overlapping-fragments' })}

The terminal ends of both sections should be preserved. Only resolve the overlapping middle region where these fragments appear.

Add necessary connecting words, prepositions, conjunctions, or other filler text to create a coherent, grammatically correct, and semantically meaningful result. Output only the final stitched result with terminals preserved.`;

        const stitchResult = await retry(() => callLlm(stitchInstruction, runConfig), {
          label: `join-stitch-${i}`,
          config: runConfig,
        });

        stitchedResult = stitchResult || stitchedResult;
      } else {
        // No overlap - simple join
        const joinStyleBlock = styleHint
          ? `\n\n${asXML(styleHint, { tag: 'style-guidance' })}`
          : '';

        const joinInstruction = `${effectivePrompt}${joinStyleBlock}

Join these two non-overlapping sections:

${asXML(stitchedResult, { tag: 'section-1' })}

${asXML(currentResult.content, { tag: 'section-2' })}

Add necessary connecting words, prepositions, conjunctions, or other filler text to create a coherent, grammatically correct, and semantically meaningful result. Output only the joined result.`;

        const joinResult = await retry(() => callLlm(joinInstruction, runConfig), {
          label: `join-nonoverlap-${i}`,
          config: runConfig,
        });

        stitchedResult = joinResult || stitchedResult;
      }
    }

    emitter.complete({ outcome: Outcome.success, windows: windows.length });

    return stitchedResult;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

join.knownTexts = [];
