export const logBatchSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'log_batch',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              timestamp: { type: 'string' },
              level: {
                type: 'string',
                enum: ['INFO', 'DEBUG', 'ERROR', 'WARN'],
              },
              message: { type: 'string' },
              details: { type: 'string' },
            },
            required: ['timestamp', 'level', 'message'],
          },
        },
      },
      required: ['items'],
    },
  },
};
