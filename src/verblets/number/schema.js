// JSON schema for number verblet

export const numberSchema = {
  type: 'object',
  properties: {
    value: {
      oneOf: [
        { type: 'number', description: 'The numeric value extracted from the text' },
        {
          type: 'string',
          enum: ['undefined'],
          description: 'When no clear numeric value can be determined',
        },
      ],
    },
  },
  required: ['value'],
  additionalProperties: false,
};
