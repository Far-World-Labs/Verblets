export const testResultJsonSchema = {
  name: 'test_analysis_result',
  schema: {
    type: 'object',
    properties: {
      hasIssues: {
        type: 'boolean',
        description: 'Whether any issues were found in the code analysis',
      },
      issues: {
        type: 'array',
        description: 'List of identified issues with the code',
        items: {
          type: 'string',
          description:
            'A specific issue with actionable feedback and line references where applicable',
        },
      },
    },
    required: ['hasIssues', 'issues'],
    additionalProperties: false,
  },
};
