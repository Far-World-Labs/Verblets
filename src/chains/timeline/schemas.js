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
