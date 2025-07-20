// JSON schemas for questions chain operations

export const questionsListSchema = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'string',
        description: 'A question exploring different perspectives or unknown information',
      },
      description: 'List of generated questions about the topic',
    },
  },
  required: ['items'],
  additionalProperties: false,
};

export const selectedQuestionSchema = {
  type: 'object',
  properties: {
    question: {
      type: 'string',
      description: 'The most interesting question selected from the list',
    },
  },
  required: ['question'],
  additionalProperties: false,
};
