import { onlyJSON } from "../fragment-texts/index.js";

const jsonSchemaDefault = {
  type: "object",
  properties: {
    name: {
      type: "string",
    },
  },
};

export default (jsonSchema = jsonSchemaDefault) => {
  const propertiesJoined = Object.entries(jsonSchema.properties)
    .map(([key, val]) => {
      const annotations = Object.entries(val).filter(
        ([annKey, annVal]) =>
          ["format", "description"].includes(annKey) && !!annVal
      );
      const annotationsFormatted = annotations
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      const annotationsWrapped = annotations.length
        ? ` (${annotationsFormatted})`
        : "";
      return `"${key}": "<${val.type ?? ""}${annotationsWrapped}>"`;
    })
    .join(", ");

  return `The returned object must look like the following, including all the same properties: \`{ ${propertiesJoined} }\`. ${onlyJSON}.
`;
};
