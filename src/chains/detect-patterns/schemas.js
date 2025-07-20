export const patternCandidatesJsonSchema = {
  name: 'pattern_candidates',
  schema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        description: 'Array of pattern candidates and instances',
        items: {
          type: 'object',
          description: 'A pattern template or an instance that matches a pattern',
          properties: {
            type: {
              type: 'string',
              enum: ['pattern', 'instance'],
              description: 'Whether this is a pattern template or an instance of a pattern',
            },
            template: {
              type: 'object',
              description: 'The pattern template or instance data',
            },
            count: {
              type: 'integer',
              minimum: 1,
              description: 'Number of times this pattern appears in the data',
            },
          },
          required: ['type', 'template', 'count'],
          additionalProperties: false,
        },
      },
    },
    required: ['items'],
    additionalProperties: false,
  },
};
