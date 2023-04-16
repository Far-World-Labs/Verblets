export default (variable, { size=6 }={}) => {
  if (!variable) {
    return '';
  }

  let variableWrapped = `"${variable}"`;
  if (/\n/.test(variable)) {
    variableWrapped = `
${'='.repeat(size)}
${variable}
${'='.repeat(size)}
`;
  }
  return variableWrapped;
};
