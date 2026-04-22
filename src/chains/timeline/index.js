import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import chunkSentences from '../../lib/chunk-sentences/index.js';
import retry from '../../lib/retry/index.js';
import parallelBatch from '../../lib/parallel-batch/index.js';
import createProgressEmitter, { scopePhase } from '../../lib/progress/index.js';
import map from '../map/index.js';
import reduce from '../reduce/index.js';
import { timelineEventJsonSchema } from './schemas.js';
import { debug } from '../../lib/debug/index.js';
import { DomainEvent, Outcome, ErrorPosture } from '../../lib/progress/constants.js';
import { nameStep, getOptions, withPolicy } from '../../lib/context/option.js';
import { resolveArgs, resolveTexts } from '../../lib/instruction/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import understandingEvolutionChain from '../understanding-evolution/index.js';

const name = 'timeline';

// ===== Option Mappers =====

const DEFAULT_ENRICHMENT = { llmDedup: true, knowledgeBase: false, enrichMap: false };

/**
 * Map enrichment option to a timeline processing posture.
 * Coordinates three phase gates in the timeline pipeline.
 * low: extraction + deterministic merge only — no LLM dedup, no knowledge enrichment. Cheapest.
 * high: full pipeline — LLM dedup + knowledge base building + enrichment mapping. Richest output.
 * Default: extraction + LLM dedup only.
 * @param {string|object|undefined} value
 * @returns {{ llmDedup: boolean, knowledgeBase: boolean, enrichMap: boolean }}
 */
export const mapEnrichment = (value) => {
  if (value === undefined) return DEFAULT_ENRICHMENT;
  if (typeof value === 'object') return value;
  return (
    {
      low: { llmDedup: false, knowledgeBase: false, enrichMap: false },
      med: DEFAULT_ENRICHMENT,
      high: { llmDedup: true, knowledgeBase: true, enrichMap: true },
    }[value] ?? DEFAULT_ENRICHMENT
  );
};

const extractTimelineInstructions = `Extract timeline events from this text chunk.

For each event provide:
- timestamp: Date or time reference from the text
- name: Exact event description as written in the text

Use consistent naming - preserve the exact phrasing from the source text.`;

/**
 * Sort timeline events by date parsing only
 */
function sortTimelineEvents(events) {
  return events.toSorted((a, b) => {
    // Try ISO date parsing
    const dateA = new Date(a.timestamp);
    const dateB = new Date(b.timestamp);

    if (!isNaN(dateA) && !isNaN(dateB)) {
      return dateA - dateB;
    }

    // If only one is a valid date, it comes first
    if (!isNaN(dateA)) return -1;
    if (!isNaN(dateB)) return 1;

    // For non-parseable dates, maintain original order
    return 0;
  });
}

/**
 * Merge overlapping or duplicate events from different chunks
 */
function mergeTimelineEvents(eventArrays) {
  const allEvents = eventArrays.flat();
  const merged = [];
  const seenNames = new Set();

  for (const event of allEvents) {
    // Use lowercase name for deduplication to handle case variations
    const normalizedName = event.name.toLowerCase().trim();

    // Skip if we've already seen this event name (case-insensitive)
    if (!seenNames.has(normalizedName)) {
      seenNames.add(normalizedName);
      merged.push(event);
    }
  }

  return sortTimelineEvents(merged);
}

/**
 * Extract events from a single chunk
 */
async function extractFromChunk(chunk, options = {}) {
  const response = await callLlm(chunk, {
    ...options,
    responseFormat: jsonSchema(timelineEventJsonSchema.name, timelineEventJsonSchema.schema),
  });

  return response.events || [];
}

/**
 * Extract timeline events from text using multi-chunk processing
 * @param {string} text - The text to extract timeline from
 * @param {Object} config - Configuration options
 * @param {number} [config.chunkSize=2000] - Size of text chunks
 * @param {number} [config.maxParallel=3] - Maximum parallel processing
 * @param {Function} [config.onProgress] - Progress callback
 * @param {string|Object} [config.llm] - LLM configuration
 * @param {string|Object} [config.enrichment] - Controls post-extraction phases ('low'|'high' or object with {llmDedup, knowledgeBase, enrichMap})
 * @param {number} [config.batchSize] - Batch size for reduce/map operations when enriching (auto-calculated if not provided)
 * @returns {Promise<Array>} Array of timeline events with {timestamp, name}
 */
