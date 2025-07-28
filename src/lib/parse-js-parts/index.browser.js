// Browser stub for parse-js-parts
// AST parsing is not supported in browser environment

const scanFile = (file) => {
  console.warn('parse-js-parts: AST parsing not available in browser');
  return {
    name: file,
    functionsMap: {},
    variablesMap: {},
    importsMap: {},
    exportsMap: {},
    commentsMap: {},
  };
};

export default scanFile;
