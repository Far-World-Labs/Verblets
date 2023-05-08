const makeFeatureDefinition = ({ name, criteria, score0, score1 }) => {
  const descriptionPrompt = `criteria: "${criteria}", scoring: "${score0} ${score1}"`;

  return {
    [name]: {
      type: 'number',
      minimum: 0,
      maximum: 1,
      description: descriptionPrompt,
    },
  };
};

export default (features) => {
  if (!features?.length) {
    throw new Error('Features json schema [error]: Features list not defined');
  }

  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: features.reduce((acc, feature) => {
      return { ...acc, ...makeFeatureDefinition(feature) };
    }, {}),
    required: features.map((f) => f.name),
  };
};
