export default (variable, { tag = 'data', name } = {}) => {
  if (!variable) {
    return '';
  }

  let nameAttribute = '';
  if (name) {
    nameAttribute = `name="${name}"`;
  }

  let variableResolved = variable;
  if (typeof variable !== 'string') {
    variableResolved = JSON.stringify(variable, null, 2);
  }

  let variableWrapped = `"${variableResolved}"`;
  if (/\n/.test(variableResolved)) {
    variableWrapped = `<${tag}${nameAttribute}>${variableResolved}</${tag}>`;
  }
  return variableWrapped;
};
