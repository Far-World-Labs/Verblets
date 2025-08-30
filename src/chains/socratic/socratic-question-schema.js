import { constants as promptConstants } from '../../prompts/index.js';

const { explainAndSeparate, explainAndSeparatePrimitive } = promptConstants;

export default {
  type: 'object',
  properties: {
    value: {
      type: 'string',
      description: `A Socratic question that challenges assumptions or probes deeper understanding.

${explainAndSeparate} ${explainAndSeparatePrimitive}

The value should be the question only, without the explanation.`,
      minLength: 10,
      maxLength: 500,
    },
  },
  required: ['value'],
  additionalProperties: false,
};
