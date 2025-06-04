import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
import vitestPlugin from 'eslint-plugin-vitest';
import importPlugin from 'eslint-plugin-import';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Node.js globals
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        // Web APIs available in Node.js
        URL: 'readonly',
        URLSearchParams: 'readonly',
        AbortController: 'readonly',
        AbortSignal: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
        // Vitest globals
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly',
      },
    },
    plugins: {
      prettier: prettierPlugin,
      vitest: vitestPlugin,
      import: importPlugin,
    },
    rules: {
      // Import rules
      'import/extensions': 'off',
      'import/prefer-default-export': 'off',
      'import/first': 'error',
      'import/no-duplicates': 'error',
      
      // General rules
      'no-console': 'off',
      'no-multi-str': 'off',
      'no-restricted-syntax': 'warn',
      'no-underscore-dangle': ['warn', { allow: ['__dirname'] }],
      'no-unused-vars': ['warn', { argsIgnorePattern: 'next' }],
      'object-shorthand': 'off',
      'prettier/prettier': ['error', { singleQuote: true }],
      quotes: ['error', 'single', { allowTemplateLiterals: true }],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ForInStatement',
          message:
            'for..in loops iterate over the entire prototype chain, which is virtually never what you want. Use Object.{keys,values,entries}, and iterate over the resulting array.',
        },
        {
          selector: 'LabeledStatement',
          message:
            'Labels are a form of GOTO; using them makes code confusing and hard to maintain and understand.',
        },
        {
          selector: 'WithStatement',
          message:
            '`with` is disallowed in strict mode because it makes code impossible to predict and optimize.',
        },
      ],
    },
  },
  prettier,
]; 