export const glossaryExtractionJsonSchema = {
  name: 'glossary_extraction',
  schema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        description: 'One result per text chunk in the batch',
        items: {
          type: 'object',
          description: 'Terms extracted from a single text chunk',
          properties: {
            terms: {
              type: 'array',
              description: 'List of specialized terms found in this chunk',
              items: {
                type: 'string',
                description: 'A technical or domain-specific term',
              },
            },
          },
          required: ['terms'],
          additionalProperties: false,
        },
      },
    },
    required: ['items'],
    additionalProperties: false,
  },
};
