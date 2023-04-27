export default (variable, { delimiterWidth = 6 } = {}) => {
  if (!variable) {
    return "";
  }

  let variableWrapped = `"${variable}"`;
  if (/\n/.test(variable)) {
    variableWrapped = `
${"=".repeat(delimiterWidth)}
${variable}
${"=".repeat(delimiterWidth)}
`;
  }
  return variableWrapped;
};
