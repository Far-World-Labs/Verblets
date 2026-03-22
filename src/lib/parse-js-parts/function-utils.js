import { parse } from 'acorn';
import * as walk from 'acorn-walk';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Extract function text and metadata from source code
 */
export function extractFunction(code, start, end) {
  const text = code.slice(start, end);
  const lines = text.split('\n');
  return {
    text,
    lineCount: lines.length,
    lines,
  };
}

/**
 * List all functions in a file that are more than N lines long
 */
export function listFunctions(code, minLines = 2) {
  const functions = [];
  const comments = [];

  let ast;
  try {
    ast = parse(code, {
      sourceType: 'module',
      ecmaVersion: 'latest',
      locations: true,
      onComment: comments,
    });
  } catch {
    return functions;
  }

  const addFunction = (node, name, type) => {
    const extracted = extractFunction(code, node.start, node.end);
    if (extracted.lineCount > minLines) {
      functions.push({
        name: name || '<anonymous>',
        type,
        start: node.start,
        end: node.end,
        lineCount: extracted.lineCount,
        text: extracted.text,
        location: node.loc,
      });
    }
  };

  // Track variable assignments for arrow functions
  const variableAssignments = new Map();

  // First pass: collect variable assignments
  walk.simple(ast, {
    VariableDeclarator(node) {
      if (
        node.init &&
        (node.init.type === 'ArrowFunctionExpression' || node.init.type === 'FunctionExpression')
      ) {
        variableAssignments.set(node.init, node.id?.name);
      }
    },
    AssignmentExpression(node) {
      if (
        node.right &&
        (node.right.type === 'ArrowFunctionExpression' || node.right.type === 'FunctionExpression')
      ) {
        if (node.left.type === 'Identifier') {
          variableAssignments.set(node.right, node.left.name);
        } else if (node.left.type === 'MemberExpression' && node.left.property?.name) {
          variableAssignments.set(node.right, node.left.property.name);
        }
      }
    },
    Property(node) {
      if (
        node.value &&
        (node.value.type === 'ArrowFunctionExpression' || node.value.type === 'FunctionExpression')
      ) {
        variableAssignments.set(node.value, node.key?.name || node.key?.value);
      }
    },
  });

  // Second pass: collect functions with their names
  walk.simple(ast, {
    FunctionDeclaration(node) {
      addFunction(node, node.id?.name, 'FunctionDeclaration');
    },
    FunctionExpression(node) {
      const assignedName = variableAssignments.get(node);
      addFunction(node, node.id?.name || assignedName, 'FunctionExpression');
    },
    ArrowFunctionExpression(node) {
      // Look up the assigned name from our map
      const assignedName = variableAssignments.get(node);
      addFunction(node, assignedName, 'ArrowFunctionExpression');
    },
    MethodDefinition(node) {
      addFunction(node.value, node.key.name, 'MethodDefinition');
    },
  });

  // Sort by line count (longest first)
  functions.sort((a, b) => b.lineCount - a.lineCount);

  return functions;
}

/**
 * Quick regex check if a function might be called in code
 */
function mightCallFunction(code, functionName) {
  // Escape special regex characters in function name
  const escaped = functionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Quick checks for common call patterns
  const patterns = [
    `\\b${escaped}\\s*\\(`, // Direct call: functionName(
    `\\.${escaped}\\s*\\(`, // Method call: .functionName(
    `\\[['"\`]${escaped}['"\`]\\]\\s*\\(`, // Bracket notation: ['functionName'](
  ];

  const regex = new RegExp(patterns.join('|'));
  return regex.test(code);
}

/**
 * Find all function calls within a given function
 */
export function findCallees(code, functionStart, functionEnd) {
  const callees = new Set();
  const functionText = code.slice(functionStart, functionEnd);

  let ast;
  try {
    // Parse just the function body
    ast = parse(functionText, {
      sourceType: 'module',
      ecmaVersion: 'latest',
      allowReturnOutsideFunction: true,
    });
  } catch {
    return Array.from(callees);
  }

  walk.simple(ast, {
    CallExpression(node) {
      if (node.callee.type === 'Identifier') {
        callees.add(node.callee.name);
      } else if (node.callee.type === 'MemberExpression' && node.callee.property?.name) {
        // Handle method calls like obj.method()
        if (node.callee.object.type === 'Identifier') {
          callees.add(`${node.callee.object.name}.${node.callee.property.name}`);
        } else if (node.callee.object.type === 'ThisExpression') {
          callees.add(`this.${node.callee.property.name}`);
        }
      }
    },
  });

  return Array.from(callees);
}

/**
 * Find all callers of a function in a file
 */
