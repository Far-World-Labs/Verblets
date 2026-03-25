import callLlm from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import windowFor from '../../lib/window-for/index.js';
import { nameStep, track, getOptions, withPolicy } from '../../lib/context/option.js';

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
export default async function join(
  list,
  prompt = 'Join these text fragments into a coherent, unified text. Preserve key information while ensuring smooth transitions between fragments. Remove redundancy and maintain consistent style throughout.',
  config = {}
) {
  if (list.length === 0) return '';
  if (list.length === 1) return list[0];

  const runConfig = nameStep(name, config);
  const span = track(name, runConfig);
  const { styleHint, windowSize, overlapPercent } = await getOptions(runConfig, {
    fidelity: withPolicy(mapFidelity, ['windowSize', 'overlapPercent']),
    styleHint: '',
  });

  // Create overlapping windows using the windowFor utility
  const windows = windowFor(list, windowSize, overlapPercent);

  // Process each window
  const windowResults = [];

  //TODO:DOCS_OBSERVATIONS windows are processed sequentially — could use parallelBatch for concurrency since windows are independent after creation
  for (const [windowIndex, window] of windows.entries()) {
    const fragmentList = window.fragments.map((f, idx) => `${idx + 1}. ${f}`).join('\n');

    const instruction = `${prompt}${styleHint ? `\n\nStyle guidance: ${styleHint}` : ''}

Window ${windowIndex + 1} of ${windows.length} - Join these fragments:
${fragmentList}

Important: This is part of a larger sequence. Join these fragments while being mindful that this result will be combined with other processed windows. Add necessary connecting words, prepositions, conjunctions, or other filler text to create a coherent, grammatically correct, and semantically meaningful result. Output only the joined result for this window.`;

    const result = await retry(() => callLlm(instruction, runConfig), {
      label: `join-window-${windowIndex + 1}`,
      config: runConfig,
    });

    windowResults.push({
      content: result || window.fragments.join(' '),
      window,
    });
  }

  // Filter valid results
  const validResults = windowResults.filter((r) => r.content && r.content.trim());

  if (validResults.length === 1) {
    span.result();
    return validResults[0].content;
  }

  // Stitch operation: preserve terminals, only process overlapping sections
  let stitchedResult = validResults[0].content;

  for (let i = 1; i < validResults.length; i++) {
    const currentResult = validResults[i];
    const previousWindow = validResults[i - 1].window;
    const currentWindow = currentResult.window;

    // Find the overlapping region based on original fragment indices
    const overlapStart = Math.max(previousWindow.startIndex, currentWindow.startIndex);
    const overlapEnd = Math.min(previousWindow.endIndex, currentWindow.endIndex);

    if (overlapStart <= overlapEnd) {
      // There's an overlap - process only the overlapping section
      const overlapFragments = list.slice(overlapStart, overlapEnd + 1);

      const stitchInstruction = `${prompt}${styleHint ? `\n\nStyle guidance: ${styleHint}` : ''}

Stitch these two sections by resolving their overlapping region:

SECTION A (preserve terminals): ${stitchedResult}

SECTION B (preserve terminals): ${currentResult.content}

OVERLAPPING FRAGMENTS (original): ${overlapFragments.join(' | ')}

The terminal ends of both sections should be preserved. Only resolve the overlapping middle region where these fragments appear: ${overlapFragments.join(
        ', '
      )}

Add necessary connecting words, prepositions, conjunctions, or other filler text to create a coherent, grammatically correct, and semantically meaningful result. Output only the final stitched result with terminals preserved.`;

      const stitchResult = await retry(() => callLlm(stitchInstruction, runConfig), {
        label: `join-stitch-${i}`,
        config: runConfig,
      });

      stitchedResult = stitchResult || stitchedResult;
    } else {
      // No overlap - simple join
      const joinInstruction = `${prompt}${styleHint ? `\n\nStyle guidance: ${styleHint}` : ''}

Join these two non-overlapping sections:
1. ${stitchedResult}
2. ${currentResult.content}

Add necessary connecting words, prepositions, conjunctions, or other filler text to create a coherent, grammatically correct, and semantically meaningful result. Output only the joined result.`;

      const joinResult = await retry(() => callLlm(joinInstruction, runConfig), {
        label: `join-nonoverlap-${i}`,
        config: runConfig,
      });

      stitchedResult = joinResult || stitchedResult;
    }
  }

  span.result();

  return stitchedResult;
}
