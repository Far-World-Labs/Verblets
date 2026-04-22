export const memoryForgetSchema = {
  type: 'object',
  properties: {
    forgotten: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['key', 'reason'],
        additionalProperties: false,
      },
    },
    retained: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['forgotten', 'retained'],
  additionalProperties: false,
};
