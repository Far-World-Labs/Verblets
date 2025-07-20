export const centralTendencyResultsJsonSchema = {
  name: 'central_tendency_results',
  schema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        description: 'Array of centrality assessments for each evaluated item',
        items: {
          type: 'object',
          description: 'Centrality assessment for a single item',
          properties: {
            score: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              description:
                'Centrality score from 0 (not central) to 1 (highly central) based on prototype theory',
            },
            reason: {
              type: 'string',
              description: 'Brief explanation of why the item received its centrality score',
            },
            confidence: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              description: 'Confidence level in the assessment from 0 (low) to 1 (high)',
            },
          },
          required: ['score', 'reason', 'confidence'],
          additionalProperties: false,
        },
      },
    },
    required: ['items'],
    additionalProperties: false,
  },
};
