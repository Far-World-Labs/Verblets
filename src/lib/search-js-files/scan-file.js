/* eslint-disable no-await-in-loop */

import path from 'path';
import fs from 'fs';
import { parse } from 'acorn';
import * as walk from 'acorn-walk';
import dependencyTree from 'dependency-tree';

const stripRootDir = (pathStr, root = process.cwd()) => {
  return pathStr.replace(new RegExp(`^${root}`), '');
};

const convertImport = (filePath, importPath) => {
  return stripRootDir(path.resolve(path.dirname(filePath), importPath));
};

const flatten = (obj) => {
  let result = Object.keys(obj).reduce(
    (memo, key) => ({
      ...memo,
      [key]: 1,
    }),
    {}
  );

  result = Object.keys(obj).reduce((acc, key) => {
    if (typeof obj[key] === 'object') {
      const flattenedValue = flatten(obj[key]);
      return Object.entries(flattenedValue).reduce(
        (innerAcc, [innerKey, innerVal]) => {
          return {
            ...innerAcc,
            [innerKey]: (innerAcc[innerKey] ?? 0) + innerVal,
          };
        },
        acc
      );
    }
    return acc;
  }, result);

  return result;
};

const listFiles = (file, cwd) => {
  const config = {
    filename: file,
    directory: cwd,
    nodeModulesConfig: { entry: 'module' },
    nonExistent: [],
    filter: (p) => p.indexOf('node_modules') === -1,
  };

  return dependencyTree(config);
};

const parseFiles = (files) => {
  const filesMap = {};
  for (const file of files) {
    const functionsMap = {};
    const functionsSeen = {};
    const variablesMap = {};
    const importsMap = {};

    const code = fs.readFileSync(file, 'utf-8');

    const comments = [];

    const ast = parse(code, {
      sourceType: 'module',
      ecmaVersion: 'latest',
      onComment: comments,
    });

    const commentsMap = comments.reduce((acc, comment) => {
      return { ...acc, [comment.start]: comment };
    }, {});

    filesMap[stripRootDir(file)] = {
      functionsMap,
      variablesMap,
      importsMap,
      commentsMap,
    };

    walk.simple(ast, {
      ImportDeclaration(node) {
        const declaration = node.specifiers
          .filter((s) => s.type === 'ImportDefaultSpecifier')
          .map((s) => {
            return s.local.name;
          })?.[0];
        const specifiers = node.specifiers
          .filter((s) => s.type === 'ImportSpecifier')
          .map((s) => {
            return { ...s.imported }.name; // also has local name
          });
        const source = node.source.value;
        const importKey = source.startsWith('.')
          ? convertImport(file, source)
          : source;
        importsMap[importKey] = {
          start: node.start,
          end: node.end,
          declaration,
          specifiers,
          source,
        };
      },

      FunctionDeclaration(node) {
        functionsMap[`${node.type}:${node.id.name}`] = {
          start: node.start,
          end: node.end,
          name: node.id.name,
          type: node.type,
          async: node.async,
          generator: node.generator,
        };
      },

      VariableDeclaration(node) {
        const arrowDeclarations = node.declarations.filter((d) => {
          return (
            d.id.type === 'Identifier' &&
            d.init?.type === 'ArrowFunctionExpression' &&
            d.init?.body.type === 'BlockStatement'
          );
        });

        arrowDeclarations.forEach((d) => {
          functionsSeen[`${d.init.start}:${d.init.end}`] = true;

          functionsMap[`ArrowFunctionExpression:${d.id.name}`] = {
            start: d.start,
            end: d.end,
            name: d.id.name,
            async: d.init.async,
            generator: d.init.generator,
            type: 'ArrowFunctionExpression',
          };
        });

        const fnExpDeclarations = node.declarations.filter((d) => {
          return (
            d.id.type === 'Identifier' &&
            d.init?.type === 'FunctionExpression' &&
            d.init?.body.type === 'BlockStatement'
          );
        });

        fnExpDeclarations.forEach((d) => {
          functionsSeen[`${d.init.start}:${d.init.end}`] = true;

          functionsMap[`FunctionExpression:${d.id.name}`] = {
            start: d.start,
            end: d.end,
            name: d.id.name,
            async: d.init.async,
            generator: d.init.generator,
            type: 'FunctionExpression',
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
            async: node.right.async,
            generator: node.right.generator,
            type: node.right.type,
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
            async: node.value.async,
            generator: node.value.generator,
            type: node.value.type,
          };
        }
      },

      // Class Definition
      ClassDeclaration(node) {
        const className = node.id.name;
        node.body.body.forEach((classElement) => {
          if (classElement.type === 'MethodDefinition') {
            functionsSeen[
              `${classElement.value.start}:${classElement.value.end}`
            ] = true;

            functionsMap[
              `MethodDefinition:${className}.${classElement.key.name}`
            ] = {
              start: node.start,
              end: node.end,
              className: className,
              name: classElement.key.name,
              async: classElement.value.async,
              generator: classElement.value.generator,
              type: 'MethodDefinition',
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
            end: node.end,
            type: node.type,
            async: node.async,
            generator: node.generator,
          };
        }
      },
    });
  }

  return filesMap;
};

export default (entryFile) => {
  const filesTree = listFiles(entryFile, process.cwd());
  const filesList = Object.keys(flatten(filesTree));
  const results = parseFiles(filesList);
  return results;
};
