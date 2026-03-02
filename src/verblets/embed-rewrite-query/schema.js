export const embedRewriteQuerySchema = {
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
