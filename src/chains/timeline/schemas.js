export const timelineEventJsonSchema = {
  name: 'timeline_events',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      events: {
        type: 'array',
        description: 'Array of timeline events extracted from the text',
        items: {
          type: 'object',
          description: 'A single event with timestamp and descriptive name',
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
  },
};

export const timelineMergeJsonSchema = {
  name: 'timeline_merge',
  schema: {
    type: 'object',
    properties: {
      events: {
        type: 'array',
        description: 'Merged and deduplicated timeline events in chronological order',
        items: {
          type: 'object',
          description: 'A timeline event with enhanced information from merging',
          properties: {
            timestamp: {
              type: 'string',
              description: 'Most specific timestamp available for this event',
            },
            name: {
              type: 'string',
              description: 'Most descriptive event name from merged sources',
            },
            category: {
              type: 'string',
              description: 'Event category or type (optional)',
            },
          },
          required: ['timestamp', 'name'],
          additionalProperties: false,
        },
      },
    },
    required: ['events'],
    additionalProperties: false,
  },
};
