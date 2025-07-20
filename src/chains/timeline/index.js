import chatGPT from '../../lib/chatgpt/index.js';
import chunkSentences from '../../lib/chunk-sentences/index.js';
import retry from '../../lib/retry/index.js';
import map from '../map/index.js';
import reduce from '../reduce/index.js';
import { timelineEventJsonSchema } from './schemas.js';

const extractTimelineInstructions = `Extract timeline events from this text chunk.

Find:
- Explicitly mentioned dates and events
- Implicit historical context events
- Narrative transitions and key moments

For each event provide:
- timestamp: ISO date, relative time ("early 2020"), or contextual marker ("after the meeting")
- name: Brief event label that captures the essence of the event

Focus on temporally significant events. Include contextual events that help establish chronology.`;

/**
 * Sort timeline events by date parsing only
 */
function sortTimelineEvents(events) {
  return events.sort((a, b) => {
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
  const seen = new Set();

  for (const event of allEvents) {
    // Create a key for deduplication
    const key = `${event.timestamp}-${event.name}`.toLowerCase();

    if (!seen.has(key)) {
      seen.add(key);
      merged.push(event);
    }
  }

  return sortTimelineEvents(merged);
}

/**
 * Extract events from a single chunk
 */
async function extractFromChunk(chunk, options = {}) {
  const { llm, ...remainingOptions } = options;

  const response = await chatGPT(chunk, {
    modelOptions: {
      systemPrompt: extractTimelineInstructions,
      response_format: {
        type: 'json_schema',
        json_schema: timelineEventJsonSchema,
      },
      ...llm,
    },
    ...remainingOptions,
  });

  return response.events || [];
}

/**
 * Extract timeline events from text using multi-chunk processing
 * @param {string} text - The text to extract timeline from
 * @param {Object} options - Configuration options
 * @param {number} [options.chunkSize=2000] - Size of text chunks
 * @param {number} [options.maxParallel=3] - Maximum parallel processing
 * @param {Function} [options.onProgress] - Progress callback
 * @param {Object} [options.llm] - LLM configuration
 * @param {boolean} [options.enrichWithKnowledge=false] - Enrich dates with LLM knowledge
 * @param {number} [options.batchSize] - Batch size for reduce/map operations when enriching (auto-calculated if not provided)
 * @returns {Promise<Array>} Array of timeline events with {timestamp, name}
 */
export default async function timeline(text, options = {}) {
  const {
    chunkSize = 2000,
    maxParallel = 3,
    onProgress,
    llm,
    enrichWithKnowledge = false,
    batchSize,
    ...remainingOptions
  } = options;

  // Create overlapping chunks to avoid missing events at boundaries
  const chunks = chunkSentences(text, chunkSize, { overlap: 200 });

  // Process chunks in parallel batches
  const allEvents = [];
  const promises = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunkIndex = i;

    const p = retry(() => extractFromChunk(chunks[chunkIndex], { llm, ...remainingOptions }), {
      label: `timeline chunk ${chunkIndex + 1}`,
    })
      .then((events) => {
        allEvents.push(...events);
        onProgress?.(chunkIndex + 1, chunks.length);
      })
      .catch((error) => {
        if (process.env.VERBLETS_DEBUG) {
          console.warn(`Timeline extraction failed for chunk ${chunkIndex + 1}:`, error.message);
        }
        onProgress?.(chunkIndex + 1, chunks.length);
      });

    promises.push(p);

    // Control parallelism
    if (promises.length >= maxParallel) {
      await Promise.all(promises);
      promises.length = 0;
    }
  }

  // Wait for remaining promises
  if (promises.length > 0) {
    await Promise.all(promises);
  }

  // Merge and deduplicate events from all chunks
  if (process.env.VERBLETS_DEBUG) {
    console.log(
      `Timeline: processed ${chunks.length} chunks, found ${allEvents.length} total events`
    );
  }

  let mergedEvents = mergeTimelineEvents([allEvents]);

  // Enrich with knowledge if requested
  if (enrichWithKnowledge && mergedEvents.length > 0) {
    // First, use reduce to build a knowledge base of known dates
    const knowledgeBaseInstructions = `You are building a historical knowledge base. 
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
      initialValue: JSON.stringify({ events: [] }),
      ...(batchSize !== undefined && { batchSize }),
      llm,
      ...remainingOptions,
    });

    let knownEvents = [];
    try {
      const parsed = JSON.parse(knowledgeBase);
      knownEvents = sortTimelineEvents(parsed.events || []); // Ensure knowledge base is sorted
    } catch (e) {
      if (process.env.VERBLETS_DEBUG) {
        console.warn('Failed to parse knowledge base:', e.message);
      }
    }

    // Create the enrichment instructions with knowledge base embedded
    const knowledgeBaseStr = knownEvents.map((e) => `- ${e.timestamp}: ${e.name}`).join('\n');
    const enrichmentInstructions = `Given an extracted event, enrich it using this knowledge base:

<knowledge_base>
${knowledgeBaseStr}
</knowledge_base>

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
        ...(batchSize !== undefined && { batchSize }),
        maxParallel,
        llm,
        ...remainingOptions,
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
  }

  return mergedEvents;
}
