export const scaleSpecificationJsonSchema = {
  name: 'scale_specification',
  schema: {
    type: 'object',
    properties: {
      domain: {
        type: 'string',
        description: 'The expected input types, formats, and valid ranges',
      },
      range: {
        type: 'string',
        description: 'The output types, formats, and possible values',
      },
      mapping: {
        type: 'string',
        description: 'A clear description of how inputs map to outputs',
      },
    },
    required: ['domain', 'range', 'mapping'],
    additionalProperties: false,
  },
};
