// JSON schema for sentiment verblet

export const sentimentSchema = {
  type: 'object',
  properties: {
    value: {
      type: 'string',
      enum: ['positive', 'negative', 'neutral'],
      description: 'The overall sentiment classification of the text',
    },
  },
  required: ['value'],
  additionalProperties: false,
};