export default async function timeline(text, instructions, config) {
  [instructions, config] = resolveArgs(instructions, config, ['knowledge']);
  const { text: instructionText, known, context } = resolveTexts(instructions, ['knowledge']);
  const runConfig = nameStep(name, config);
  const extractionSystemPrompt = [extractTimelineInstructions, instructionText, context]
    .filter(Boolean)
    .join('\n\n');
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();
  const {
    chunkSize,
    overlap,
    maxParallel,
    errorPosture,
    llmDedup,
    knowledgeBase: enableKnowledgeBase,
    enrichMap: _enrichMap,
    understandingEvolution: enableUnderstandingEvolution,
  } = await getOptions(runConfig, {
    enrichment: withPolicy(mapEnrichment, ['llmDedup', 'knowledgeBase', 'enrichMap']),
    chunkSize: 2000,
    overlap: 200,
    maxParallel: 3,
    errorPosture: ErrorPosture.resilient,
    understandingEvolution: false,
  });
  const providedKnowledge = known.knowledge;
  const { onProgress, batchSize, now } = runConfig;

  try {
    const phaseCount =
      1 +
      (llmDedup ? 1 : 0) +
      (enableKnowledgeBase ? 2 : 0) +
      (enableUnderstandingEvolution ? 1 : 0);
    const batchDone = emitter.batch(phaseCount);

    // Create overlapping chunks to avoid missing events at boundaries
    const chunks = chunkSentences(text, chunkSize, { overlap });

    // Process chunks in parallel batches
    const allEvents = [];
    let failedChunks = 0;

    await parallelBatch(
      chunks,
      async (chunk, chunkIndex) => {
        try {
          const events = await retry(
            () =>
              extractFromChunk(chunk, { ...runConfig, now, systemPrompt: extractionSystemPrompt }),
            {
              label: `timeline chunk ${chunkIndex + 1}`,
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
              `Timeline extraction failed for chunk ${chunkIndex + 1}:`,
              error.message
            );
          }
          onProgress?.(chunkIndex + 1, chunks.length);
        }
      },
      {
        maxParallel,
        errorPosture,
        label: 'timeline chunks',
        abortSignal: runConfig.abortSignal,
      }
    );

    // Merge and deduplicate events from all chunks
    debug(`Timeline: processed ${chunks.length} chunks, found ${allEvents.length} total events`);

    batchDone(1);

    let mergedEvents = mergeTimelineEvents([allEvents]);

    // Deduplicate using a single structured LLM call rather than reduce's string
    // accumulator, which is fragile for structured data (events get lost during
    // string serialization round-trips).
    if (llmDedup && mergedEvents.length > 0) {
      const eventList = mergedEvents.map((e) => `- ${e.timestamp}: ${e.name}`).join('\n');

      const deduplicationPrompt = `Consolidate these timeline events by merging duplicates that refer to the same occurrence. Keep the most descriptive version of each event and preserve ALL unique events.

${asXML(eventList, { tag: 'events' })}`;

      const deduplicatedResult = await callLlm(deduplicationPrompt, {
        ...runConfig,
        systemPrompt:
          'You are a timeline deduplication engine. Return all unique events, merging only true duplicates.',
        responseFormat: jsonSchema(timelineEventJsonSchema.name, timelineEventJsonSchema.schema),
      });

      const deduplicatedEvents = deduplicatedResult?.events || deduplicatedResult;
      if (Array.isArray(deduplicatedEvents) && deduplicatedEvents.length > 0) {
        mergedEvents = sortTimelineEvents(deduplicatedEvents);
      }
      batchDone(1);
    }

    // Enrich with knowledge if requested (or pre-supplied)
    if ((enableKnowledgeBase || providedKnowledge) && mergedEvents.length > 0) {
      let knownEvents = [];

      if (providedKnowledge) {
        // Knowledge base pre-supplied — skip reduce derivation
        try {
          const parsed =
            typeof providedKnowledge === 'string'
              ? JSON.parse(providedKnowledge)
              : providedKnowledge;
          knownEvents = sortTimelineEvents(parsed.events || parsed);
        } catch (e) {
          debug('Failed to parse provided knowledge:', e.message);
        }
      } else {
        // First, use reduce to build a knowledge base of known dates
        const focusArea = instructionText
          ? `\n${asXML(instructionText, { tag: 'focus-area' })}`
          : '';
        const knowledgeBaseInstructions = `You are building a historical knowledge base.${focusArea}
Given the current knowledge base and a new event, return an updated knowledge base that:
1. Adds accurate dates for any events you recognize
2. Corrects any wrong dates based on your knowledge
3. Removes duplicates while keeping the most accurate information
4. Adds important related events that fall within the timeline scope (between first and last events)
5. Include events that provide crucial context or fill important gaps

Return as JSON with the same event format, maintaining chronological order.`;

        // Convert events to strings for reduce
        const eventStrings = mergedEvents.map((e) => `${e.timestamp}: ${e.name}`);

        // Reduce to build knowledge base
        const knowledgeBase = await reduce(eventStrings, knowledgeBaseInstructions, {
          ...runConfig,
          initial: JSON.stringify({ events: [] }),
          responseFormat: jsonSchema(timelineEventJsonSchema.name, timelineEventJsonSchema.schema),
          ...(batchSize !== undefined && { batchSize }),
          onProgress: scopePhase(runConfig.onProgress, 'reduce:knowledge-base'),
        });

        try {
          const parsed = knowledgeBase;
          knownEvents = sortTimelineEvents(parsed.events || []);
        } catch (e) {
          debug('Failed to parse knowledge base:', e.message);
        }
      }

      emitter.emit({ event: DomainEvent.phase, phase: 'enrichment', knowledgeBase: knownEvents });
      batchDone(1);

      // Create the enrichment instructions with knowledge base embedded
      const knowledgeBaseStr = knownEvents.map((e) => `- ${e.timestamp}: ${e.name}`).join('\n');
      const enrichmentInstructions = `Given an extracted event, enrich it using this knowledge base:

${asXML(knowledgeBaseStr, { tag: 'knowledge-base' })}

Rules:
1. If the knowledge base has a more accurate date for this event, use it
2. If the extracted date is vague and knowledge base has precise date, use the precise one
3. If there's a conflict, prefer the knowledge base if you're confident it's correct
4. Keep the original if the knowledge base doesn't have better information

Return the enriched event as: "YYYY-MM-DD: Event name" or with the appropriate timestamp format.`;

      // Map over extracted events to enrich them
      const enrichedResults = await map(
        mergedEvents.map((event) => `${event.timestamp}: ${event.name}`),
        enrichmentInstructions,
        {
          ...runConfig,
          ...(batchSize !== undefined && { batchSize }),
          maxParallel,
          onProgress: scopePhase(runConfig.onProgress, 'map:enrichment'),
        }
      );

      // Parse enriched events
      const enrichedExtractedEvents = enrichedResults.map((enrichedStr, i) => {
        if (!enrichedStr) return mergedEvents[i];

        // Parse the enriched format "timestamp: name"
        const colonIndex = enrichedStr.indexOf(':');
        if (colonIndex > 0) {
          const newTimestamp = enrichedStr.substring(0, colonIndex).trim();
          const newName = enrichedStr.substring(colonIndex + 1).trim();

          // Only mark as enriched if the timestamp actually changed
          const timestampChanged = newTimestamp !== mergedEvents[i].timestamp;

          return {
            timestamp: newTimestamp,
            name: newName,
            ...(timestampChanged && { enriched: true }),
          };
        }

        return mergedEvents[i];
      });

      // Now merge the enriched extracted events with additional events from knowledge base
      // that weren't in the original text but are important for the timeline
      const extractedEventNames = new Set(enrichedExtractedEvents.map((e) => e.name.toLowerCase()));

      // Add knowledge base events that aren't already in extracted events
      const additionalEvents = knownEvents.filter((knownEvent) => {
        // Check if this event is not already in our extracted events
        return !extractedEventNames.has(knownEvent.name.toLowerCase());
      });

      // Combine and sort all events
      mergedEvents = sortTimelineEvents([...enrichedExtractedEvents, ...additionalEvents]);
      batchDone(1);
    }

    if (enableUnderstandingEvolution) {
      const evolutionEvents = await understandingEvolutionChain(text, instructions, {
        ...runConfig,
        onProgress: scopePhase(runConfig.onProgress, 'understanding-evolution'),
      });

      const annotatedEvolution = evolutionEvents.map((e) => ({ ...e, evolution: true }));
      mergedEvents = sortTimelineEvents([...mergedEvents, ...annotatedEvolution]);
      batchDone(1);
    }

    const outcome = failedChunks > 0 ? Outcome.partial : Outcome.success;
    emitter.complete({ outcome });

    return mergedEvents;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

timeline.knownTexts = ['knowledge'];
