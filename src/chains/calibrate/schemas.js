export const calibrateSpecificationJsonSchema = {
  name: 'calibrate_specification',
  schema: {
    type: 'object',
    properties: {
      corpusProfile: {
        type: 'string',
        description: 'Overview of the corpus sensitivity landscape',
      },
      classificationCriteria: {
        type: 'string',
        description: 'How to assign severity to individual items',
      },
      salienceCriteria: {
        type: 'string',
        description: 'How to determine salience relative to the corpus baseline',
      },
      categoryNotes: {
        type: 'string',
        description: 'Per-category observations and calibration notes',
      },
    },
    required: ['corpusProfile', 'classificationCriteria', 'salienceCriteria', 'categoryNotes'],
    additionalProperties: false,
  },
};
