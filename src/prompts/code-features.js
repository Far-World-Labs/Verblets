import {
  asJSON,
  explainAndSeparate,
  explainAndSeparateJSON,
} from './constants.js';

export default ({ text, schema }) => {
  return `Analyze the following code to provide scores for each of the features described below.

For each feature, assign a score between 0.0 and 1.0 based on the criteria outlined in the description. If the code does not exhibit the feature, provide a score of 0.0.

Ensure that all scores are assigned as numeric decimal values, even if the feature is not applicable or not present in the code.

Include only the properties defined in the schema, no comment, description, summary, evaluation or any similar properties.

<json-schema defines-output output-shape>
${JSON.stringify(schema, null, 2)}
</json-schema>

<code-to-analyze do-not-output>
${text}
</code-to-analyze>

${asJSON}

${explainAndSeparate} ${explainAndSeparateJSON}
`;
};
