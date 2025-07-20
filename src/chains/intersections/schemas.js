// JSON schemas for intersections chain operations

export const intersectionElementsSchema = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'string',
        description: 'An example or instance that belongs to all specified categories',
      },
      description: 'List of elements in the intersection of all categories',
    },
  },
  required: ['items'],
  additionalProperties: false,
};
