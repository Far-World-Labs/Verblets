export const memorySaveSchema = {
  type: 'object',
  properties: {
    key: { type: 'string' },
    summary: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    importance: { type: 'number' },
  },
  required: ['key', 'summary', 'tags', 'importance'],
  additionalProperties: false,
};
