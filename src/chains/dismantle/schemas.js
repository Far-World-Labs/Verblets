// JSON schemas for dismantle chain operations

export const subComponentsSchema = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'string',
        description: 'A physical or logical subcomponent name',
      },
      description: 'List of all subcomponents of the specified entity',
    },
  },
  required: ['items'],
  additionalProperties: false,
};

export const componentOptionsSchema = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'string',
        description: 'A specific variant or option for the component',
      },
      description: 'List of known variants for the component',
    },
  },
  required: ['items'],
  additionalProperties: false,
};
