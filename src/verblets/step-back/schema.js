export const stepBackSchema = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: { type: 'string' },
      description: 'Broader, more fundamental questions',
    },
  },
  required: ['items'],
  additionalProperties: false,
};
