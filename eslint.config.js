import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
import stylisticPlugin from '@stylistic/eslint-plugin';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.js', 'src/**/*.jsx'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        AbortController: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
      },
    },
    plugins: {
      prettier: prettierPlugin,
      '@stylistic': stylisticPlugin,
    },
    rules: {
      // Prettier integration - let Prettier handle formatting
      'prettier/prettier': 'error',

      // Core ESLint rules (Airbnb-style)
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-arrow-callback': 'error',
      'arrow-spacing': 'error',
      'no-duplicate-imports': 'error',
      'no-useless-constructor': 'error',
      'no-useless-rename': 'error',
      'object-shorthand': 'error',
      'prefer-destructuring': ['error', { object: true, array: false }],
      'prefer-template': 'error',
      'template-curly-spacing': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-sequences': 'error',
      'no-throw-literal': 'error',
      'no-unmodified-loop-condition': 'error',
      'no-unused-expressions': 'error',
      'no-useless-call': 'error',
      'no-useless-concat': 'error',
      'no-void': 'error',
      'prefer-promise-reject-errors': 'error',
      'require-await': 'error',
      'no-return-await': 'error',
      'no-async-promise-executor': 'error',
      'no-await-in-loop': 'warn',
      'no-promise-executor-return': 'error',

      // Array and Object best practices
      'array-callback-return': 'error',
      'no-array-constructor': 'error',
      'no-new-object': 'error',
      'no-prototype-builtins': 'error',
      'prefer-object-spread': 'error',

      // Function best practices
      'func-names': ['warn', 'as-needed'],
      'func-style': ['error', 'expression', { allowArrowFunctions: true }],
      'no-loop-func': 'error',
      'no-new-func': 'error',
      'prefer-rest-params': 'error',
      'prefer-spread': 'error',

      // Variable best practices - allow undefined for optional parameters
      'no-undef-init': 'error',
      'no-undefined': 'off', // Allow undefined for optional parameters
      'no-use-before-define': ['error', { functions: false, classes: true, variables: true }],

      // Disable stylistic rules that conflict with Prettier
      '@stylistic/indent': 'off',
      '@stylistic/quotes': 'off',
      '@stylistic/semi': 'off',
      '@stylistic/comma-dangle': 'off',
      '@stylistic/comma-spacing': 'off',
      '@stylistic/comma-style': 'off',
      '@stylistic/object-curly-spacing': 'off',
      '@stylistic/array-bracket-spacing': 'off',
      '@stylistic/computed-property-spacing': 'off',
      '@stylistic/key-spacing': 'off',
      '@stylistic/keyword-spacing': 'off',
      '@stylistic/space-before-blocks': 'off',
      '@stylistic/space-before-function-paren': 'off',
      '@stylistic/space-in-parens': 'off',
      '@stylistic/space-infix-ops': 'off',
      '@stylistic/space-unary-ops': 'off',
      '@stylistic/spaced-comment': 'off',
      '@stylistic/brace-style': 'off',
      '@stylistic/function-call-spacing': 'off',
      '@stylistic/no-trailing-spaces': 'off',
      '@stylistic/no-multiple-empty-lines': 'off',
      '@stylistic/padded-blocks': 'off',
      '@stylistic/eol-last': 'off',

      // Custom rules for specific syntax restrictions (Airbnb-style)
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ForInStatement',
          message: 'for..in loops iterate over the entire prototype chain, which is virtually never what you want. Use Object.{keys,values,entries}, and iterate over the resulting array.',
        },
        {
          selector: 'LabeledStatement',
          message: 'Labels are a form of GOTO; using them makes code confusing and hard to maintain and understand.',
        },
        {
          selector: 'WithStatement',
          message: '`with` is disallowed in strict mode because it makes code impossible to predict and optimize.',
        },
      ],

      // Import/Export best practices - disable sort-imports as it conflicts with Prettier
      'no-duplicate-imports': 'error',
      'sort-imports': 'off', // Disable as it conflicts with Prettier
    },
  },
  {
    files: ['**/*.examples.js'],
    rules: {
      // Example files can use console.error for demonstration purposes
      'no-console': ['warn', { allow: ['error'] }],
    },
  },
  {
    files: ['**/*.test.js', '**/*.spec.js'],
    languageOptions: {
      globals: {
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
    rules: {
      // Test-specific rule overrides
      'no-console': 'off',
      'no-undefined': 'off',
      'func-style': 'off',
      'prefer-arrow-callback': 'off',
      'no-unused-expressions': 'off', // Allow expect().toBe() patterns
      'require-await': 'off', // Allow async test functions without await
    },
  },
  prettierConfig,
]; 