import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import chunkSentences from '../../lib/chunk-sentences/index.js';
import retry from '../../lib/retry/index.js';
import parallelBatch from '../../lib/parallel-batch/index.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { DomainEvent, Outcome, ErrorPosture } from '../../lib/progress/constants.js';
import { nameStep, getOptions, withPolicy } from '../../lib/context/option.js';
import { resolveArgs, resolveTexts } from '../../lib/instruction/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { understandingEvolutionSchema } from './schemas.js';

const name = 'understanding-evolution';

// ===== Option Mappers =====

const DEFAULT_DEPTH = { detectImplicit: true, consolidate: false };

/**
 * Map depth option to an understanding extraction posture.
 * Coordinates implicit detection and consolidation phases.
 * low: explicit shifts only — no implicit detection, no consolidation. Cheapest.
 * high: full pipeline — implicit detection + consolidation of related shifts. Richest output.
 * Default: explicit + implicit detection, no consolidation.
 * @param {string|object|undefined} value
 * @returns {{ detectImplicit: boolean, consolidate: boolean }}
 */
export const mapDepth = (value) => {
  if (value === undefined) return DEFAULT_DEPTH;
  if (typeof value === 'object') return value;
  return (
    {
      low: { detectImplicit: false, consolidate: false },
      med: DEFAULT_DEPTH,
      high: { detectImplicit: true, consolidate: true },
    }[value] ?? DEFAULT_DEPTH
  );
};

const baseExtractionPrompt = `Extract moments where understanding, comprehension, or knowledge states change in this text.

For each shift provide:
- timestamp: When the shift occurred (date, time reference, or contextual marker)
- name: Brief label for the shift (2-5 words)
- fromState: What was understood or believed before
- toState: What was understood or believed after
- trigger: What caused the shift in understanding

Focus on paradigm shifts, corrections of prior misconceptions, new discoveries that change existing knowledge, and evolving interpretations of evidence.`;

const implicitDetectionAddendum = `

Also detect:
- Implied understanding changes not explicitly stated
- Gradual comprehension shifts across multiple passages
- Subtle reframings of existing knowledge`;

function sortByTimestamp(events) {
  return events.toSorted((a, b) => {
    const dateA = new Date(a.timestamp);
    const dateB = new Date(b.timestamp);
    if (!isNaN(dateA) && !isNaN(dateB)) return dateA - dateB;
    if (!isNaN(dateA)) return -1;
    if (!isNaN(dateB)) return 1;
    return 0;
  });
}

function mergeEvents(eventArrays) {
  const allEvents = eventArrays.flat();
  const merged = [];
  const seen = new Set();

  for (const event of allEvents) {
    const key = `${event.name.toLowerCase().trim()}|${event.fromState.toLowerCase().trim()}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(event);
    }
  }

  return sortByTimestamp(merged);
}

async function extractFromChunk(chunk, options = {}) {
  const response = await callLlm(chunk, {
    ...options,
    responseFormat: jsonSchema(
      understandingEvolutionSchema.name,
      understandingEvolutionSchema.schema
    ),
  });
  return response.events || [];
}

/**
 * Extract understanding evolution events from text.
 * Identifies moments where comprehension states shift — paradigm changes,
 * corrections of misconceptions, new discoveries, evolving interpretations.
 *
 * @param {string} text - The text to analyze for understanding shifts
 * @param {string|Object} [instructions] - Additional extraction guidance or instruction bundle
 * @param {Object} [config] - Configuration options
 * @param {number} [config.chunkSize=2000] - Size of text chunks
 * @param {number} [config.overlap=200] - Overlap between chunks
 * @param {number} [config.maxParallel=3] - Maximum parallel chunk processing
 * @param {string|Object} [config.depth] - Controls extraction depth ('low'|'med'|'high' or {detectImplicit, consolidate})
 * @param {Function} [config.onProgress] - Progress callback
 * @param {string|Object} [config.llm] - LLM configuration
 * @returns {Promise<Array<{timestamp, name, fromState, toState, trigger}>>}
 */
export default async function understandingEvolution(text, instructions, config) {
  [instructions, config] = resolveArgs(instructions, config, ['domain']);
  const { text: instructionText, context } = resolveTexts(instructions, ['domain']);
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();
  emitter.emit({ event: DomainEvent.input, value: text });

  const { chunkSize, overlap, maxParallel, errorPosture, detectImplicit, consolidate } =
    await getOptions(runConfig, {
      depth: withPolicy(mapDepth, ['detectImplicit', 'consolidate']),
      chunkSize: 2000,
      overlap: 200,
      maxParallel: 3,
      errorPosture: ErrorPosture.resilient,
    });

  const systemPrompt = [
    baseExtractionPrompt + (detectImplicit ? implicitDetectionAddendum : ''),
    instructionText,
    context,
  ]
    .filter(Boolean)
    .join('\n\n');

  const { onProgress, now } = runConfig;

  try {
    const phaseCount = 1 + (consolidate ? 1 : 0);
    const batchDone = emitter.batch(phaseCount);

    const chunks = chunkSentences(text, chunkSize, { overlap });
    const allEvents = [];
    let failedChunks = 0;

    await parallelBatch(
      chunks,
      async (chunk, chunkIndex) => {
        try {
          const events = await retry(
            () => extractFromChunk(chunk, { ...runConfig, now, systemPrompt }),
            {
              label: `understanding-evolution chunk ${chunkIndex + 1}`,
              config: runConfig,
            }
          );
          allEvents.push(...events);
          onProgress?.(chunkIndex + 1, chunks.length);
        } catch (error) {
          failedChunks++;
          if (errorPosture === ErrorPosture.strict) throw error;
          if (runConfig.logger?.warn) {
            runConfig.logger.warn(
              `Understanding evolution extraction failed for chunk ${chunkIndex + 1}:`,
              error.message
            );
          }
          onProgress?.(chunkIndex + 1, chunks.length);
        }
      },
      {
        maxParallel,
        errorPosture,
        label: 'understanding-evolution chunks',
        abortSignal: runConfig.abortSignal,
      }
    );

    batchDone(1);

    let mergedEvents = mergeEvents([allEvents]);

    if (consolidate && mergedEvents.length > 0) {
      const eventList = mergedEvents
        .map(
          (e) =>
            `- ${e.timestamp}: ${e.name} (${e.fromState} \u2192 ${e.toState}, trigger: ${e.trigger})`
        )
        .join('\n');

      const consolidationPrompt = `Consolidate these understanding evolution events by merging related shifts that form part of the same conceptual transition. Preserve all distinct shifts but combine redundant ones.

${asXML(eventList, { tag: 'events' })}`;

      const consolidated = await callLlm(consolidationPrompt, {
        ...runConfig,
        systemPrompt:
          'You are an understanding evolution consolidation engine. Return all unique comprehension shifts, merging only true duplicates that describe the same conceptual transition.',
        responseFormat: jsonSchema(
          understandingEvolutionSchema.name,
          understandingEvolutionSchema.schema
        ),
      });

      const consolidatedEvents = consolidated?.events || consolidated;
      if (Array.isArray(consolidatedEvents) && consolidatedEvents.length > 0) {
        mergedEvents = sortByTimestamp(consolidatedEvents);
      }
      batchDone(1);
    }

    emitter.emit({ event: DomainEvent.output, value: mergedEvents });

    const outcome = failedChunks > 0 ? Outcome.partial : Outcome.success;
    emitter.complete({ outcome });

    return mergedEvents;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

understandingEvolution.knownTexts = ['domain'];
