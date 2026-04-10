import { jsonSchema } from '../../lib/llm/index.js';

const blockBoundariesSchema = {
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
        additionalProperties: false,
      },
    },
  },
  required: ['blocks'],
  additionalProperties: false,
};

export const blockExtractionSchema = jsonSchema('block_boundaries', blockBoundariesSchema);
