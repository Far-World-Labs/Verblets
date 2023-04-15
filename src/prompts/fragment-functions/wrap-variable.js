export default (variable) => {
  if (!variable) {
    return '';
  }

  let variableWrapped = `"${variable}"`;
  if (/\n/.test(variable)) {
    variableWrapped = `the following:
======
${variable}
======
`;
  }
  return variableWrapped;
};
