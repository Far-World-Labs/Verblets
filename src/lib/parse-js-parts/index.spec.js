import { describe, expect, it } from 'vitest';
import parseJSParts from './index.js';
import { runtime } from '../../lib/env/index.js';

const examples = [
  {
    name: 'Single function declaration',
    inputs: {
      file: 'testFile.js',
      code: `
        import testModule from './testModule.js';

        export function testFunc() {
          return 'abc';
        }
      `,
    },
    want: {
      name: 'testFile.js',
      functionsMap: [
        {
          name: 'testFunc',
          type: 'FunctionDeclaration',
        },
      ],
      importsMap: [
        {
          declaration: 'testModule',
          source: '/testModule.js',
        },
      ],
    },
  },
  {
    name: 'Arrow function declaration',
    inputs: {
      file: 'arrowFuncFile.js',
      code: `
      import arrowModule from './arrowModule.js';

      export const arrowFunc = () => {
        return 'xyz';
      };
    `,
    },
    want: {
      name: 'arrowFuncFile.js',
      functionsMap: [
        {
          name: 'arrowFunc',
          type: 'ArrowFunctionExpression',
        },
      ],
      importsMap: [
        {
          declaration: 'arrowModule',
          source: '/arrowModule.js',
        },
      ],
    },
  },
  {
    name: 'Class method declaration',
    inputs: {
      file: 'classMethodFile.js',
      code: `
      export class MyClass {
        myMethod() {
          return 'Hello World';
        }
      }
    `,
    },
    want: {
      name: 'classMethodFile.js',
      functionsMap: [
        {
          className: 'MyClass',
          name: 'myMethod',
          type: 'MethodDefinition',
        },
      ],
      importsMap: [],
    },
  },
  {
    name: 'Multiple function declarations',
    inputs: {
      file: 'multipleFunctionsFile.js',
      code: `
      import additionalModule from './additionalModule.js';

      export function firstFunc() {
        return 'First';
      }

      export const secondFunc = () => {
        return 'Second';
      };

      export class ThirdClass {
        thirdFunc() {
          return 'Third';
        }
      }
    `,
    },
    want: {
      name: 'multipleFunctionsFile.js',
      functionsMap: [
        {
          name: 'firstFunc',
          type: 'FunctionDeclaration',
        },
        {
          name: 'secondFunc',
          type: 'ArrowFunctionExpression',
        },
        {
          className: 'ThirdClass',
          name: 'thirdFunc',
          type: 'MethodDefinition',
        },
      ],
      importsMap: [
        {
          declaration: 'additionalModule',
          source: '/additionalModule.js',
        },
      ],
    },
  },
];

describe('Parse JS parts', () => {
  examples.forEach((example) => {
    it(example.name, () => {
      const result = parseJSParts(example.inputs.file, example.inputs.code);

      if (example.want.functionsMap) {
        example.want.functionsMap.forEach((fn) => {
          const found =
            result.functionsMap[`${fn.type}:${fn.name}`]?.name ||
            result.functionsMap[`${fn.type}:${fn.className}.${fn.name}`]?.name;

          // In browser, parse-js-parts returns empty maps
          if (runtime === 'browser') {
            expect(found).toBeUndefined();
          } else {
            expect(fn.name).equals(found);
          }
        });
      }
      if (example.want.importsMap) {
        example.want.importsMap.forEach((importDef) => {
          // In browser, parse-js-parts returns empty maps
          if (runtime === 'browser') {
            expect(result.importsMap[`${importDef.source}`]?.declaration).toBeUndefined();
          } else {
            expect(result.importsMap[`${importDef.source}`]?.declaration).equals(
              importDef.declaration
            );
          }
        });
      }
    });
  });
});
