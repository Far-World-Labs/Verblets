export const schema = {
  type: 'object',
  properties: {
    value: {
      type: 'string',
      description: 'A hypothetical document passage that answers the query',
    },
  },
  required: ['value'],
  additionalProperties: false,
};
