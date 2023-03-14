import { onlyJSON } from '../fragments/index.js';

const _asSchemaOrgType = (type) => type ? `Ensure the type is ${type}. ` : '';

export const asEnum = (enumVal) => {
  const keys = Object.keys(enumVal);
  const options = keys.map((k, i) => (i === (keys.length - 1)) ? `or ${k}` : `${k}`).join(', ');
  return `${options}. \n\nIf the option doesnt fit, say "undefined".`
}

export const asIntent = (intent) => `Intent: "${intent}"`;

export const asSchemaOrgMessage = (object, type) => {
  const typeMessage = _asSchemaOrgType(type);
  return `Give me "${object}" in schema.org JSON format with a full set of properties. ${typeMessage}. ${onlyJSON}`;
};

export const asSchemaOrgType = _asSchemaOrgType;
