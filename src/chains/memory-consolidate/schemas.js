export const memoryConsolidateSchema = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          summary: { type: 'string' },
          content: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          importance: { type: 'number' },
          mergedKeys: { type: 'array', items: { type: 'string' } },
        },
        required: ['key', 'summary', 'content', 'tags', 'importance', 'mergedKeys'],
        additionalProperties: false,
      },
    },
  },
  required: ['items'],
  additionalProperties: false,
};
