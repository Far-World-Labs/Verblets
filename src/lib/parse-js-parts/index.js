import { parse } from 'acorn';
import * as walk from 'acorn-walk';
import path from 'node:path';

const stripRootDir = (filePath, root = process.cwd()) => {
  return path.resolve('./', filePath).replace(new RegExp(`^${root}`), '');
};

const convertImport = (filePath, importPath) => {
  return stripRootDir(path.resolve(path.dirname(filePath), importPath));
};

const scanFile = (file, code) => {
  const functionsMap = {};
  const functionsSeen = {};
  const variablesMap = {};
  const importsMap = {};
  const exportsMap = {};
  const stringsMap = {};

  const comments = [];

  let ast;
  try {
    ast = parse(code, {
      sourceType: 'module',
      ecmaVersion: 'latest',
      onComment: comments,
    });
  } catch {
    // Return empty results if parse fails (e.g., for files with unsupported syntax)
    return {
      functionsMap,
      functionsSeen,
      variablesMap,
      importsMap,
      exportsMap,
      stringsMap,
      comments: [],
    };
  }

  const commentsMap = comments.reduce((acc, comment) => {
    const commentNew = { ...comment };
    delete commentNew.value;
    return { ...acc, [commentNew.start]: commentNew };
  }, {});

  walk.simple(ast, {
    Literal(node) {
      // Capture string literals
      if (typeof node.value === 'string' && node.value.length > 0) {
        const key = `${node.start}:${node.end}`;
        stringsMap[key] = {
          type: 'string',
          value: node.value,
          start: node.start,
          end: node.end,
          length: node.value.length,
        };
      }
    },
    TemplateLiteral(node) {
      // Capture template literals
      let value = '';
      for (let i = 0; i < node.quasis.length; i++) {
        value += node.quasis[i].value.raw;
        if (i < node.expressions.length) {
          value += '${...}';
        }
      }
      const key = `${node.start}:${node.end}`;
      stringsMap[key] = {
        type: 'template',
        value,
        start: node.start,
        end: node.end,
        length: value.length,
        hasExpressions: node.expressions.length > 0,
      };
    },
    ImportDeclaration(importNode) {
      const declaration = importNode.specifiers
        .filter((s) => s.type === 'ImportDefaultSpecifier')
        .map((s) => {
          return s.local.name;
        })?.[0];
      const specifiers = importNode.specifiers
        .filter((s) => s.type === 'ImportSpecifier')
        .map((s) => {
          return { ...s.imported }.name; // also has local name
        });
      const source = importNode.source.value;
      const importKey = source.startsWith('.') ? convertImport(file, source) : source;
      importsMap[importKey] = {
        start: importNode.start,
        end: importNode.end,
        declaration,
        specifiers,
        source,
      };
    },

    ExportNamedDeclaration(expNode) {
      if (expNode.source) {
        // Handle re-exports
        const source = expNode.source.value;
        const importKey = source.startsWith('.') ? convertImport(file, source) : source;

        // Named exports
        if (expNode.specifiers) {
          expNode.specifiers.forEach((specifier) => {
            if (specifier.type === 'ExportSpecifier') {
              exportsMap[specifier.exported.name ?? specifier.local.name] = {
                start: expNode.start,
                end: expNode.end,
                type: 'NamedExport',
                local: specifier.exported.name ?? specifier.local.name,
                source: importKey,
              };
              importsMap[importKey] = {
                start: expNode.start,
                end: expNode.end,
                declaration: specifier.exported.name ?? specifier.local.name,
                specifiers: [],
                source,
              };
            } else if (specifier.type === 'ExportNamespaceSpecifier') {
              exportsMap[specifier.exported.name ?? specifier.local.name] = {
                start: expNode.start,
                end: expNode.end,
                type: 'NamespaceExport',
                source: importKey,
              };
              importsMap[importKey] = {
                start: expNode.start,
                end: expNode.end,
                declaration: null,
                specifiers: [],
                source,
              };
            }
          });
        }
      } else if (expNode.declaration.type === 'VariableDeclaration') {
        // Handle local exports
        expNode.declaration.declarations.forEach((decNode) => {
          exportsMap[decNode.id.name] = {
            start: expNode.start,
            end: expNode.end,
            type: 'LocalExport',
            local: decNode.id.name,
          };

          if (decNode.init.type === 'ArrowFunctionExpression') {
            functionsMap[`ArrowFunctionExpression:${decNode.id.name}`] = {
              start: decNode.init.start,
              end: decNode.init.end,
              name: decNode.id.name,
              functionName: `<arrow:${decNode.id.name}>`,
              async: decNode.init.async,
              generator: decNode.init.generator,
              type: 'ArrowFunctionExpression',
              exported: true,
            };
          }
        });
      }
    },

    ExportAllDeclaration(expNode) {
      if (expNode.source) {
        const source = expNode.source.value;
        const importKey = source.startsWith('.') ? convertImport(file, source) : source;
        exportsMap[expNode.exported.name] = {
          start: expNode.start,
          end: expNode.end,
          type: 'AllExport',
          local: expNode.exported.name,
          source: importKey,
        };
        importsMap[importKey] = {
          start: expNode.start,
          end: expNode.end,
          declaration: null,
          specifiers: [],
          source,
        };
      }
    },

    ExportDefaultDeclaration(expNode) {
      if (expNode.declaration.type === 'Identifier') {
        exportsMap.default = {
          type: 'LocalExport',
          local: expNode.declaration.name,
        };
      } else if (expNode.declaration.type === 'ArrowFunctionExpression') {
        exportsMap.default = {
          type: 'DefaultExport',
          start: expNode.start,
          end: expNode.end,
        };

        functionsMap['ArrowFunctionExpression:default'] = {
          start: expNode.declaration.start,
          end: expNode.declaration.end,
          functionName: '<default-export>',
          async: expNode.declaration.async,
          generator: expNode.declaration.generator,
          type: 'ArrowFunctionExpression',
        };
      }
    },

    FunctionDeclaration(fnNode) {
      functionsMap[`${fnNode.type}:${fnNode.id.name}`] = {
        start: fnNode.start,
        end: fnNode.end,
        functionName: `<declaration:${fnNode.id.name}>`,
        name: fnNode.id.name,
        type: fnNode.type,
        async: fnNode.async,
        generator: fnNode.generator,
        exported: false,
      };
    },

    VariableDeclaration(varNode) {
      const arrowDeclarations = varNode.declarations.filter((d) => {
        return (
          d.id.type === 'Identifier' &&
          d.init?.type === 'ArrowFunctionExpression' &&
          d.init?.body.type === 'BlockStatement'
        );
      });

      arrowDeclarations.forEach((arrowFnNode) => {
        functionsSeen[`${arrowFnNode.init.start}:${arrowFnNode.init.end}`] = true;

        functionsMap[`ArrowFunctionExpression:${arrowFnNode.id.name}`] = {
          start: arrowFnNode.start,
          end: arrowFnNode.end,
          name: arrowFnNode.id.name,
          functionName: `<arrow:${arrowFnNode.id.name}>`,
          async: arrowFnNode.init.async,
          generator: arrowFnNode.init.generator,
          type: 'ArrowFunctionExpression',
          exported: false,
        };
      });

      const fnExpDeclarations = varNode.declarations.filter((d) => {
        return (
          d.id.type === 'Identifier' &&
          d.init?.type === 'FunctionExpression' &&
          d.init?.body.type === 'BlockStatement'
        );
      });

      fnExpDeclarations.forEach((fnExpNode) => {
        functionsSeen[`${fnExpNode.init.start}:${fnExpNode.init.end}`] = true;

        functionsMap[`FunctionExpression:${fnExpNode.id.name}`] = {
          start: fnExpNode.start,
          end: fnExpNode.end,
          name: fnExpNode.id.name,
          functionName: `<exp:${fnExpNode.id.name}>`,
          async: fnExpNode.init.async,
          generator: fnExpNode.init.generator,
          type: 'FunctionExpression',
          exported: false,
        };
      });
    },

    // Property Assignment
    AssignmentExpression(node) {
      if (
        (node.right.type === 'FunctionExpression' ||
          node.right.type === 'ArrowFunctionExpression') &&
        node.value
      ) {
        functionsSeen[`${node.right.start}:${node.right.end}`] = true;

        functionsMap[`${node.value.type}:${node.left.property.name}`] = {
          start: node.start,
          end: node.end,
          name: node.left.property.name,
          functionName: `${node.value.type}:${node.left.property.name}`,
          async: node.right.async,
          generator: node.right.generator,
          type: node.right.type,
          exported: false,
        };
      }
    },

    // Object Definition
    Property(node) {
      if (
        node.value.type === 'FunctionExpression' ||
        node.value.type === 'ArrowFunctionExpression'
      ) {
        functionsSeen[`${node.value.start}:${node.value.end}`] = true;

        functionsMap[`Property:${node.key.name}`] = {
          start: node.start,
          end: node.end,
          name: node.key.name,
          functionName: `<property:${node.key.name}>`,
          async: node.value.async,
          generator: node.value.generator,
          type: node.value.type,
          exported: false,
        };
      }
    },

    // Class Definition
    ClassDeclaration(node) {
      const className = node.id.name;
      node.body.body.forEach((classElement) => {
        if (classElement.type === 'MethodDefinition') {
          functionsSeen[`${classElement.value.start}:${classElement.value.end}`] = true;

          functionsMap[`MethodDefinition:${className}.${classElement.key.name}`] = {
            start: node.start,
            end: node.end,
            className,
            functionName: `${className}.${classElement.key.name}`,
            name: classElement.key.name,
            async: classElement.value.async,
            generator: classElement.value.generator,
            type: 'MethodDefinition',
            exported: false,
          };
        }
      });
    },
  });

  walk.simple(ast, {
    FunctionExpression(node) {
      if (!functionsSeen[`${node.start}:${node.end}`]) {
        functionsMap[`${node.type}:${node.start}`] = {
          start: node.start,
          functionName: '<exp>',
          end: node.end,
          type: node.type,
          async: node.async,
          generator: node.generator,
        };
      }
    },
  });

  return {
    name: stripRootDir(file),
    functionsMap,
    variablesMap,
    importsMap,
    exportsMap,
    commentsMap,
    stringsMap,
  };
};

export default scanFile;
