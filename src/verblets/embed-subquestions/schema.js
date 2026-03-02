export const embedSubquestionsSchema = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: { type: 'string' },
      description: 'Atomic sub-questions',
    },
  },
  required: ['items'],
  additionalProperties: false,
};
