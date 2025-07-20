export const peopleListJsonSchema = {
  name: 'people_list',
  schema: {
    type: 'object',
    properties: {
      people: {
        type: 'array',
        description: 'Array of people matching the provided description',
        items: {
          type: 'object',
          description: 'A person with relevant attributes based on the description',
          additionalProperties: true,
        },
      },
    },
    required: ['people'],
    additionalProperties: false,
  },
};
