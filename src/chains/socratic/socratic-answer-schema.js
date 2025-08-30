import { constants as promptConstants } from '../../prompts/index.js';

const { explainAndSeparate, explainAndSeparatePrimitive } = promptConstants;

export default {
  type: 'object',
  properties: {
    value: {
      type: 'string',
      description: `A thoughtful response to the Socratic question.

${explainAndSeparate} ${explainAndSeparatePrimitive}

The value should be the answer only, without the explanation.`,
      minLength: 10,
      maxLength: 1000,
    },
  },
  required: ['value'],
  additionalProperties: false,
};
