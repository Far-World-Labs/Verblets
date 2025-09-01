export const logEntrySchema = {
  type: 'json_schema',
  json_schema: {
    name: 'log_entry',
    schema: {
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
};
