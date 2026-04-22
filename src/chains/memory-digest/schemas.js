export const memoryDigestSchema = {
  type: 'object',
  properties: {
    digest: { type: 'string' },
    themes: { type: 'array', items: { type: 'string' } },
    coverage: { type: 'number' },
  },
  required: ['digest', 'themes', 'coverage'],
  additionalProperties: false,
};
