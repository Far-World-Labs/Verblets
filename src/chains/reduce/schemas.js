export const reduceAccumulatorJsonSchema = {
  name: 'reduce_accumulator',
  schema: {
    type: 'object',
    properties: {
      accumulator: {
        type: 'string',
        description: 'The accumulated value after processing all items',
      },
    },
    required: ['accumulator'],
    additionalProperties: false,
  },
};
