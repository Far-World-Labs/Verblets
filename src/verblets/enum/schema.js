// JSON schema for enum verblet

export const createEnumSchema = (enumValues) => {
  const enumKeys = Object.keys(enumValues);

  return {
    type: 'object',
    properties: {
      value: {
        type: 'string',
        enum: [...enumKeys, 'undefined'],
        description: 'The selected enum value based on the input text, or "undefined" if no match',
      },
    },
    required: ['value'],
    additionalProperties: false,
  };
};
