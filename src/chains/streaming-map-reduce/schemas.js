export const streamingReduceAccumulatorSchema = {
  name: 'streaming_reduce_accumulator',
  schema: {
    type: 'object',
    properties: {
      accumulator: {
        type: 'string',
        description: 'The accumulated value after folding the current batch',
      },
    },
    required: ['accumulator'],
    additionalProperties: false,
  },
};
