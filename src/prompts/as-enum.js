export default (enumVal) => {
  const keys = Object.keys(enumVal);
  const options = keys.map((k) => `"${k}"`).join(', ');
  return `Choose from one of the following options: ${options}. \n\nIf there is no good match, say "undefined"\n\nInclude no additional text.`;
};
