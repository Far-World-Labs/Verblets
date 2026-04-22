export const memoryRecallSchema = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          relevance: { type: 'number' },
          reasoning: { type: 'string' },
        },
        required: ['key', 'relevance', 'reasoning'],
        additionalProperties: false,
      },
    },
  },
  required: ['items'],
  additionalProperties: false,
};
