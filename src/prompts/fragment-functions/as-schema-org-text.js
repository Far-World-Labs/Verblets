import { onlyJSON } from "../fragment-texts/index.js";
import asSchemaOrgType from "./as-schema-org-type.js";

export default (object, type) => {
  const typeText = asSchemaOrgType(type);
  return `Give me "${object}" in schema.org JSON format with a full set of properties. ${typeText}.
- ensure values meant to be numbers are numbers
- ensure the type is a real schema.org type
- ensure the returned object has @context, name
${onlyJSON}`;
};
