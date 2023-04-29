export default (
  variable,
  { forceHTML = false, name, tag = 'data', title, fit = 'comfortable' } = {}
) => {
  if (!variable) {
    return '';
  }

  let nameAttribute = '';
  if (name) {
    nameAttribute = `name="${name}"`;
  }

  let variableResolved = typeof variable !== 'undefined' ? variable : '';
  if (typeof variable !== 'string') {
    variableResolved = JSON.stringify(variable, null, 2);
  }

  const isHTML = /\n/.test(variableResolved) || forceHTML || name;
  let variableWrapped = !isHTML ? `"${variableResolved}"` : variableResolved;
  if (isHTML) {
    let fitChar = '\n';
    if (fit !== 'comfortable') {
      fitChar = '';
    }

    variableWrapped = `<${tag}${nameAttribute}>${fitChar}${variableResolved}${fitChar}</${tag}>`;
  }

  let titlePrefixed = variableWrapped;
  if (title && variableResolved.length > 0) {
    titlePrefixed = `${title} ${variableWrapped}`;
  }

  return titlePrefixed;
};
