import chatGPT from '../../lib/chatgpt/index.js';
import stripResponse from '../../lib/strip-response/index.js';
import chunkSentences from '../../lib/chunk-sentences/index.js';
import retry from '../../lib/retry/index.js';

const timelineEventSchema = {
  type: 'object',
  properties: {
    events: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          timestamp: {
            type: 'string',
            description: 'ISO date (YYYY-MM-DD), relative time, or contextual marker',
          },
          name: {
            type: 'string',
            description: 'Concise event label (2-5 words)',
          },
        },
        required: ['timestamp', 'name'],
        additionalProperties: false,
      },
    },
  },
  required: ['events'],
  additionalProperties: false,
};

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
        json_schema: {
          name: 'timeline_events',
          schema: timelineEventSchema,
          strict: true,
        },
      },
      ...llm,
    },
    ...remainingOptions,
  });

  const parsed = JSON.parse(stripResponse(response));
  return parsed.events || [];
}

/**
 * Extract timeline events from text using multi-chunk processing
 * @param {string} text - The text to extract timeline from
 * @param {Object} options - Configuration options
 * @param {number} [options.chunkSize=2000] - Size of text chunks
 * @param {number} [options.maxParallel=3] - Maximum parallel processing
 * @param {Function} [options.onProgress] - Progress callback
 * @param {Object} [options.llm] - LLM configuration
 * @returns {Promise<Array>} Array of timeline events with {timestamp, name}
 */
export default async function timeline(text, options = {}) {
  const { chunkSize = 2000, maxParallel = 3, onProgress, llm, ...remainingOptions } = options;

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
  return mergeTimelineEvents([allEvents]);
}
