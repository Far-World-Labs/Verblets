export function asXML(variable, { name, tag = 'data', title, fit = 'comfortable' } = {}) {
  if (!variable) {
    return '';
  }

  const nameAttribute = name ? ` name="${name}"` : '';
  const variableResolved =
    typeof variable === 'string' ? variable : JSON.stringify(variable, null, 2);
  const fitChar = fit === 'comfortable' ? '\n' : '';
  const wrapped = `<${tag}${nameAttribute}>${fitChar}${variableResolved}${fitChar}</${tag}>`;
  return title && variableResolved.length > 0 ? `${title} ${wrapped}` : wrapped;
}

export function quote(variable, { title } = {}) {
  if (!variable) {
    return '';
  }

  const variableResolved =
    typeof variable === 'string' ? variable : JSON.stringify(variable, null, 2);

  const wrapped = `"${variableResolved}"`;
  return title && variableResolved.length > 0 ? `${title} ${wrapped}` : wrapped;
}

export default function wrapVariable(
  variable,
  { forceHTML = false, name, tag = 'data', title, fit = 'comfortable' } = {}
) {
  const variableResolved =
    typeof variable === 'string' ? variable : JSON.stringify(variable, null, 2);
  const needsXML = /\n/.test(variableResolved) || forceHTML || name;
  if (needsXML) {
    return asXML(variableResolved, { name, tag, title, fit });
  }
  return quote(variableResolved, { title });
}
