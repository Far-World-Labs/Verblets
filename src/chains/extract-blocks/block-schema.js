export const blockExtractionSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'block_boundaries',
    schema: {
      type: 'object',
      properties: {
        blocks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              startLine: {
                type: 'number',
                description: 'Starting line number in the window (0-indexed)',
              },
              endLine: {
                type: 'number',
                description: 'Ending line number in the window (inclusive, 0-indexed)',
              },
            },
            required: ['startLine', 'endLine'],
          },
        },
      },
      required: ['blocks'],
    },
  },
};
