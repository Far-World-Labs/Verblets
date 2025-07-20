export const findResultJsonSchema = {
  name: 'find_result',
  schema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'string',
          description: 'The single best matching item from the input list',
        },
        maxItems: 1,
        description: 'Array containing the single best matching item, or empty array if no match',
      },
    },
    required: ['items'],
    additionalProperties: false,
  },
};
