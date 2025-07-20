// JSON schema for bool verblet

export const booleanSchema = {
  type: 'object',
  properties: {
    value: {
      type: 'string',
      enum: ['true', 'false', 'undefined'],
      description: 'The boolean evaluation of the input text, or "undefined" if uncertain',
    },
  },
  required: ['value'],
  additionalProperties: false,
};
