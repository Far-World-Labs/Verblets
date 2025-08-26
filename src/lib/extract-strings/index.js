/**
 * Extract strings from JavaScript/TypeScript source code using AST parsing
 */

import { parse } from 'acorn';
import * as walk from 'acorn-walk';

/**
 * Extract all string literals and template literals from source code
 * @param {string} sourceCode - The source code to parse
 * @param {Object} options - Options for extraction
 * @param {boolean} options.withNearestFunction - Include parent function context
 * @returns {Array} Array of string objects with text, type, location, and function context
 */
export function extractStrings(sourceCode, options = {}) {
  const { withNearestFunction = false } = options;
  const strings = [];

  try {
    const ast = parse(sourceCode, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      locations: true,
    });

    if (withNearestFunction) {
      // Walk with state to track function context
      walk.ancestor(ast, {
        Literal(node, ancestors) {
          if (typeof node.value === 'string' && node.value.length > 0) {
            const parentFunction = findNearestFunction(ancestors);
            strings.push({
              text: node.value,
              type: 'literal',
              start: {
                line: node.loc.start.line,
                column: node.loc.start.column,
              },
              end: {
                line: node.loc.end.line,
                column: node.loc.end.column,
              },
              parentFunction: parentFunction
                ? {
                    name: getFunctionName(parentFunction),
                    start: {
                      line: parentFunction.loc.start.line,
                      column: parentFunction.loc.start.column,
                    },
                    end: {
                      line: parentFunction.loc.end.line,
                      column: parentFunction.loc.end.column,
                    },
                    lineCount: parentFunction.loc.end.line - parentFunction.loc.start.line + 1,
                    type: parentFunction.type,
                  }
                : null,
              isTopLevel: !parentFunction,
            });
          }
        },
        TemplateLiteral(node, ancestors) {
          const text = reconstructTemplate(node);
          if (text.length > 0) {
            const parentFunction = findNearestFunction(ancestors);
            strings.push({
              text,
              type: 'template',
              start: {
                line: node.loc.start.line,
                column: node.loc.start.column,
              },
              end: {
                line: node.loc.end.line,
                column: node.loc.end.column,
              },
              parentFunction: parentFunction
                ? {
                    name: getFunctionName(parentFunction),
                    start: {
                      line: parentFunction.loc.start.line,
                      column: parentFunction.loc.start.column,
                    },
                    end: {
                      line: parentFunction.loc.end.line,
                      column: parentFunction.loc.end.column,
                    },
                    lineCount: parentFunction.loc.end.line - parentFunction.loc.start.line + 1,
                    type: parentFunction.type,
                  }
                : null,
              isTopLevel: !parentFunction,
            });
          }
        },
      });
    } else {
      // Simple walk without function tracking
      walk.simple(ast, {
        Literal(node) {
          if (typeof node.value === 'string' && node.value.length > 0) {
            strings.push({
              text: node.value,
              type: 'literal',
              start: {
                line: node.loc.start.line,
                column: node.loc.start.column,
              },
              end: {
                line: node.loc.end.line,
                column: node.loc.end.column,
              },
            });
          }
        },
        TemplateLiteral(node) {
          const text = reconstructTemplate(node);
          if (text.length > 0) {
            strings.push({
              text,
              type: 'template',
              start: {
                line: node.loc.start.line,
                column: node.loc.start.column,
              },
              end: {
                line: node.loc.end.line,
                column: node.loc.end.column,
              },
            });
          }
        },
      });
    }
  } catch (error) {
    console.error('Failed to parse source code:', error.message);
  }

  return strings;
}

/**
 * Reconstruct template literal text
 * @private
 */
function reconstructTemplate(node) {
  const parts = [];
  for (let i = 0; i < node.quasis.length; i++) {
    parts.push(node.quasis[i].value.raw);
    if (i < node.expressions.length) {
      parts.push('${...}');
    }
  }
  return parts.join('');
}

/**
 * Find nearest function in ancestor chain
 * @private
 */
function findNearestFunction(ancestors) {
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const node = ancestors[i];
    if (
      node.type === 'FunctionDeclaration' ||
      node.type === 'FunctionExpression' ||
      node.type === 'ArrowFunctionExpression' ||
      node.type === 'MethodDefinition'
    ) {
      return node;
    }
  }
  return null;
}

/**
 * Get function name, handling various node types
 * @private
 */
function getFunctionName(node) {
  // FunctionDeclaration or named FunctionExpression
  if (node.id?.name) {
    return node.id.name;
  }

  // MethodDefinition
  if (node.type === 'MethodDefinition' && node.key) {
    if (node.key.type === 'Identifier') {
      return node.key.name;
    }
    if (node.key.type === 'Literal') {
      return String(node.key.value);
    }
  }

  // Check if it's assigned to a variable
  if (node.parent && node.parent.type === 'VariableDeclarator') {
    return node.parent.id?.name || '(anonymous)';
  }

  return '(anonymous)';
}
