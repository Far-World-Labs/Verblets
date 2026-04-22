export const understandingEvolutionSchema = {
  name: 'understanding_evolution',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      events: {
        type: 'array',
        description: 'Array of understanding evolution events extracted from the text',
        items: {
          type: 'object',
          description: 'A shift in understanding or comprehension',
          properties: {
            timestamp: {
              type: 'string',
              description: 'ISO date (YYYY-MM-DD), relative time, or contextual marker',
            },
            name: {
              type: 'string',
              description: 'Concise label for the understanding shift (2-5 words)',
            },
            fromState: {
              type: 'string',
              description: 'Prior understanding or belief state',
            },
            toState: {
              type: 'string',
              description: 'New understanding or belief state',
            },
            trigger: {
              type: 'string',
              description: 'What caused the shift in understanding',
            },
          },
          required: ['timestamp', 'name', 'fromState', 'toState', 'trigger'],
          additionalProperties: false,
        },
      },
    },
    required: ['events'],
    additionalProperties: false,
  },
};
