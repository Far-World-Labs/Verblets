import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        URL: 'readonly',
        AbortController: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        // Vitest
        beforeEach: 'readonly',
        afterEach: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        vi: 'readonly',
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: false,
    },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
      
      // TODO: Remove console statements and replace with proper logging
      'no-console': 'off',
      
      // TODO: Refactor await-in-loop patterns to use Promise.all()
      'no-await-in-loop': 'off',

      // Customize recommended rules
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

      // Additional quality rules not in recommended
      'require-await': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-template': 'error',
      'object-shorthand': 'error',
      'array-callback-return': 'error',

      // Syntax restrictions
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ForInStatement',
          message: 'Use Object.{keys,values,entries} instead of for..in',
        },
        {
          selector: 'WithStatement',
          message: '`with` is not allowed',
        },
      ],
    },
  },
  {
    files: ['**/*.spec.js', '**/*.test.js'],
    rules: {
      'require-await': 'off', // Test functions often don't need await
    },
  },
  prettierConfig,
]; 