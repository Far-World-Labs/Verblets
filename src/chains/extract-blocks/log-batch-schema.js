import { jsonSchema } from '../../lib/llm/index.js';

export const logBatchSchema = jsonSchema('log_batch', {
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
        additionalProperties: false,
      },
    },
  },
  required: ['items'],
  additionalProperties: false,
});
