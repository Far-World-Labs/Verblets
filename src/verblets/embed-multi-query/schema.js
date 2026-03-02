export const embedMultiQuerySchema = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: { type: 'string' },
      description: 'Diverse search query variants',
    },
  },
  required: ['items'],
  additionalProperties: false,
};
