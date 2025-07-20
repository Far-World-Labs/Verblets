// JSON schema for name-similar-to verblet

export const nameSimilarSchema = {
  type: 'object',
  properties: {
    value: {
      type: 'string',
      description: 'A name similar to the examples that fits the description',
    },
  },
  required: ['value'],
  additionalProperties: false,
};
