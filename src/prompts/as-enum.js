export default (enumVal) => {
  const keys = Object.keys(enumVal);
  const options = keys.map((k) => `"${k}"`).join(', ');
  return `Choose from one of the following options: ${options}.`;
};