export function findCallers(code, functionName) {
  // Quick regex pre-check
  if (!mightCallFunction(code, functionName)) {
    return [];
  }

  const callers = [];
  const comments = [];

  let ast;
  try {
    ast = parse(code, {
      sourceType: 'module',
      ecmaVersion: 'latest',
      locations: true,
      onComment: comments,
    });
  } catch {
    return callers;
  }

  // Track which function we're currently inside
  const functionStack = [];

  walk.ancestor(ast, {
    FunctionDeclaration(node, _ancestors) {
      functionStack.push({
        name: node.id?.name || '<anonymous>',
        node,
      });
    },
    FunctionExpression(node, _ancestors) {
      functionStack.push({
        name: node.id?.name || '<anonymous>',
        node,
      });
    },
    ArrowFunctionExpression(node, ancestors) {
      // Try to find the variable name for arrow functions
      const parent = ancestors[ancestors.length - 2];
      let name = '<arrow>';
      if (parent?.type === 'VariableDeclarator' && parent.id?.name) {
        name = parent.id.name;
      }
      functionStack.push({ name, node });
    },
    MethodDefinition(node, _ancestors) {
      functionStack.push({
        name: node.key.name,
        node: node.value,
      });
    },
    CallExpression(node, ancestors) {
      // Find which function this call is inside
      let containingFunction = null;
      for (let i = ancestors.length - 1; i >= 0; i--) {
        const ancestor = ancestors[i];
        if (
          ancestor.type === 'FunctionDeclaration' ||
          ancestor.type === 'FunctionExpression' ||
          ancestor.type === 'ArrowFunctionExpression'
        ) {
          // Find the corresponding entry in our stack
          const found = functionStack.find((f) => f.node === ancestor);
          if (found) {
            containingFunction = found;
            break;
          }
        } else if (ancestor.type === 'MethodDefinition') {
          const found = functionStack.find((f) => f.node === ancestor.value);
          if (found) {
            containingFunction = found;
            break;
          }
        }
      }

      // Check if this call matches our target function
      let isMatch = false;
      if (node.callee.type === 'Identifier' && node.callee.name === functionName) {
        isMatch = true;
      } else if (
        node.callee.type === 'MemberExpression' &&
        node.callee.property?.name === functionName
      ) {
        isMatch = true;
      }

      if (isMatch && containingFunction) {
        callers.push({
          functionName: containingFunction.name,
          location: node.loc,
          start: node.start,
          end: node.end,
        });
      }
    },
  });

  return callers;
}

/**
 * Trace all downstream callees from a function, handling cycles
 */
export async function traceCallees(filePath, functionName, maxDepth = 10) {
  const visited = new Set();
  const tree = {
    name: functionName,
    file: filePath,
    callees: [],
  };

  async function explore(currentFile, funcName, depth, parent) {
    const key = `${currentFile}:${funcName}`;
    if (visited.has(key) || depth >= maxDepth) {
      return;
    }
    visited.add(key);

    try {
      const code = await fs.readFile(currentFile, 'utf-8');
      const functions = listFunctions(code, 0);

      // Find the target function
      const targetFunc = functions.find((f) => f.name === funcName);
      if (!targetFunc) return;

      // Get callees
      const callees = findCallees(code, targetFunc.start, targetFunc.end);

      for (const callee of callees) {
        const calleeNode = {
          name: callee,
          file: currentFile,
          callees: [],
        };
        parent.callees.push(calleeNode);

        // Recursively explore if it's a local function
        if (!callee.includes('.') && !callee.startsWith('this.')) {
          await explore(currentFile, callee, depth + 1, calleeNode);
        }
      }
    } catch {
      // File read error, stop exploring this branch
    }
  }

  await explore(filePath, functionName, 0, tree);
  return tree;
}

/**
 * Find all callers across the codebase
 */
export async function traceCaller(rootDir, targetFile, functionName, maxCallers = 3) {
  const callers = [];
  const glob = (await import('glob')).glob;

  // Find all JS files in the codebase
  const files = await glob('**/*.js', {
    cwd: rootDir,
    ignore: ['node_modules/**', 'dist/**', 'coverage/**'],
    absolute: true,
  });

  for (const file of files) {
    if (callers.length >= maxCallers) break;

    try {
      const code = await fs.readFile(file, 'utf-8');

      // Quick regex check before parsing
      if (!mightCallFunction(code, functionName)) {
        continue;
      }

      const fileCaller = findCallers(code, functionName);

      for (const caller of fileCaller) {
        if (callers.length >= maxCallers) break;
        callers.push({
          ...caller,
          file: path.relative(rootDir, file),
        });
      }
    } catch {
      // Skip files that can't be read
    }
  }

  return callers;
}
