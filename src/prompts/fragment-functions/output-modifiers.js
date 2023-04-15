import { onlyJSON } from '../fragment-texts/index.js';

const _asSchemaOrgType = (type) => type ? `Ensure the type is ${type}. ` : '';

export const asEnum = (enumVal) => {
  const keys = Object.keys(enumVal);
  const options = keys.map((k) => `"${k}"`).join(', ');
  return `Choose from one of the following options: ${options}. \n\nIf there is no good match, say "undefined"\n\nInclude no additional text.`
}

export const asJSONSchema = (propertiesDescription) => {
  return `Give me a JSONSchema definition for the following properties: ${propertiesDescription}

Include per-property metadata as JSON comments.

${onlyJSON}`
}

const jsonSchemaDefault = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
    },
  },
};

export const asObjectWithSchema = (jsonSchema=jsonSchemaDefault) => {
  const propertiesJoined = Object.entries(jsonSchema.properties)
        .map(([k, v]) => {
          const annotations = Object.entries(v)
                .filter(([k, v]) => ['format', 'description'].includes(k) && !!v)
          const annotationsFormatted = annotations
                .map(([k, v]) => `${k}: ${v}`)
                .join(', ')
          const annotationsWrapped = annotations.length ? ` (${annotationsFormatted})` : '';
          return `"${k}": "<${v.type ?? ''}${annotationsWrapped}>"`
        })
        .join(', ');

  return `The returned object must look like the following, including all the same properties: \`{ ${propertiesJoined} }\`. Property values must parse with JSON.parse.
`;
};

export const asSchemaOrgText = (object, type) => {
  const typeText = _asSchemaOrgType(type);
  return `Give me "${object}" in schema.org JSON format with a full set of properties. ${typeText}.
- ensure values meant to be numbers are numbers
- ensure the type is a real schema.org type
- ensure the returned object has @context, name
${onlyJSON}`;
};

export const asSchemaOrgType = _asSchemaOrgType;
