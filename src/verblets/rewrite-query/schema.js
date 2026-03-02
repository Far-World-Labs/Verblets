export const rewriteQuerySchema = {
  type: 'object',
  properties: {
    value: {
      type: 'string',
      description: 'The rewritten search query',
    },
  },
  required: ['value'],
  additionalProperties: false,
};
