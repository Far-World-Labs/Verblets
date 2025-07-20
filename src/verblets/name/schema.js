// JSON schema for name verblet

export const nameSchema = {
  type: 'object',
  properties: {
    value: {
      type: 'string',
      description: 'A concise, memorable name for the subject, or "undefined" if unable to suggest',
    },
  },
  required: ['value'],
  additionalProperties: false,
};
