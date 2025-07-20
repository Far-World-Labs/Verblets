export const filterDecisionsJsonSchema = {
  name: 'filter_decisions',
  schema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        description: 'Array of yes/no decisions for each item in the input list, in the same order',
        items: {
          type: 'string',
          enum: ['yes', 'no'],
          description:
            'Decision for whether to include (yes) or exclude (no) the corresponding item',
        },
      },
    },
    required: ['items'],
    additionalProperties: false,
  },
};
