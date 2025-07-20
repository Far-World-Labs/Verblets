// JSON schemas for date chain operations

export const dateExpectationsSchema = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'string',
        description: 'A yes/no check that would confirm the date answer is correct',
      },
      description: 'List of validation checks for the date answer',
      minItems: 1,
      maxItems: 3,
    },
  },
  required: ['items'],
  additionalProperties: false,
};

export const dateValueSchema = {
  type: 'object',
  properties: {
    value: {
      type: 'string',
      description:
        'The date in ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ), or "undefined" if no date found',
    },
  },
  required: ['value'],
  additionalProperties: false,
};
