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
          properties: {
            name: {
              type: 'string',
              description: 'Full name of the person',
            },
            background: {
              type: 'string',
              description: 'Professional background and experience relevant to the description',
            },
            location: {
              type: 'string',
              description: 'Geographic location or region where the person is based',
            },
            role: {
              type: 'string',
              description: 'Current role or position',
            },
            specialty: {
              type: 'string',
              description: 'Area of expertise or specialty',
            },
          },
          required: ['name'],
          additionalProperties: true,
        },
      },
    },
    required: ['people'],
    additionalProperties: false,
  },
};
